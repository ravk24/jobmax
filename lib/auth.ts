export const OAUTH_PROVIDERS = ["google", "github"] as const;

export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

export const PKCE_VERIFIER_COOKIE = "insforge_pkce_verifier";

// The callback appends this to the post-login redirect so the landing page can
// tell a fresh sign-in from an ordinary page load and fire user_signed_in once.
// SignInTracker strips it from the URL as soon as it has captured.
export const SIGNED_IN_PARAM = "signed_in";

export const PROTECTED_ROUTES = ["/dashboard", "/profile", "/find-jobs"];

export const LOGIN_ROUTE = "/login";

// Points at /profile until the dashboard exists (Feature 14). architecture.md
// specifies /dashboard as the post-login destination — restore it then.
export const POST_LOGIN_ROUTE = "/profile";

export function isOAuthProvider(value: string): value is OAuthProvider {
  return (OAUTH_PROVIDERS as readonly string[]).includes(value);
}

export function getInsforgeUrl(): string {
  const url = process.env.NEXT_PUBLIC_INSFORGE_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_INSFORGE_URL is not set");
  }
  return url;
}

export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}
