import { getToken, getRefreshToken, saveToken, saveRefreshToken, removeToken, isTokenExpired } from "./auth";
import { AUTH_BASE } from "./config";

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${AUTH_BASE}/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    saveToken(data.accessToken);
    if (data.refreshToken) saveRefreshToken(data.refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

function forceLogout() {
  removeToken();
  window.location.href = "/auth/login";
}

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  let token = getToken();

  // Proactively refresh if token is expired or about to expire
  if (!token || isTokenExpired(token)) {
    console.log("Token expired/missing — refreshing before request...");
    const newToken = await refreshAccessToken();
    if (!newToken) {
      forceLogout();
      return new Response(null, { status: 401 });
    }
    token = newToken;
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  // Handle 401 as fallback (token rejected by server)
  if (res.status === 401) {
    console.log("Got 401 — attempting refresh...");
    const newToken = await refreshAccessToken();
    if (!newToken) {
      forceLogout();
      return res;
    }

    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${newToken}`,
      },
    });
  }

  return res;
}