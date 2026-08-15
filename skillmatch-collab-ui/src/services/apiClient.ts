/**
 * Central API client for the Flask + MySQL backend.
 *
 * Every service in this folder goes through `request()`. All calls are sent to
 * the Flask origin with `credentials: "include"` so the Flask session cookie is
 * always attached (and Set-Cookie is stored on login).
 */
export const API_BASE_URL =
  (import.meta.env["VITE_API_BASE_URL"] as string | undefined) ?? "http://localhost:5000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const STATUS_MESSAGES: Record<number, string> = {
  400: "Please check the information you entered and try again.",
  401: "Your session has expired. Please log in again.",
  403: "You don't have permission to do that.",
  404: "We couldn't find what you were looking for.",
  409: "That already exists — please use a different value.",
  500: "The server ran into a problem. Please try again shortly.",
};

const AUTH_FREE_PATHS = ["/", "/login", "/register"];

function handleUnauthorized(path: string) {
  if (typeof window === "undefined") return;
  if (path.startsWith("/api/auth/login") || path.startsWith("/api/auth/register")) return;
  const current = window.location.pathname;
  if (AUTH_FREE_PATHS.includes(current)) return;
  window.location.assign("/login");
}

export interface RequestOptions {
  /** Path appended to API_BASE_URL, e.g. "/api/projects" */
  path: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Query string params (undefined/empty values are dropped). */
  params?: Record<string, string | number | boolean | undefined | null>;
  /** Skip the automatic redirect-to-login on 401. */
  silent401?: boolean;
}

export async function request<T>({
  path,
  method = "GET",
  body,
  params,
  silent401,
}: RequestOptions): Promise<T> {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new ApiError(
      "Can't reach the server. Make sure the Flask API is running on " + API_BASE_URL,
      0,
    );
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    if (response.status === 401 && !silent401) handleUnauthorized(path);
    const fromBody =
      payload && typeof payload === "object"
        ? ((payload as Record<string, unknown>)["error"] ??
          (payload as Record<string, unknown>)["message"])
        : typeof payload === "string"
          ? payload
          : null;
    const message =
      (typeof fromBody === "string" && fromBody) ||
      STATUS_MESSAGES[response.status] ||
      `Request failed (${response.status}).`;
    throw new ApiError(message, response.status);
  }

  return payload as T;
}

/** Unwraps Flask responses that nest the payload, e.g. { data: [...] } */
export function unwrap<T>(payload: unknown, ...keys: string[]): T {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const record = payload as Record<string, unknown>;
    for (const key of [...keys, "data", "result"]) {
      if (record[key] !== undefined) return record[key] as T;
    }
  }
  return payload as T;
}
