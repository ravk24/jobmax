import posthog from "posthog-js"

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST

if (!key && process.env.NODE_ENV !== "production") {
  throw new Error(
    "NEXT_PUBLIC_POSTHOG_KEY variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_KEY is configured",
  )
}

if (!host && process.env.NODE_ENV !== "production") {
  throw new Error(
    "NEXT_PUBLIC_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_HOST is configured",
  )
}

if (key && host) {
  posthog.init(key, {
    api_host: host,
    capture_exceptions: true,
    // Dated config baseline written by the PostHog wizard. It resolves
    // capture_pageview to "history_change", which is what gives us automatic
    // $pageview on client navigations. Bumping the date changes autocapture
    // behaviour — re-verify events still fire before touching it.
    defaults: "2026-01-30",
  })
}
