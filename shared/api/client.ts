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

export async function apiGet<T>(path: string, opts?: RequestOptions): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "GET",
    headers: buildHeaders(opts),
  });
  if (!res.ok) {
    throw new Error(`GET ${path} failed: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  return (json.data ?? json) as T;
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
  });
  if (!res.ok) {
    throw new Error(`POST ${path} failed: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  return (json.data ?? json) as T;
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
  });
  if (!res.ok) {
    throw new Error(`PUT ${path} failed: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  return (json.data ?? json) as T;
}

export async function apiDelete<T>(path: string, opts?: RequestOptions): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "DELETE",
    headers: buildHeaders(opts),
  });
  if (!res.ok) {
    throw new Error(`DELETE ${path} failed: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  return (json.data ?? json) as T;
}
