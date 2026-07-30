import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies, createAuthActions } from "@insforge/sdk/ssr";

import { getInsforgeUrl } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const response = NextResponse.redirect(new URL("/", req.nextUrl.origin), {
    status: 303,
  });

  try {
    const actions = createAuthActions({
      baseUrl: getInsforgeUrl(),
      requestCookies: req.cookies,
      responseCookies: response.cookies,
    });
    await actions.signOut();
  } catch (error) {
    console.error("[api/auth/logout]", error);
  }

  // Always clear locally, even if the backend call failed — otherwise the user
  // stays signed in from our side with a session the backend may have revoked.
  clearAuthCookies(response.cookies);
  return response;
}
