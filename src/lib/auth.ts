const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

export function saveToken(token: string) {
  if (typeof window !== "undefined") localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function saveRefreshToken(token: string) {
  if (typeof window !== "undefined") localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function getToken(): string | null {
  if (typeof window !== "undefined") return localStorage.getItem(ACCESS_TOKEN_KEY);
  return null;
}

export function getRefreshToken(): string | null {
  if (typeof window !== "undefined") return localStorage.getItem(REFRESH_TOKEN_KEY);
  return null;
}

export function removeToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

// Decode JWT and check if it's expired (or expiring within 60 seconds)
export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now() + 60_000;
  } catch {
    return true;
  }
}