"use client";

import { useEffect, useRef } from "react";

import { captureEvent } from "@/lib/posthog-client";

type Props = {
  error?: string;
};

export function LoginPageTracker({ error }: Props) {
  // React StrictMode double-invokes effects in development, which would double
  // count both of these. The ref survives the remount, the events do not repeat.
  const viewCaptured = useRef(false);
  const errorCaptured = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (viewCaptured.current) {
      return;
    }
    viewCaptured.current = true;
    captureEvent({ name: "login_page_viewed" });
  }, []);

  useEffect(() => {
    if (!error || errorCaptured.current === error) {
      return;
    }
    errorCaptured.current = error;
    captureEvent({ name: "oauth_sign_in_failed", properties: { reason: error } });
  }, [error]);

  return null;
}
