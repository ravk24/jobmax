import { PostHog } from "posthog-node";

// Next.js server functions are short-lived, so events must send immediately
// rather than batch — hence flushAt: 1 and flushInterval: 0. Every caller must
// await shutdown() or the event is lost when the function returns.
export function createPostHogServer(): PostHog {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) {
    throw new Error("NEXT_PUBLIC_POSTHOG_KEY is not set");
  }

  return new PostHog(key, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0,
  });
}
