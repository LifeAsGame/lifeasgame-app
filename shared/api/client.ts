import { AUTH_EXPIRED_EVENT, tokenStorage } from "./tokenStorage";
import type { ApiEnvelope, TokenPair } from "./types";

export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";
export const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = {
  auth?: boolean;
  rawResponse?: boolean;
  retry?: boolean;
  token?: string;
};

let refreshPromise: Promise<TokenPair> | null = null;

function authExpired(): void {
  tokenStorage.clear();
  if (typeof window !== "undefined") window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
}

async function parseResponse<T>(response: Response, method: string, path: string, rawResponse = false): Promise<T> {
  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return undefined as T;
  }

  let body: Partial<ApiEnvelope<T>> | T | null = null;
  try {
    body = (await response.json()) as Partial<ApiEnvelope<T>> | T;
  } catch {
    if (response.ok) return undefined as T;
  }

  const envelope = body && typeof body === "object"
    ? body as Partial<ApiEnvelope<T>>
    : null;

  if (!response.ok || envelope?.isSuccess === false) {
    throw new ApiError(
      response.status,
      envelope?.code ?? `HTTP_${response.status}`,
      envelope?.message ?? `${method} ${path} failed: ${response.status} ${response.statusText}`,
    );
  }

  if (rawResponse) return body as T;

  if (!envelope || envelope.isSuccess !== true || !("result" in envelope)) {
    throw new ApiError(response.status, "INVALID_RESPONSE", `${method} ${path} returned an invalid API envelope.`);
  }
  return envelope.result as T;
}

async function refreshSession(): Promise<TokenPair> {
  if (!refreshPromise) {
    const refreshToken = tokenStorage.read()?.refreshToken;
    if (!refreshToken) throw new ApiError(401, "AUTH_EXPIRED", "Authentication has expired.");

    refreshPromise = apiRequest<TokenPair>(
      "/api/v1/auth/refresh",
      "POST",
      { refreshToken },
      { auth: false, retry: false },
    )
      .then((session) => {
        tokenStorage.write(session);
        return session;
      })
      .catch((error) => {
        authExpired();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function apiRequest<T>(
  path: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const auth = options.auth !== false;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const accessToken = options.token ?? (auth ? tokenStorage.read()?.accessToken : undefined);
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "include",
  });

  if (response.status === 401 && auth && options.retry !== false && tokenStorage.read()?.refreshToken) {
    await refreshSession();
    return apiRequest<T>(path, method, body, { ...options, retry: false, token: undefined });
  }
  return parseResponse<T>(response, method, path, options.rawResponse);
}

export function apiGet<T>(path: string, options?: RequestOptions): Promise<T> {
  return apiRequest<T>(path, "GET", undefined, options);
}

export function apiGetRaw<T>(path: string, options?: RequestOptions): Promise<T> {
  return apiRequest<T>(path, "GET", undefined, { ...options, rawResponse: true });
}

export function apiPost<T>(path: string, body: unknown, options?: RequestOptions): Promise<T> {
  return apiRequest<T>(path, "POST", body, options);
}

export function apiPut<T>(path: string, body: unknown, options?: RequestOptions): Promise<T> {
  return apiRequest<T>(path, "PUT", body, options);
}

export function apiPatch<T>(path: string, body: unknown, options?: RequestOptions): Promise<T> {
  return apiRequest<T>(path, "PATCH", body, options);
}

export function apiDelete<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
  return apiRequest<T>(path, "DELETE", body, options);
}
