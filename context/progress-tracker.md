# Progress Tracker

Update this file after every completed feature. Any AI agent reading this should immediately know what is done, what is in progress, and what is next.

---

## Current Status

**Phase:** Phase 2 — Profile Page
**Last completed:** 05 Profile Page — Full UI (2026-07-30). Phase 1 is complete apart from the two outstanding Feature 02 clicks.
**In progress:** 02 Auth — **working end to end for Google.** Anon key is in `.env.local`, the OAuth round trip completes, and post-login lands on `/profile`. Both original blockers are resolved. Remaining: confirm GitHub sign-in and sign-out.
**Next:** 06 Profile Save Logic. Still outstanding from 02: click through GitHub sign-in and the Log out button (which also verifies `user_logged_out`), then tick 02.

---

## Progress

### Phase 1 — Foundation

- [x] 01 Homepage
- [~] 02 Auth — Google sign-in verified end to end; GitHub and sign-out untested
- [x] 03 PostHog Initialization — events confirmed arriving at PostHog
- [x] 04 Database Schema — 4 tables + RLS + resumes bucket, live and verified

### Phase 2 — Profile Page

- [x] 05 Profile Page — Full UI (mock data, no save logic — Feature 06 wires it)
- [ ] 06 Profile Save Logic
- [ ] 07 AI Profile Extraction from Resume
- [ ] 08 Resume PDF Generation from Profile

### Phase 3 — Find Jobs Page

- [ ] 09 Find Jobs Page — Full UI
- [ ] 10 Adzuna Job Discovery
- [ ] 11 Filter + Sort + Pagination

### Phase 4 — Job Details Page

- [ ] 12 Job Details Page — Full UI
- [ ] 13 Company Research Agent

### Phase 5 — Dashboard

- [ ] 14 Dashboard Page — Full UI
- [ ] 15 Stats Bar — Real Data
- [ ] 16 Recent Activity — Real Data
- [ ] 17 Analytics Charts — PostHog Data

---

## Blockers

### ~~`NEXT_PUBLIC_INSFORGE_ANON_KEY` is missing~~ — resolved 2026-07-29

The key is now in `.env.local`. `/login` renders 200 with no SDK error in the dev log, so the SSR clients construct successfully. The OAuth round trip itself is still unverified — see the `allowedRedirectUrls` blocker below. Original diagnosis kept for reference:



`createBrowserClient()` and `createServerClient()` from `@insforge/sdk/ssr` both throw `"Missing InsForge baseUrl or anonKey"` without it — the check is `if (!baseUrl || !anonKey) throw`. The base `createClient()` treats `anonKey` as optional; the SSR helpers do not. Any page calling `getCurrentUser()` returns a 500 until this is set.

Ways to get it, in order of likelihood:

