import { NextRequest, NextResponse } from "next/server";
import { createAuthActions } from "@insforge/sdk/ssr";

import {
  getInsforgeUrl,
  isOAuthProvider,
  LOGIN_ROUTE,
  PKCE_VERIFIER_COOKIE,
} from "@/lib/auth";

type Params = { params: Promise<{ provider: string }> };

function loginWithError(req: NextRequest, error: string) {
  const url = new URL(LOGIN_ROUTE, req.nextUrl.origin);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { provider } = await params;

    if (!isOAuthProvider(provider)) {
      return loginWithError(req, "unsupported_provider");
    }

    // createAuthActions() throws at construction without a writable cookie
    // store, so the response has to exist before the call. Its target is a
    // placeholder — the real destination is only known once the SDK returns.
    const response = NextResponse.redirect(
      new URL(LOGIN_ROUTE, req.nextUrl.origin),
    );

    const actions = createAuthActions({
      baseUrl: getInsforgeUrl(),
      requestCookies: req.cookies,
      responseCookies: response.cookies,
    });

    const { data, error } = await actions.signInWithOAuth(provider, {
      redirectTo: new URL("/api/auth/callback", req.nextUrl.origin).toString(),
      skipBrowserRedirect: true,
    });

    if (error || !data.url) {
      console.error("[api/auth/provider]", error?.message ?? "no auth url");
      return loginWithError(req, "oauth_start_failed");
    }

    response.headers.set("location", data.url);

    // The verifier must survive the round trip to the provider and come back
    // for the PKCE exchange in the callback handler.
    if (data.codeVerifier) {
      response.cookies.set(PKCE_VERIFIER_COOKIE, data.codeVerifier, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 10,
      });
    }

    return response;
  } catch (error) {
    console.error("[api/auth/provider]", error);
    return loginWithError(req, "oauth_start_failed");
  }
}
