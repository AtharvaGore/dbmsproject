/**
 * Central API client for AcademiaOS frontend.
 *
 * Owner: Atharva Gore (Member A)
 */

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("academiaos_token");
}

export function setToken(token: string): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("academiaos_token", token);
  }
}

export function clearToken(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("academiaos_token");
    window.localStorage.removeItem("academiaos_user");
  }
}

export function getStoredUser(): any | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem("academiaos_user");
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: any): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("academiaos_user", JSON.stringify(user));
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const token = getToken();

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `Request failed (${response.status})`;
    try {
      const errJson = await response.json();
      if (errJson && (errJson.error || errJson.message)) {
        errorMsg = errJson.error || errJson.message;
      }
    } catch {
      // not JSON
      const text = await response.text();
      if (text) errorMsg = text.slice(0, 150);
    }

    if (response.status === 401 && typeof window !== "undefined") {
      if (!window.location.pathname.startsWith("/login") && !window.location.pathname.startsWith("/register")) {
        // clear invalid token and let caller handle error
        clearToken();
      }
    }

    throw new Error(errorMsg);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
}
