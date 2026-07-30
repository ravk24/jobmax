import posthog from "posthog-js";

import type { OAuthProvider } from "@/lib/auth";

// The SDK is initialised in instrumentation-client.ts — Next.js 16's client
// bootstrap hook — so it is ready before any component mounts. This module is
// the only sanctioned way to capture: keeping every event name and its payload
// in one discriminated union means a typo is a type error rather than a new
// event silently appearing in PostHog.

export type AnalyticsEvent =
  | { name: "login_page_viewed" }
  | { name: "oauth_sign_in_started"; properties: { provider: OAuthProvider } }
  | { name: "oauth_sign_in_failed"; properties: { reason: string } }
  | { name: "user_signed_in" }
  | { name: "user_logged_out" };

export type PersonProperties = {
  email?: string;
  name?: string;
};

export type CaptureOptions = {
  // Skips the batch queue. Set this when the page is about to navigate away —
  // a queued event racing an unload can be dropped.
  sendInstantly?: boolean;
};

// Analytics must never break the interaction it is measuring, so every entry
// point swallows its own failures rather than throwing into a click handler.
function safely(action: () => void): void {
  try {
    action();
  } catch (error) {
    console.error("[lib/posthog-client]", error);
  }
}

export function captureEvent(
  event: AnalyticsEvent,
  options: CaptureOptions = {},
): void {
  safely(() => {
    posthog.capture(
      event.name,
      "properties" in event ? event.properties : undefined,
      options.sendInstantly ? { send_instantly: true } : undefined,
    );
  });
}

// Error tracking, not a product event — it carries no name from AnalyticsEvent
// and is exempt from the "capture through captureEvent" rule.
export function captureError(error: unknown): void {
  safely(() => {
    posthog.captureException(error);
  });
}

export function identifyUser(
  userId: string,
  properties: PersonProperties = {},
): void {
  safely(() => {
    posthog.identify(userId, properties);
  });
}

export function resetUser(): void {
  safely(() => {
    posthog.reset();
  });
}
