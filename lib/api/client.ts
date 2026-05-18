/**
 * API Client
 *
 * Set USE_MOCK = true  → returns mock data (no backend needed)
 * Set USE_MOCK = false → calls real API at BASE_URL
 *
 * To switch to real API: change USE_MOCK to false and set NEXT_PUBLIC_API_URL env var.
 */
export const USE_MOCK = true;

export const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

// Typed error that carries the backend's error code and HTTP status.
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

type RequestOptions = {
  token?: string;
};

function buildHeaders(opts?: RequestOptions): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (opts?.token) {
    headers["Authorization"] = `Bearer ${opts.token}`;
  }
  return headers;
}

// Centralised response handler:
//  - Parses the backend's { code, message, status } error body on failure.
//  - Returns undefined for 204 No Content without attempting JSON parse.
async function parseResponse<T>(res: Response, method: string, path: string): Promise<T> {
  if (!res.ok) {
    let code = `HTTP_${res.status}`;
    let message = `${method} ${path} failed: ${res.status} ${res.statusText}`;
    try {
      const errBody = (await res.json()) as { code?: string; message?: string };
      if (errBody.code) code = errBody.code;
      if (errBody.message) message = errBody.message;
    } catch { /* ignore — use default message */ }
    throw new ApiError(code, message, res.status);
  }
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T;
  }
  try {
    const json = await res.json();
    return (json.data ?? json) as T;
  } catch {
    // e.g. empty body on a 200 OK edge case
    return undefined as T;
  }
}

export async function apiGet<T>(path: string, opts?: RequestOptions): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "GET",
    headers: buildHeaders(opts),
    credentials: "include",
  });
  return parseResponse<T>(res, "GET", path);
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  opts?: RequestOptions,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: buildHeaders(opts),
    body: JSON.stringify(body),
    credentials: "include",
  });
  return parseResponse<T>(res, "POST", path);
}

export async function apiPut<T>(
  path: string,
  body: unknown,
  opts?: RequestOptions,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PUT",
    headers: buildHeaders(opts),
    body: JSON.stringify(body),
    credentials: "include",
  });
  return parseResponse<T>(res, "PUT", path);
}

export async function apiDelete<T>(path: string, opts?: RequestOptions): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "DELETE",
    headers: buildHeaders(opts),
    credentials: "include",
  });
  return parseResponse<T>(res, "DELETE", path);
}
