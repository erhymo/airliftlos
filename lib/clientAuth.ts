export const ACCESS_TOKEN_STORAGE_KEY = "airliftlos_access_token";
export const ACCESS_TOKEN_EXPIRES_AT_STORAGE_KEY = "airliftlos_access_token_expires_at";

export function getAccessTokenFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

