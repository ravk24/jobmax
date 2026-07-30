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

export async function proxy(req: NextRequest) {
  const hasSession =
    req.cookies.has(getAccessTokenCookieName()) ||
    req.cookies.has(getRefreshTokenCookieName());

  if (!hasSession) {
    return redirectToLogin(req);
  }

  const response = NextResponse.next();

  try {
    const { accessToken, error } = await updateSession({
      baseUrl: getInsforgeUrl(),
      requestCookies: toCookieStore(req.cookies),
      responseCookies: response.cookies,
    });

    if (error || !accessToken) {
      return redirectToLogin(req);
    }
  } catch (error) {
    console.error("[proxy]", error);
    return redirectToLogin(req);
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*", "/find-jobs/:path*"],
};
