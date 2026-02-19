/** Cookie name for the Convex session token (used by server and client). */
export const SESSION_COOKIE_NAME = "sessionToken";

/** Max age for the session cookie (7 days, in seconds). */
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60;

/**
 * Set the session cookie (client-side only, e.g. after login).
 */
export function setSessionCookie(token: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; path=/; max-age=${SESSION_MAX_AGE}; samesite=strict`;
}

/**
 * Clear the session cookie (client-side only, e.g. on logout).
 */
export function clearSessionCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_COOKIE_NAME}=; path=/; max-age=0`;
}
