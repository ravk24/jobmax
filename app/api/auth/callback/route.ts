import { NextRequest, NextResponse } from "next/server";
import { createAuthActions } from "@insforge/sdk/ssr";

import {
  getInsforgeUrl,
  LOGIN_ROUTE,
  PKCE_VERIFIER_COOKIE,
  POST_LOGIN_ROUTE,
  SIGNED_IN_PARAM,
} from "@/lib/auth";

function loginWithError(req: NextRequest, error: string) {
  const url = new URL(LOGIN_ROUTE, req.nextUrl.origin);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get("insforge_code");
    if (!code) {
      const providerError = req.nextUrl.searchParams.get("insforge_error");
      console.error("[api/auth/callback]", providerError ?? "missing code");
      return loginWithError(req, "oauth_denied");
    }

    const codeVerifier = req.cookies.get(PKCE_VERIFIER_COOKIE)?.value;
    if (!codeVerifier) {
      return loginWithError(req, "session_expired");
    }

    // The marker tells the landing page this was a fresh sign-in rather than an
    // ordinary load. It only survives a successful exchange — every failure
    // path below returns loginWithError instead.
    const postLoginUrl = new URL(POST_LOGIN_ROUTE, req.nextUrl.origin);
    postLoginUrl.searchParams.set(SIGNED_IN_PARAM, "1");

    const response = NextResponse.redirect(postLoginUrl);

    const actions = createAuthActions({
      baseUrl: getInsforgeUrl(),
      requestCookies: req.cookies,
      responseCookies: response.cookies,
    });

    const { error } = await actions.exchangeOAuthCode(code, codeVerifier);

    if (error) {
      console.error("[api/auth/callback]", error.message);
      return loginWithError(req, "oauth_exchange_failed");
    }

    response.cookies.delete(PKCE_VERIFIER_COOKIE);
    return response;
  } catch (error) {
    console.error("[api/auth/callback]", error);
    return loginWithError(req, "oauth_exchange_failed");
  }
}
