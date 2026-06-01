/**
 * lib/apiFetch.ts
 * ───────────────
 * Authenticated fetch with automatic silent token refresh.
 *
 * Vercel → Render cross-origin:
 *   - credentials:"include" is ONLY sent to /refresh (needs the cookie)
 *   - All other requests use Bearer token only
 *
 * Timeout: 30s on every request — Render free can take ~20s on cold start.
 * If the backend is sleeping the first request will hang without this.
 */

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

const REQUEST_TIMEOUT_MS = 30_000;

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("token");
}

function setToken(token: string): void {
  sessionStorage.setItem("token", token);
}

function clearSession(): void {
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("role");
  window.location.href = "/login";
}

function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

async function doRefresh(): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(`${API}/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.access_token) return null;
    setToken(data.access_token);
    return data.access_token;
  } catch {
    return null;
  }
}

async function withRefresh(
  failedPath: string,
  failedOptions: RequestInit
): Promise<Response> {
  if (isRefreshing) {
    return new Promise((resolve) => {
      refreshQueue.push(async (newToken: string | null) => {
        if (!newToken) { clearSession(); resolve(new Response(null, { status: 401 })); return; }
        resolve(fetchWithTimeout(`${API}${failedPath}`, {
          ...failedOptions,
          headers: {
            "Content-Type": "application/json",
            ...(failedOptions.headers as Record<string, string>),
            Authorization: `Bearer ${newToken}`,
          },
        }));
      });
    });
  }

  isRefreshing = true;
  const newToken = await doRefresh();
  isRefreshing = false;

  refreshQueue.forEach((cb) => cb(newToken));
  refreshQueue = [];

  if (!newToken) {
    clearSession();
    return new Response(null, { status: 401 });
  }

  return fetchWithTimeout(`${API}${failedPath}`, {
    ...failedOptions,
    headers: {
      "Content-Type": "application/json",
      ...(failedOptions.headers as Record<string, string>),
      Authorization: `Bearer ${newToken}`,
    },
  });
}

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  if (!API) {
    // Fail fast with a clear message instead of hitting "undefined/path"
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }

  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  try {
    const res = await fetchWithTimeout(`${API}${path}`, { ...options, headers });
    if (res.status !== 401) return res;
    return withRefresh(path, options);
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new Error("Request timed out. The server may be starting up — please try again.");
    }
    if (err.message?.includes("Failed to fetch") || err.message?.includes("NetworkError")) {
      throw new Error("Cannot reach the server. Check your connection or try again shortly.");
    }
    throw err;
  }
}

export async function apiJSON<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await apiFetch(path, options);

  let data: unknown;
  try { data = await res.json(); } catch { throw new Error(`Server error (${res.status})`); }

  if (!res.ok) {
    const msg = (data as { detail?: string })?.detail || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data as T;
}
