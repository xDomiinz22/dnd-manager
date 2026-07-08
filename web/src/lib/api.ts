import type { RefreshResponse } from "@dnd-manager/shared";
import { getAccessToken, setAccessToken } from "./tokenStore";

function rawRequest(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`/api${path}`, {
    credentials: "include",
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
}

let refreshPromise: Promise<string | null> | null = null;

export function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await rawRequest("/auth/refresh", { method: "POST" });
        if (!res.ok) {
          setAccessToken(null);
          return null;
        }
        const data = (await res.json()) as RefreshResponse;
        setAccessToken(data.accessToken);
        return data.accessToken;
      } catch {
        setAccessToken(null);
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const NO_REFRESH_PATHS = new Set(["/auth/login", "/auth/register", "/auth/refresh"]);

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const res = await rawRequest(path, {
    ...init,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers },
  });

  if (res.status === 401 && !NO_REFRESH_PATHS.has(path)) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      const retryRes = await rawRequest(path, {
        ...init,
        headers: { Authorization: `Bearer ${newToken}`, ...init?.headers },
      });
      return parseResponse<T>(retryRes);
    }
  }

  return parseResponse<T>(res);
}
