import { NextRequest, NextResponse } from "next/server";
import {
  clearAuthCookies,
  getAccessTokenCookieName,
  getRefreshTokenCookieName,
  updateSession,
  type CookieOptions,
  type CookieStore,
} from "@insforge/sdk/ssr";

import { getInsforgeUrl, LOGIN_ROUTE } from "@/lib/auth";

type NextRequestCookies = NextRequest["cookies"];

// Next's request cookie jar takes no options on set/delete, so it does not
// structurally match the SDK's CookieStore. This adapter bridges the two
// without a type assertion.
function toCookieStore(cookies: NextRequestCookies): CookieStore {
  return {
    get: (name: string) => cookies.get(name),
    set: (
      nameOrOptions: string | ({ name: string; value: string } & CookieOptions),
      value?: string,
    ) => {
      if (typeof nameOrOptions === "string") {
        cookies.set(nameOrOptions, value ?? "");
      } else {
        cookies.set(nameOrOptions.name, nameOrOptions.value);
      }
    },
    delete: (nameOrOptions: string | ({ name: string } & CookieOptions)) => {
      cookies.delete(
        typeof nameOrOptions === "string" ? nameOrOptions : nameOrOptions.name,
      );
    },
  };
}

function redirectToLogin(req: NextRequest) {
  const response = NextResponse.redirect(
    new URL(LOGIN_ROUTE, req.nextUrl.origin),
  );
  clearAuthCookies(response.cookies);
  return response;
}

// An API caller wants a status code, not a login page: a 307 to /login answers
// a fetch() with HTML, and the client reports a JSON parse failure instead of
// the real problem. Matches the shape every route handler returns.
//
// It deliberately does NOT clear the auth cookies. A refresh can fail for
// reasons that have nothing to do with the session being dead — an InsForge
// blip, a rotation race — and signing someone out of the whole application
// because one background upload picked a bad moment is a wildly
// disproportionate response. The session is left intact and the next page
// navigation decides its fate, where a redirect to /login is the honest answer.
function rejectApiRequest() {
  return NextResponse.json(
    { success: false, error: "You are not signed in." },
    { status: 401 },
  );
}

function rejectRequest(req: NextRequest) {
  return req.nextUrl.pathname.startsWith("/api/")
    ? rejectApiRequest()
    : redirectToLogin(req);
}

export async function proxy(req: NextRequest) {
  const hasSession =
    req.cookies.has(getAccessTokenCookieName()) ||
    req.cookies.has(getRefreshTokenCookieName());

  if (!hasSession) {
    return rejectRequest(req);
  }

  const response = NextResponse.next();

  try {
    const { accessToken, error } = await updateSession({
      baseUrl: getInsforgeUrl(),
      requestCookies: toCookieStore(req.cookies),
      responseCookies: response.cookies,
    });

    if (error || !accessToken) {
      return rejectRequest(req);
    }
  } catch (error) {
    console.error("[proxy]", error);
    return rejectRequest(req);
  }

  return response;
}

// Next requires a literal array here — it cannot be built from an imported
// constant, which is why PROTECTED_ROUTES in lib/auth.ts duplicates this list.
//
// Authenticated API routes belong here too, and not only for route protection:
// updateSession() is the only thing that refreshes an expired access token, so
// a route left out of this matcher 401s the moment the token ages out, while
// every protected page silently refreshes and keeps working. /api/auth/* is
// deliberately absent — those routes establish the session and must stay
// reachable without one.
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/find-jobs/:path*",
    "/api/resume/:path*",
  ],
};
