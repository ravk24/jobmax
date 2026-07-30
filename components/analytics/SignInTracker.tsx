"use client";

import { useEffect } from "react";

import { SIGNED_IN_PARAM } from "@/lib/auth";
import { captureEvent } from "@/lib/posthog-client";

type Props = {
  hasSession: boolean;
};

// Mounted in the root layout so it keeps working when POST_LOGIN_ROUTE moves
// from /profile to /dashboard in Feature 14. Reads location directly rather
// than useSearchParams — the marker is only ever read after mount, and the
// hook would force the whole tree out of static rendering for no benefit.
export function SignInTracker({ hasSession }: Props) {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has(SIGNED_IN_PARAM)) {
      return;
    }

    // The marker is just a query param, so anyone can put it on any URL. Only
    // capture when the server actually rendered a session; strip it either way
    // so a forged link does not sit in the address bar looking meaningful.
    if (hasSession) {
      captureEvent({ name: "user_signed_in" });
    }

    url.searchParams.delete(SIGNED_IN_PARAM);
    window.history.replaceState(null, "", url.toString());
  }, [hasSession]);

  return null;
}
