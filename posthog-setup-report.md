# PostHog setup report

> **Superseded 2026-07-30 by Feature 03.** This is the PostHog wizard's own record of what it did, kept for the dashboard link below. Four things in it are no longer true: the env var is now `NEXT_PUBLIC_POSTHOG_KEY`, not `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`; `error_recovery_requested` was removed; `PostHogIdentity` moved to `components/analytics/PostHogIdentity.tsx`; and captures now go through `captureEvent()` in `lib/posthog-client.ts` rather than importing `posthog-js` directly. The dashboard referenced below charts two events that no longer exist. See `context/code-standards.md` for the current event list and `context/progress-tracker.md § Feature 03` for the reasoning.

PostHog browser analytics, authenticated identity, three action events, global exception tracking, and a starter dashboard were configured for the Next.js App Router application.

## What was installed and initialized

- `posthog-js` `^1.407.7` and `posthog-node` `^5.46.1` were already declared in `package.json`; `npm install` completed successfully during review and dependencies remained current. No dependency declaration edit was needed.
- Browser initialization is centralized in `instrumentation-client.ts`. It reads `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` from environment variables and initializes `posthog-js` once when both are present, with exception capture and PostHog defaults enabled.
- The real environment keys were configured in `.env.local`; `.env.example` documents both variable names. No server-side `posthog-node` instrumentation was added.
- No CSP directives or reverse-proxy changes were made because the review found no CSP configuration in `next.config.ts`.

## Events instrumented

The run verified that these capture calls are present in their real handlers. It did **not** observe events arriving in PostHog: no browser delivery test was run, and the dashboard may initially be empty.

| Event | What it measures | File |
|---|---|---|
| `oauth_sign_in_started` | A visitor selects an OAuth provider to begin authentication. | `components/auth/OAuthButtons.tsx` |
| `user_logged_out` | An authenticated user submits logout before browser analytics state is reset. | `components/auth/LogoutButton.tsx` |
| `error_recovery_requested` | A visitor selects **Try again** after the global error boundary is displayed. | `app/global-error.tsx` |

OAuth-start and error-recovery actions can occur before authentication and therefore remain personless when no authenticated identity exists. Authenticated browser captures inherit the identity mounted by the root layout.

## Identity

User identification was wired. `app/layout.tsx` loads the authenticated Insforge user and mounts `PostHogIdentity` from `components/auth/LogoutButton.tsx`. The component calls `posthog.identify()` once per authenticated browser mount using the stable `user.id`; email and name are person properties rather than event properties. Logout captures `user_logged_out` and then calls `posthog.reset()`.

The run verified these code paths by inspection only. It did not exercise a live browser, so returning-session attribution and event delivery remain unconfirmed. Server-side identity was not configured because no server-side capture was added.

## Error tracking

`app/global-error.tsx` is a client-side Next.js global error boundary. It calls `posthog.captureException(error)` once from `useEffect` when Next.js supplies a global error and preserves recovery through `reset()`. The run verified the source implementation but did not trigger an exception or observe an Error Tracking issue in PostHog.

## Dashboard

[Analytics basics (wizard)](https://us.posthog.com/project/533085/dashboard/1927653)

Dashboard `1927653` contains three tagged `(wizard)` TrendsQuery insights for the exact events above: OAuth sign-in starts, user logout activity, and error recovery requests. The dashboard and insight creation succeeded in PostHog, but populated data was not confirmed.

## Verification and unresolved issues

- Review recorded successful `npm install`, `npm run lint`, and `npm run build`. The build proved compilation, TypeScript, route collection, and static generation; it did **not** prove that events or exceptions flow to PostHog.
- npm install reported pre-existing peer-dependency warnings and audit findings. Installation, lint, and build still completed successfully; those dependency concerns remain unresolved.
- Runtime delivery is unconfirmed: no browser session observed ingestion, identity attribution, or exception ingestion.
- No attribution issue was reported for the implemented authenticated browser path. A future server-side integration would need request-scoped identity and environment-backed `posthog-node` configuration.

## Next steps

1. Run the app in a real browser with deployment environment variables configured.
2. Select an OAuth provider, submit logout while authenticated, and click **Try again** after a representative global error; confirm the three exact events appear in PostHog.
3. Confirm authenticated events use the expected stable user identity and that a returning session identifies again.
4. Trigger a representative uncaught browser exception and confirm it appears in PostHog Error Tracking.
5. Verify the dashboard populates after events arrive.
6. Decide whether server-side route-handler tracking is needed; if so, use `posthog-node` with environment-backed configuration and flush short-lived handlers correctly.

## Before you merge

- [ ] Run a full production build and fix any lint or type errors introduced by the integration; the recorded run passed `npm run build` and `npm run lint`, but the checked-in tree should be verified.
- [ ] Run the test suite and update mocks or fixtures affected by the new PostHog imports and capture handlers; no test-suite run was recorded.
- [ ] Confirm `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` are set in every deployment environment, not only `.env.local`; check `instrumentation-client.ts` and deployment configuration.
- [ ] Because authenticated identify is wired, verify the returning-visitor path reaches `PostHogIdentity` in `components/auth/LogoutButton.tsx` and calls identify again on refresh.