1. **InsForge dashboard** → Install → API Keys.
2. **MCP `get-backend-metadata`**, once the InsForge MCP server is loaded (needs a Claude Code restart — it is configured in `.mcp.json` but not attached).
3. ~~`npx @insforge/cli secrets get ANON_KEY`~~ — documented, but broken: it requires an interactive browser login to `api.insforge.dev`, which fails with `ERR_TLS_CERT_ALTNAME_INVALID` (that host is not in its certificate's altnames).

The REST API does **not** expose it. `/api/metadata` returns auth config, tables, buckets, functions, realtime and deployment info but no keys; nine other plausible endpoints all 404.

### ~~`allowedRedirectUrls` is empty~~ — resolved 2026-07-29

A real Google sign-in completed the full round trip: the code exchanged, cookies were written, and the post-login redirect fired (it 404'd only because `/dashboard` did not exist yet — now fixed). `http://localhost:3000/api/auth/callback` is evidently accepted as-is.

Still add a production origin to `allowedRedirectUrls` at deploy time.

---

## Decisions Made During Build

### Feature 01 — Homepage (2026-07-29)

**Tailwind v4, not 3.4.** The InsForge boilerplate block at the bottom of `AGENTS.md` says "use Tailwind CSS 3.4 (do not upgrade to v4)", but `ui-tokens.md` and `ui-rules.md` both specify v4 with `@theme` in `globals.css` and no config file, and v4 was already installed. The two dedicated UI context files plus the installed state win. Tokens live in `@theme` in `app/globals.css`; there is no `tailwind.config.ts` and none should be created.

**Dashboard cards follow project-overview.md, not build-plan.md.** Build plan Feature 14 lists a "Cover Letters Generated" stat card and a "Resume Tailoring Activity" chart. Both features are explicitly out of scope, and `public/dashboard.png` confirms the real four cards: Total Jobs Found, Avg. Match Rate, Companies Researched, Jobs This Week — plus a Company Research Activity chart. Build Feature 14 from project-overview.md.

**Font indirection.** `next/font` self-hosts Inter under a generated family name, so a literal `--font-sans: "Inter", sans-serif` in `@theme` would not resolve. Inter loads as `--font-inter`, JetBrains Mono as `--font-jetbrains-mono`, and `@theme inline` maps `--font-sans`/`--font-mono` onto those. Verified in the compiled CSS.

**shadcn/ui init overwrote the design tokens — repaired.** `npx shadcn init` appended its own `@theme inline` block redefining `--color-background`, `--color-accent`, `--color-accent-foreground`, `--color-border` and the whole `--radius-*` scale to its neutral oklch palette, plus a Geist font import in `layout.tsx`. Those collisions were removed and shadcn's remaining semantic vars (`--primary`, `--card`, `--muted`, `--ring`, …) are now mapped onto JobMax tokens in `:root`. **If shadcn is ever re-initialised, this repair must be redone** — check `globals.css` for a second `@theme inline` block reintroducing `--color-background` or `--radius-*`.

**Dark mode is deliberately inert.** `@custom-variant dark (&:is(.dark *))` is kept so shadcn's built-in `dark:` classes compile without ever activating from OS preference. Nothing sets `.dark`. Do not remove the custom variant — without it, `dark:` falls back to `prefers-color-scheme` and repaints a light-only design.

**Two button treatments.** `variant="default"` is the purple button ui-tokens.md specifies for app UI. `variant="cta"` is the near-black button the delivered landing-page design uses for marketing CTAs. See `ui-registry.md § Button`.

**Marketing copy adapted to actual scope.** The design mock advertises resume tailoring, cover letter generation, LinkedIn as a source, and pasting a job link — all out of scope. Layout was reproduced exactly; the copy, the agent log lines, and the source badges were changed to describe what JobMax actually does (Adzuna discovery, match scoring, company research). Source badges read `Search`/`URL`, matching the only two values `jobs.source` accepts.

**Match bar colours follow ui-rules.md, not the mock's pixels.** The design mock colours some 80–90% scores blue. `ui-rules.md § Match Score Bar` is explicit (≥80 green, 60–79 blue, <60 orange), so `matchScoreBarClass()` in `lib/utils.ts` implements the rule and the mock row for Notion (72%) renders blue rather than orange.

**`MATCH_THRESHOLD = 70` now lives in `lib/utils.ts`** alongside `cn` and `matchScoreBarClass`, per code-standards.md. Import it; never hardcode 70.

### Feature 02 — Auth (2026-07-29)

**`@insforge/ssr` does not exist; `@insforge/sdk/ssr` does.** The context files named a package that isn't on npm. The *API shape* they described — `createBrowserClient` / `createServerClient` with a cookies adapter — is real; only the import path was wrong. `architecture.md`, `library-docs.md` and `code-standards.md` have been corrected.

**Session lives in httpOnly cookies on our own origin, via `client_type=server`.** The SDK's default `client_type=web` stores the refresh token in a cookie on the *InsForge* domain, which our Proxy and Server Components can never read. `client_type=server` returns the token to us instead. This is the decision the rest of the architecture depends on — Proxy route protection, `createInsforgeServer()`, and Server Components reading the user all require it.

**Nothing about the auth flow is hand-rolled.** `createAuthActions()` does the PKCE dance and the code exchange, `updateSession()` does the refresh and rotated-cookie writes, `clearAuthCookies()` does sign-out. An earlier plan to implement PKCE by hand was dropped once the SSR helpers were found — the SDK's own types deprecate the manual path.

**Refresh happens in Proxy, not lazily on 401.** An expired access token is refreshed before the request proceeds, so every Server Component and API route downstream sees a valid token. Known limitation: refresh tokens rotate, so two concurrent expired requests can race and one loses its token. Acceptable for local dev; revisit if it shows up in production.

**Middleware is Proxy in Next.js 16.** `middleware.ts` is deprecated — the dev server warns about it. The file is `proxy.ts` at the project root exporting `proxy()`. Same functionality, same `config.matcher`.

**No DB writes in Feature 02.** The `profiles` table is Feature 04 and the row is created in Feature 06. A missing row reads as "profile incomplete" on the dashboard.

**Post-login lands on `/profile`, not `/dashboard` (2026-07-29).** Google sign-in completed successfully but 404'd: `POST_LOGIN_ROUTE` was `/dashboard`, which is Feature 14 and does not exist. `POST_LOGIN_ROUTE` in `lib/auth.ts` now points at `/profile`, and `app/profile/page.tsx` was created as a **placeholder** — minimal app header (logo → `/`, logout button) plus a card showing the signed-in email. `components/auth/LogoutButton.tsx` is new and is the first logout UI in the project.

**Restore `POST_LOGIN_ROUTE = "/dashboard"` when Feature 14 lands** — `architecture.md` specifies it, and the constant carries a comment saying so. The homepage CTA label was changed from "Go to dashboard" to "Go to profile" to match; change it back at the same time.

**This proves the OAuth round trip works.** A 404 at `/dashboard` means the exchange succeeded, cookies were written, and the redirect fired. `allowedRedirectUrls` is therefore **not** a blocker.

**`createAuthActions()` needs a writable cookie store even to *start* OAuth (fixed 2026-07-29).** `app/api/auth/[provider]/route.ts` called `createAuthActions({ baseUrl })` with no cookie store — the pattern `library-docs.md` documented. The SDK guards this at **construction** (`ssr.mjs:3617`: `if (!writeCookies?.set) throw`), so it threw before `signInWithOAuth` ever ran, and the route's catch flattened it into a generic `oauth_start_failed`. The guard is over-broad: `signInWithOAuth` is a passthrough that writes no cookies (`ssr.mjs:3643`). TypeScript cannot catch this — `createAuthActions(options?)` has every cookie field optional, so it is a runtime-only contract.

Fix: build the redirect response *first* (targeting `LOGIN_ROUTE` as a placeholder), pass `responseCookies: response.cookies`, then retarget with `response.headers.set("location", data.url)` once the SDK returns. The `library-docs.md` snippet has been corrected — it taught the broken call, so this would otherwise be rewritten every session.

**Login page redesigned as a split screen (2026-07-29).** The first pass was a small centred card on `bg-background` — technically correct but visually thin next to the delivered landing-page design. It is now a two-column layout: form column on the left, an `aurora` showcase panel on the right carrying the Hero's headline, the `JobsTablePreview` mock, and three value points. No new design assets existed for auth, so the treatment is derived from `context/design/landing-page.png`. Two new components: `components/auth/AuthShowcase.tsx` and `components/auth/AuthHighlights.tsx`. See `ui-registry.md § Login page / split auth layout`.

**`aurora` is now used off the marketing pages.** It was previously reserved for Hero and BottomCta. The showcase panel is still a full-bleed section rather than a card, so `ui-rules.md § Do Nots` is intact — but the reservation is no longer "marketing pages only", it is "full-bleed sections only".

**`lucide-react` v1 dropped brand marks.** No `Github` export. The Google and GitHub logos on the login page are inline SVGs using `fill="currentColor"`.

### Feature 03 — PostHog Initialization (2026-07-30)

**A PostHog wizard had already run, and its output diverged from the spec on four counts.** It initialised the browser SDK in `instrumentation-client.ts` (correct for Next 16) but never created `lib/posthog-client.ts` or `lib/posthog-server.ts`, read `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` instead of the spec'd `NEXT_PUBLIC_POSTHOG_KEY`, co-exported `PostHogIdentity` from `components/auth/LogoutButton.tsx`, and added three unlisted events. All four reconciled. If the wizard is ever re-run, expect the env var and the event list to regress.

**`NEXT_PUBLIC_POSTHOG_KEY` was present in `.env.local` but empty** — the real token only existed under the wizard's `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`. The value was moved onto the spec'd name and the duplicate deleted, so there is now one name for one value. **The same variable must be set in every deployment environment** or the browser silently sends nothing: outside development `instrumentation-client.ts` skips `init()` rather than throwing.

**Init stays in `instrumentation-client.ts`; `lib/posthog-client.ts` is the typed capture surface, not an init module.** `library-docs.md` used to describe an `initPostHog()` called from the root layout with `capture_pageview: false`. That predates the installed PostHog skill and is superseded — Next 16's client bootstrap hook runs before any component mounts, and `defaults` gives autocapture including `$pageview`. Components never import `posthog-js`; they call `captureEvent()`, whose `AnalyticsEvent` union makes an unlisted event name a compile error.

**Five auth lifecycle events were added; the four product events remain unbuilt.** All four spec'd events belong to Features 06/10/13, so instrumenting them now was impossible. The auth events are documented as a second sanctioned group in `code-standards.md` — that file's "these are the only events" rule now covers nine.

**`user_signed_in` cannot be captured on the landing page alone** — every load there would fire it. The callback appends `SIGNED_IN_PARAM` to the post-login redirect and `SignInTracker` captures once, then strips the param via `history.replaceState`. The tracker lives in the **root layout**, not on `/profile`, so it survives `POST_LOGIN_ROUTE` moving to `/dashboard` in Feature 14.

**PostHog drops every event from a detected bot, which makes headless verification lie.** `posthog.capture()` returns `undefined` and no request is made when the UA contains `HeadlessChrome` or `navigator.webdriver` is set. The first verification run looked like a broken integration — flags and remote config loaded fine, but zero `/e/` requests. Override both over CDP (`Network.setUserAgentOverride` plus an `addScriptToEvaluateOnNewDocument` that hides `navigator.webdriver`) or the harness measures PostHog's bot filter instead of the app.

### Feature 05 — Profile Page UI (2026-07-30)

**Mock data, no persistence.** `MOCK_PROFILE` in `app/profile/page.tsx` is typed as `Profile` so it cannot drift from `db/schema.sql`. Feature 06 replaces it with a real read plus a Server Action; the Save button currently submits nothing.

**`PROTECTED_ROUTES` in `lib/auth.ts` is not what protects routes.** `proxy.ts` carries its own hardcoded `config.matcher`, and Next requires a literal array there — it cannot be built from an imported constant. The two lists duplicate each other and can drift. `isProtectedRoute()` is currently unused. Worth reconciling before more protected routes are added.

**The design mock is internally inconsistent about Education** — it tags `EDUCATION` as missing while showing "High School" and "Computer Science" filled. Resolved by treating education as complete only when **degree and institution** are both present, which reproduces the mock exactly (partially filled, still flagged) and is the more realistic rule.

**The Cover Letter Tone dropdown was omitted.** `build-plan.md` Feature 05 lists it, but the design does not show it and cover letter generation is explicitly out of scope in `project-overview.md`. `profiles.cover_letter_tone` remains in the schema, unused.

**Two `ui-rules.md` rules were corrected against the design** — the navbar "no underline" rule (the app navbar's active item does carry an accent underline) and the white form-input background (controls sit on `surface-secondary`). Both were contradicted by `context/design/profile.png`, which that file names as the source of truth.

**Verified:** no horizontal overflow at 1440/1024/430; add and remove a skill; add a role (1→2); "Currently working here" disables *and* clears the end date. Banner reads 70% with exactly `PHONE`, `LOCATION`, `EDUCATION`. `tsc`, `lint`, `build` clean.

**Three review findings fixed after the first build (2026-07-30):**

- **`work_experience` is capped at 3.** `MAX_WORK_EXPERIENCE` in `lib/profile.ts` is the single definition. `architecture.md` and `build-plan.md` both specify the limit but jsonb cannot enforce it, so the form does — and **Feature 06 must re-check it server-side**, since a client-side cap is not a constraint.
- **`WorkExperience` gained an `id`.** Roles were keyed by array index while `WorkExperienceCard` derived twelve element ids from the same index, so removing a middle role re-pointed React state and every `label htmlFor`. Ids are generated with `crypto.randomUUID()` **in the click handler, never during render** — during render it would differ between server and client and break hydration. This changes the jsonb shape; no DDL change was needed, and no rows exist yet.
- **The signed-in user's email is now used.** The page fetched the session, used it only for the redirect guard, then rendered a hardcoded `faizan@jsmastery.pro` in the disabled Email field — a regression, since the previous placeholder page showed the real address. Only email is taken from the session; the rest stays mock until Feature 06.

**Verification required temporarily bypassing auth** — `/profile` is protected by `proxy.ts`, so a headless browser with no session only ever sees `/login`. The page guard *and* the proxy matcher were both patched, then reverted; `git diff` confirmed both files identical to `HEAD` and `/profile` returning 307 again afterwards.

---

### Backlog closed before Feature 05 (2026-07-30)

Five questions that had been carried across sessions are now settled. They are decisions, not open items — do not reopen them without a reason.

**Profile completion percentage and missing fields are derived, never stored.** `profiles` deliberately has no column for either. The data needed to compute them is already in the row, and a stored percentage goes stale the moment any field changes. `calculateCompletion()` in `lib/profile.ts` is the single source of truth for which fields count as required. Feature 06 must not add a column for this.

**The `hasSession` gate on `user_signed_in` may under-count — accepted.** `getCurrentUser()` returns `null` on error as well as when signed out, so a transient InsForge failure during the post-login render drops the event. A silent under-count is preferable to a metric any visitor can inflate by putting `?signed_in=1` on a URL.

**`defaults: "2026-01-30"` stays.** It resolves `capture_pageview` to `history_change` and works. Changing the date changes autocapture behaviour; the reasoning is commented in `instrumentation-client.ts`.

**`login_page_viewed` stays despite overlapping `$pageview`.** It is a stable funnel step that survives route changes and does not depend on pathname filtering.

**`agent_runs.user_id` → `profiles` ordering constraint stays.** No agent run can exist before a profile row is saved in Feature 06. That matches the intended flow, since matching requires a profile.

**Repo hygiene done at the same time:** the four unused `public/` design mocks were deleted (byte-identical copies live in `context/design/`, the canonical home; `public/dashboard.png` stays because `DashboardPreview.tsx` renders it), `memory.md` and `posthog-setup-report.md` were untracked and gitignored as session artefacts, and the Phase 1 commit message was corrected from "implement landing page and auth" to reflect that it contains Features 01–04.

---

### Feature 04 — Database Schema (2026-07-30)

**`db/schema.sql` is the source of truth.** Every statement is idempotent, so re-running it is safe. It was applied through the MCP `run-raw-sql` tool in a single batch. `types/index.ts` is authored from the same column list — change one and change the other in the same commit.

**RLS is the only access control, not defence in depth.** InsForge sets a default ACL on `public` (`pg_default_acl`) granting `arwd` to **both `anon` and `authenticated`** on every table `project_admin` creates, and both roles already hold schema `USAGE`. A table added to `public` without RLS is therefore world-readable *and* world-writable by unauthenticated callers. Never add a table without enabling RLS and adding a policy. `db/schema.sql` also explicitly `REVOKE`s `anon` on all four tables so anonymous callers are refused outright rather than allowed to connect and match zero rows.

**`auth.users` exists and `architecture.md` was right.** `profiles.id uuid REFERENCES auth.users(id)` is valid — verified by inserting a row keyed on the real signed-in user. `auth.users.id` is `uuid NOT NULL`. The auth schema is *not* reachable through PostgREST (`/api/database/records/*` is scoped to `public`), which is why the FK target could not be confirmed from the REST API alone.

**Postgres RLS is genuinely supported.** `auth.uid()` exists, defined as `SELECT nullif(auth.jwt() ->> 'sub', '')::uuid`, alongside `auth.jwt()`, `auth.role()`, `auth.email()`. Policies compare against it. `anon` and `authenticated` both have `rolbypassrls = false` so policies apply to app traffic; `project_admin` (the MCP/admin connection) has `rolbypassrls = true`, which is why admin tooling still sees every row — do not mistake that for a policy failure.

**InsForge does not name its own tables in `public`.** There was no collision risk for `profiles` despite InsForge exposing `/api/auth/profiles/` — that endpoint reads `auth.users.profile`, a jsonb column holding name/avatar, which is a different thing from our `profiles` table.

**CHECK constraints were added beyond the spec**, so documented invariants are enforced by the database rather than by convention: `jobs.source IN ('search','url')`, `match_score BETWEEN 0 AND 100`, plus the enumerated columns on `profiles`, `agent_runs.status` and `agent_logs.level`. All are mirrored as TypeScript unions in `types/index.ts`.

**`profiles.updated_at` is maintained by a trigger** (`set_updated_at`), so no caller can forget it. Feature 06 does not need to set it manually.

**`lib/posthog-server.ts` is built but has no caller yet** — the events that need it are all in Features 06/10/13. It is in place so those features import one client rather than each rolling their own.

---

## Notes

- **Nav links point at routes that do not exist yet.** `/dashboard`, `/find-jobs`, `/profile`, `/login` all 404 until Features 02+. Expected.
- **Homepage auth redirect is deferred to Feature 02.** Build plan says Get Started / Start for free should go to `/dashboard` when authenticated and `/login` otherwise. There is no auth yet, so both currently link to `/login`. Wire the conditional when auth lands.
- **The app navbar is a second variant, not yet built.** `components/layout/Navbar.tsx` is the marketing header. The authenticated version in `public/dashboard.png` has icons beside each label and an active item in `text-accent` with an underline; it will need `"use client"` for `usePathname`. Add it as a variant of the same file when Feature 14 lands.
- **Testimonial copy is placeholder.** "Tom Wilson, Junior Developer" and the quote come from the design mock. Replace with a real, attributable testimonial before the page is public.
- **Verifying visually without a browser MCP.** Headless Edge is on this machine at `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`. Drive it over CDP (Node 22 has a global `WebSocket`) rather than `--screenshot`: the `--window-size` flag does not set the layout viewport and produces cropped images that look like overflow bugs. Always pass `--disable-extensions` — the default Edge profile has Dark Reader installed, which darkens the render and triggers a spurious React hydration mismatch in the dev overlay.
- **Feature 02 verification — partial.** `npx tsc --noEmit` and `npm run lint` clean. Route protection confirmed: `/dashboard`, `/profile`, `/find-jobs` all return 307 to `/login` when signed out. **Not yet verified** (all blocked on the anon key): a real Google sign-in, a real GitHub sign-in, the token refresh path, and sign-out. `/` and `/login` currently return 500 for the same reason.
- ~~**Sign-out has a route but no UI.**~~ Resolved 2026-07-29 — `components/auth/LogoutButton.tsx` sits in the `/profile` header. The button itself still has never been clicked.
- **Feature 04 verification.** All four tables confirmed present with `relrowsecurity = true` and one `FOR ALL TO authenticated` policy each. FK to `auth.users` proven by inserting a row keyed on the real signed-in user; the `updated_at` trigger fired on update. `jobs.source = 'linkedin'`, `match_score = 150` and an orphan `user_id` were all rejected. Over HTTP, an `anon`-key request returned `permission denied for table profiles` (HTTP 401) on both `GET` and `POST`. All test rows deleted afterwards — the four tables are empty.
- **The `resumes` bucket is private** (`isPublic: false`), created via `create-bucket`. Objects live at `{user_id}/resume.pdf` inside it.
- **Feature 03 verification.** `login_page_viewed`, `oauth_sign_in_started`, `oauth_sign_in_failed` and `user_signed_in` were all confirmed leaving the browser and reaching `us.i.posthog.com`, decoded from the gzipped `/e/` and `/i/v0/e/` request bodies. `user_logged_out` is **unverified** — it needs a real session, so it gets confirmed by the same click that closes out Feature 02. Nothing has been confirmed *inside* the PostHog UI; delivery was verified at the network layer.
- **Feature 01 verification:** `npx tsc --noEmit` and `npm run lint` clean; design tokens and `--font-sans` confirmed resolving in the compiled CSS; no horizontal overflow at 1440px or 430px (`scrollWidth === clientWidth`, zero offending elements); rendering compared against `public/landing-page.png`.
