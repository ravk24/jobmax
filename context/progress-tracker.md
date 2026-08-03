# Progress Tracker

Update this file after every completed feature. Any AI agent reading this should immediately know what is done, what is in progress, and what is next.

---

## Current Status

**Phase:** Phase 5 — Dashboard
**Last completed:** 17 Analytics Charts — PostHog Data (2026-08-03): the three dashboard charts read real events through the PostHog HTTP Query API (`lib/posthog-query.ts`, HogQL — posthog-node is capture-only), verified live against curl'd ground truth. **This was the last feature — the 17-feature build plan is complete.** See § Feature 17.
**In progress:** 06 Profile Save Logic, 07 AI Profile Extraction and 08 Resume PDF Generation — **all three code complete, all three awaiting the same signed-in click-through.** Static checks pass throughout. 02 Auth is open on GitHub sign-in only — the Log out click was exercised live on 2026-08-03 (`POST /api/auth/logout` 303, sign-out worked; the `user_logged_out` capture itself remains unconfirmed in PostHog).
**Next:** no features remain. Outstanding work is verification debt and standing items: the Feature 06/07/08 walkthrough (§ Feature 07 / § Feature 08 matrices), Feature 02's GitHub sign-in, the incomplete-profile banner branch, the `SearchControls` double-click guard, and the ledger in § each feature's review notes. ~~The `/privacy` 404~~ — fixed same day; see § Post-plan — Legal pages.

---

## Progress

### Phase 1 — Foundation

- [x] 01 Homepage
- [~] 02 Auth — Google sign-in verified end to end; GitHub and sign-out untested
- [x] 03 PostHog Initialization — events confirmed arriving at PostHog
- [x] 04 Database Schema — 4 tables + RLS + resumes bucket, live and verified

### Phase 2 — Profile Page

- [x] 05 Profile Page — Full UI (mock data, no save logic — Feature 06 wires it)
- [~] 06 Profile Save Logic — built; awaiting the signed-in click-through
- [~] 07 AI Profile Extraction from Resume — built; awaiting the same click-through as 06
- [~] 08 Resume PDF Generation from Profile — built; PDF rendering and the Gemini PDF round trip verified offline, the app path awaiting the same click-through

### Phase 3 — Find Jobs Page

- [x] 09 Find Jobs Page — Full UI (mock data; filter, sort and pagination already run through the URL)
- [x] 10 Adzuna Job Discovery — verified against the live API with real Gemini scores
- [x] 11 Filter + Sort + Pagination — landed with 10, because 10 is unverifiable without it

### Phase 4 — Job Details Page

- [x] 12 Job Details Page — Full UI, wired to real rows; Company Research card is the empty state and button shell only
- [x] 13 Company Research Agent — verified live: real dossier from 3 pages of manpowergroup.com, degraded path exercised by a real 502, re-run overwrite confirmed

### Phase 5 — Dashboard

- [x] 14 Dashboard Page — Full UI (mock stats/activity/charts; the incomplete-profile banner is real)
- [x] 15 Stats Bar — Real Data (activity/charts still mock; `MOCK_STATS` deleted)
- [x] 16 Recent Activity — Real Data (charts still mock; `MOCK_ACTIVITY` deleted; `jobs.researched_at` added)
- [x] 17 Analytics Charts — PostHog Data (build plan complete; `lib/dashboard-mock.ts` deleted)

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

**Mock data, no persistence.** ~~`MOCK_PROFILE` in `app/profile/page.tsx` is typed as `Profile` so it cannot drift from `db/schema.sql`.~~ **Superseded by Feature 06** — `MOCK_PROFILE` was deleted and the page now reads the real row. Kept here because the typed-mock technique is worth reusing for Features 09, 12 and 14, which all build UI on mock data first.

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

### Feature 06 — Profile Save Logic (2026-07-30)

**`library-docs.md` documented an InsForge API that does not exist.** It taught `insforge.from("jobs").select()`. The query builder hangs off `insforge.database.from(...)` — `InsForgeClient` exposes `readonly database` and `readonly storage`. Feature 06 was the first code to write to the database, so this would have failed on its first call. Corrected in `library-docs.md`; expect it back if that file is ever regenerated from the InsForge boilerplate.

**`Database.from()` returns a real postgrest-js `PostgrestQueryBuilder`,** so `.upsert()`, `.maybeSingle()`, `.range()` and `.or()` are all available even though the InsForge MCP docs list only insert/update/delete/select. `.upsert(row, { onConflict: "id" })` is what makes "create the row on first save" a single call instead of a read-then-branch.

**Two write paths share one row, and neither clobbers the other.** The form save omits `resume_pdf_url`; the upload route sends only `id`, `email` and `resume_pdf_url`. PostgREST's merge-duplicates emits `ON CONFLICT DO UPDATE SET` for the supplied keys only, leaving every other column untouched. **Verified directly against the database** before the UI existed: an upsert carrying `resume_pdf_url`, followed by a second upsert carrying only form fields, left the URL intact. This is the assumption the whole design rests on — re-test it if the InsForge PostgREST layer is ever upgraded.

**Storage `upload()` takes two arguments, not three.** `upload(path, file: File | Blob)`. There is no options object, so no `contentType` and no `upsert` flag — overwrite is implicit PUT semantics. `library-docs.md` taught the three-argument form.

**The `resumes` bucket is private, so `getPublicUrl()` is the wrong call** — it returns a URL that resolves for nobody. `resume_pdf_url` stores the `data.url` the upload response already returns, read back with an authenticated server client. Features 07 and 08 consume it that way.

**Resume upload is an API route, not a Server Action.** Server Action bodies are capped at **1MB** by default and the card advertises 5MB; route handlers have no cap. Raising `serverActions.bodySizeLimit` was rejected because it would apply to every action in the app, including a form save that only ever carries a few KB. `proxy.ts` does not match `/api/*`, so the route calls `getCurrentUser()` itself.

**The upload route upserts rather than updates.** Someone can upload before ever saving the form; an `.update()` against a row that does not exist matches zero rows and drops the URL silently, with no error to catch.

**`ProfileInput` is a second shape, deliberately.** `Profile` is the row shape the page reads and the form holds; `ProfileInput` is `Omit<Profile, id | email | cover_letter_tone | resume_pdf_url | is_complete | created_at | updated_at>` and is the only thing `saveProfile` accepts. A Server Action is a public POST endpoint, so the client can never supply its own id, email or completion flag. `toProfileInput()` in `lib/profile.ts` lists the keys explicitly, so a new column is a compile error until someone decides who owns it.

**`zod` was on the approved list in `code-standards.md` but had never been installed.** Now at v4 — note the v4 API differs from v3 in places (`z.email()` replaces `z.string().email()`), which matters for Features 07/10/13 parsing Gemini JSON.

**Completion stayed derived.** `is_complete` is the one derived value that persists, because it is a real column. The percentage and the missing-field list are still computed by `calculateCompletion()` on every render and stored nowhere, per the closed backlog decision.

**`profile_completed` fires on the false→true transition only,** which is why `saveProfile` reads the existing `is_complete` before upserting. It is captured server-side and does **not** join the `AnalyticsEvent` union — that union types the browser surface. The capture is wrapped in its own try/catch: `createPostHogServer()` throws when the key is unset, and analytics must never fail the write it measures.

**An API route left out of the `proxy.ts` matcher 401s the moment its access token expires — found the hard way.** The first real `POST /api/resume/upload` returned 401 while `/profile` rendered 200 either side of it. `updateSession()` in the proxy is the only thing that refreshes an expired token, and the matcher covered only pages, so protected pages silently refreshed while the API route saw a stale token. The dev log made it unmistakable: the `GET /profile` sitting between the failed and successful upload took `proxy.ts: 456ms` against a usual 8–12ms — a real refresh — after which the retry succeeded.

Fixed by adding `/api/resume/:path*` to the matcher and giving `proxy.ts` a `rejectRequest()` that returns **401 JSON for `/api/*`** instead of a 307 to `/login` — a redirect answers a `fetch()` with HTML and the client reports a JSON parse error instead of the real problem. **`/api/agent/*` will need the same treatment in Features 10 and 13.** `/api/auth/*` stays out of the matcher: those routes establish the session and must be reachable without one.

**`type="url"` silently blocked the entire form.** Two saves appeared to do nothing — and the server log showed no `POST` at all, so the failure was in the browser before any request. `linkedin_url` and `portfolio_url` render as `type="url"`, which requires an absolute URL; typing `linkedin.com/in/you` makes the browser refuse to submit and fire **no submit event**, so the `onSubmit` handler never runs. No request, no error, no clue. Both columns are plain `text` with no constraint and the server accepts any string, so the browser was enforcing a rule the application does not have. The form now carries `noValidate` — validation belongs to the server, which names the field it rejected. **Watch for this on any future form using `type="url"`, `type="email"`, `required` or `pattern`:** native validation blocks submission silently, and the tooltip is easy to miss on a long page.

**"No row yet" and "the read failed" must never collapse into one answer.** Both looked identical to a caller returning `null`, and the caller's natural response — render an empty form — turns a transient database blip into silent data loss the moment the user saves over their own profile. `readProfile()` (formerly `getProfileRow`) now returns a discriminated `{ status: "found" | "empty" | "error" }`; a row that exists but fails to parse counts as `error`, not `empty`. `/profile` renders `ProfileLoadError` **instead of** the form on error — never alongside it, since an empty form is exactly the invitation that causes the loss. This was not hypothetical: the `invalid input syntax for type uuid: "undefined"` window did the first half of it, and only an already-empty row stopped it mattering.

**A Server Action returning its errors is not the same as the call not throwing.** `saveProfile` never throws, but the *call* can reject — a dropped connection, a restarted dev server, a 500 before the action body runs. `handleSubmit` originally awaited it bare, so a rejection meant `setStatus` never ran and the button sat disabled on "Saving…" with nothing to explain it. Found when a save appeared to do nothing and the server log showed no `POST` at all. Every Server Action call from a client component needs its own try/catch on top of the action's internal one.

**Reads are validated too, and the two postures are deliberately opposite.** `lib/profile-schema.ts` holds both schemas. Writes are **strict** — input arrives from a public POST endpoint and a bad enum would otherwise surface as an opaque Postgres CHECK error. Reads are **lenient and self-repairing**: `from()` is typed `PostgrestQueryBuilder<any, …>`, so a row arrives as `any` and annotating the return type would be an unchecked cast over data the database does not constrain. Every field in `profileRowSchema` carries a `.catch()` fallback, because a schema that *rejects* is dangerous here — falling back to a blank form would silently overwrite the real row on the next save. `id` and `email` are overwritten from the session rather than trusted, as they are the two values a blank fallback would corrupt.

**Roles written before Feature 05 have no `id`,** and React keys plus every element id in `WorkExperienceCard` derive from it. The read schema backfills `legacy-role-{index}` — positional, so it is stable across renders. `crypto.randomUUID()` would differ on every render and break hydration, the same trap Feature 05 hit.

**Validation limits are documented, not incidental.** `MAX_SHORT_TEXT` 500, `MAX_RESPONSIBILITIES` 5000, `MAX_TAG` 100, `MAX_TAGS` 50, `MAX_YEARS_EXPERIENCE` 80, all in `lib/profile-schema.ts`. Postgres `text` is unbounded, so these are the only limits that exist. They are sized to stop a megabyte of junk, not to police how someone writes about their job — an earlier pass capped responsibilities at 2000, which a normal three-role history could plausibly exceed.

**A validation failure names the field.** `describeValidationIssue()` turns the first zod issue into copy like "Role 2 responsibilities is too long." The first pass returned "Some fields are not valid.", which is useless when the only way to trigger it is a length cap nobody can see.

**A failed API refresh no longer signs the user out.** `rejectApiRequest()` returns 401 JSON **without** `clearAuthCookies()`. A refresh can fail for reasons unrelated to the session being dead — an InsForge blip, a rotation race — and destroying the whole session because one background upload picked a bad moment is wildly disproportionate. The session survives and the next page navigation decides its fate, where a redirect to `/login` is the honest answer. The page path still clears, unchanged.

**"Click to upload" now clicks.** The copy had promised it since Feature 05 while only the Select Resume button opened the picker. The dropzone surface carries `onClick` with `cursor-pointer` — and deliberately **no** `role`/`tabIndex`, since the real button inside it already serves keyboard and screen reader users; adding them would nest one button inside another. The button and the resume link both `stopPropagation()`, or clicking either would also open the picker.

**The uploaded resume is a link, and it has to be a signed one.** `resume_pdf_url` points into a private bucket, and the browser holds no InsForge credentials — `client_type=server` deliberately keeps the session on our own origin — so a plain anchor to it fails. `/profile` mints a `createSignedUrl()` per render when `resume_pdf_url` is set (1h TTL, credential-free, authorised at mint time) and `ResumeUpload` renders the filename as an accent link opening in a new tab. `router.refresh()` runs after a successful upload: `revalidatePath()` in a route handler invalidates the cache but does not re-render a page that is already open, so without it a just-uploaded resume has no link until a manual reload.

**The link text is the storage key, not the original filename.** Immediately after upload it reads the real name from client state (`CV_Ravi_Kant.pdf`); after a reload it reads `resume.pdf`, because the object is always stored at `{user_id}/resume.pdf` and the original filename is persisted nowhere. Add a column if that ever matters.

**Verified:** `npx tsc --noEmit`, `npm run lint` and `npm run build` all clean, with `/api/resume/upload` registered in the build output. Database-side, before any UI existed: the upsert column-preservation behaviour above, and the `profiles_set_updated_at` trigger advancing `updated_at` with no caller setting it.

Through the running app, signed in: the **upload-before-first-save** path creates the row via the route's upsert rather than dropping the URL, and `resume_pdf_url` holds the private-bucket object URL (`/api/storage/buckets/resumes/objects/{user_id}%2Fresume.pdf?v=…`) exactly as intended.

**Still unverified.** A form save carrying real data, reload persistence, the banner recalculating, `resume_pdf_url` surviving a subsequent form save (the assumption the two-write-path design rests on — proven at the SQL level, not yet through the app), PDF and 5MB rejection, and `profile_completed` reaching PostHog.

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

### Feature 07 — AI Profile Extraction from Resume (built 2026-07-31, awaiting click-through)

**Extraction writes nothing to the database.** It populates client state; the user reviews and presses Save Profile, which stays the single write path. So there is no `revalidatePath` and no `router.refresh()` after an extraction — nothing on the server changed.

**The wiring was the hard part, not the model call.** `ProfileForm` seeds its state once at mount and `ResumeUpload` is a sibling with no channel to it, so an extraction had nowhere to land. `components/profile/ProfileEditor.tsx` now sits between the page and both of them holding **one** piece of state: the extraction result. It deliberately does not own the profile — lifting that would make `ProfileForm` controlled and force the two raw-text mirrors (`jobTitlesText`, `locationsText`) either up into a component that knows nothing about comma parsing, or into exactly the staleness bug they were added to fix. Cost as built: one prop and about ten lines.

**`ProfileEditor` returns a fragment, not a `<div>`.** The page stacks sections with `flex flex-col gap-6`; a wrapper element makes the resume card and the form a single flex child and silently eats the 24px between them.

**The merge is applied during render, not in an effect.** An effect runs after the browser has painted the fields still empty. The guard compares object identity against an `appliedExtraction` state, so a second extraction re-applies — safe, because the merge only ever fills blanks.

**An extraction that found no education must not create one.** `normalize()` always returns education as a fully-formed object, because that is the shape the form needs — so a resume with no education section still produces `{degree:"",field:"",institution:"",graduationYear:0}`. Merging that turned a null column into an empty object that the next save persisted, and that reads as "has education" to everything downstream. `mergeEducation` now returns the current value unless the extracted object has real content. Caught in review, fixed before any of it reached the database.

**The skills cap is enforced, not just requested.** The prompt asks for the 20 most relevant; `normalize()` now slices to the same number rather than to `MAX_TAGS` (50). A model that ignores the instruction would otherwise hand the user a forty-chip list that `TagInput` can only prune one at a time. Deliberately not a schema `maxItems` — a hard cap there fails the whole parse and loses an otherwise good reading. Industries keep the wider cap; a resume implies a handful at most.

**Only empty fields are filled, and two rules in that merge are opposites.** `years_experience` uses `isFilled`, so a user's typed `0` survives — "0 years" is an answer. `graduationYear` treats `0` as empty, because that is what `blankProfile` and `setEducation` seed and what the input renders as blank. A generic loop over keys gets one of the two wrong, which is why `mergeExtraction` is written field by field. `education` merges per key (four independent scalars, and `setEducation` backfills all four the moment one is touched); `work_experience` and the tag lists are all-or-nothing.

**Only 12 factual fields are extracted.** `ProfileExtraction` is a `Pick` from `ProfileInput` that omits the five job-preference fields, so writing one is a compile error. That also keeps the merge away from `job_titles_seeking` and `preferred_locations` — the two fields whose text mirrors could go stale.

#### What the first live Gemini calls taught us

**`gemini-3.6-flash` is a thinking model, and thought tokens are drawn from `max_output_tokens`.** At the documented 800 it spent **767 thought tokens and emitted 14** — 32 characters of JSON that parsed as nothing. With `thinking_level: "minimal"`: 0 thought tokens, 399 output tokens, a complete and correct reading. Reading fields off a resume is transcription, not reasoning. **This will bite Features 08, 10 and 13 the same way** — the symptom is not a short answer, it is unparseable JSON and a lost call.

**`max_output_tokens` raised 800 → 1200.** A two-role resume costs 399; three roles with twenty skills lands near the old ceiling, and overrunning it loses everything rather than truncating one field. Output is billed as generated, so the headroom is free.

**`temperature` does not exist on the interactions API.** `GenerationConfig_2` declares ten fields and that is not one of them; it survives only on the legacy `models.generateContent` config. The project's "0.3 for extraction" rule is unimplementable as written. `seed` replaces it and was verified to give byte-identical output across runs. `library-docs.md` corrected.

**The default draft-2020-12 JSON Schema is accepted** — `$schema`, `anyOf` and `additionalProperties` included. The anticipated `{ target: "openapi-3.0" }` fallback was not needed; both dialects were probed and both work.

**`z.toJSONSchema()` throws on `.transform()`**, so none of `profile-schema.ts`'s composed helpers can be reused — `nullableText` and `tagList` both end in one. `.catch()` converts but only to a `default` *hint*, and it swallows exactly the model misbehaviour worth logging. The extraction schema is fresh, transform-free, and tolerant via `.nullish()`; the caps are imported from `profile-schema.ts` so extraction cannot produce a value the save later rejects.

**`output_text` is `string | undefined`** — guarded, because `JSON.parse(undefined)` throws.

#### Deliberate calls worth not re-litigating

- **Dates are normalised after parsing, not constrained in the schema.** `<input type="month">` renders **blank** for anything that is not `YYYY-MM`, so a stray "Jan 2021" would be invisible in the form yet still present in state and still saved. A `.regex()` in the schema would instead fail the whole parse and throw away a good reading over one bad date.
- **`education.degree` is `z.enum(DEGREE_OPTIONS)`.** A free-string degree outside the Select's options leaves Radix with no matching item — field renders empty while state holds garbage, and the garbage persists. `DEGREE_OPTIONS` moved from `ProfileForm` to `lib/profile.ts` so one list both populates the dropdown and constrains the model.
- **Roles carry no `id` from the model**; the server mints `crypto.randomUUID()` per role after validation. React keys and every element id in `WorkExperienceCard` hang off it, and a model cannot mint stable identities.
- **`maxItems` is treated as a request.** Skills and roles are sliced after parsing — an over-long list would otherwise surface as a save rejected for roles the user never entered.
- **A work-experience array of entirely blank roles counts as empty.** Otherwise "Add role" then "Extract" is a silent no-op with nothing to explain it. **Both sides are tested** — an extraction that found no work history still arrives as an array, so replacing unconditionally deleted that same blank card instead. Fixed in review.
- **The Extract button is `variant="outline"`, not accent.** Built as accent, stepped down in review: the resume card's primary belongs to Generate Resume from Profile, which comes from the design mock. A control added later inherits the card's hierarchy rather than redefining it.
- **`extractProfileFromResume` returns a discriminated union**, not `{success, error}`. Five outcomes map to five status codes and five sentences, and user-facing copy belongs to the route, not to `lib/`. Same reasoning as `ProfileReadResult`.
- **No PostHog event.** The nine in `code-standards.md` are still the only nine.
- `RESUME_BUCKET` and `resumeObjectKey()` lifted into `lib/profile.ts` — three call sites now address the same object through one definition.

#### Not yet verified

**No authenticated extraction has been run.** Unauthenticated `POST /api/resume/extract` returns `401 {"success":false,"error":"You are not signed in."}` (from the proxy, since `/api/resume/:path*` is matched), and `tsc`/`lint` are clean. Everything past the sign-in boundary — `storage.download()`, which still has no other caller in the app; the PDF `{type:"document"}` path, probed only with text; the 429 narrowing; and the merge behaviour in the browser — needs the click-through.

---

### Feature 08 — Resume PDF Generation from Profile (built 2026-07-31)

**Generating overwrites the uploaded resume, and now says so before it does.** The generated PDF goes to `resumes/{user_id}/resume.pdf` — the same key an uploaded resume occupies, per build-plan.md and the one-active-resume-per-user rule in project-overview.md. That makes Generate a destructive action on a file the user may not have a copy of, so the button **arms on the first click** and fires on the second, with the warning in the strip copy rather than in the button label. No dialog: the project has no dialog component and a destructive action that announces itself in place is as clear as a modal without the dependency.

The same confirm copy carries the second thing the user cannot otherwise know: **generation reads the last saved profile, not what is typed in the form.** The route takes no body and calls `readProfile()` itself, exactly as `/api/resume/extract` does — a server route cannot see unsaved client state, and pretending otherwise would silently produce a resume missing whatever was just typed.

**Gemini writes prose; it never touches a fact.** It returns `{ summary, roles: [{ id, bullets }] }` and nothing else. Name, contact details, links, company names, job titles, dates, skills and education are all copied from the profile row into the PDF. The alternative — one call returning the whole document body — was rejected because a schema-constrained decoder fills slots, and an invented institution or date lands in a file the user sends to employers. Same discipline as Feature 07's "extract only what is printed".

**Bullets are keyed by `WorkExperience.id`, not by position.** The model echoes each id back and `toProse()` drops any id that is not on the profile. A reordered or hallucinated role therefore lands nowhere instead of attaching one role's achievements to another.

**`canGenerateResume()` is deliberately looser than `calculateCompletion()`.** It requires `full_name` plus either a role with content or a non-empty skills list. Tying generation to `is_complete` would refuse a perfectly usable partial profile; requiring nothing would spend a rate-limited call to produce an empty page and then overwrite a real resume with it. It lives in `lib/profile.ts` beside `calculateCompletion()`, and `hasRoleContent()` was exported from that file to serve it.

**A 429 refuses; every other model failure degrades and admits it.** These are opposite responses on purpose. A 429 is transient, so "try again in a moment" is real advice and nothing is written. Every other failure is *deterministic* here — the seed is fixed, so the same profile fails the same way forever — and refusing would leave that user permanently unable to generate anything. Those fall back to the candidate's own `responsibilities` text, rendered as written. **The route reports which of the two happened** (`data.polished`), and the "plain" message renders in `text-error` rather than as a success: a document whose wording is the user's own, delivered silently under a button labelled Generate, is less than what was promised — and it has already overwritten what they had.

**`thinking_level: "minimal"` and `max_output_tokens: 2000`, against what library-docs.md prescribed.** The old row said default thinking at 1000. On the one measurement this project has, that pairing spends the budget on thought tokens and returns nothing parseable (Feature 07: 767 thought, 14 emitted, at 800). The instinct that writing benefits from deliberation is not wrong in general, but every fact is supplied here and the task is rewriting the user's own sentences. `library-docs.md` has been corrected rather than deviated from silently.

**`isGeminiRateLimited()` moved into `lib/gemini.ts`.** It was private to `lib/resume-extraction.ts`; Feature 08 is its second caller. It is a property of the API, not of any one call site, and a second copy would drift. `lib/resume-extraction.ts` now imports it.

**`renderToBuffer` returns a `Buffer`, and `storage.upload()` will not take one** — this is the third time an example in `library-docs.md` taught an InsForge storage call that does not exist, after the three-argument `upload()` in Feature 06 and `insforge.from()` in Feature 06. The documented `upload(path, buffer, { contentType, upsert: true })` is wrong in all three of its parts. Corrected before the call site was written.

Two type-level traps behind it, both caught by `tsc`:

- **`Buffer` is not a valid `BlobPart`.** `Buffer` is `Uint8Array<ArrayBufferLike>` and `BlobPart` requires `ArrayBufferView<ArrayBuffer>`; `SharedArrayBuffer` is in `ArrayBufferLike` and is not a valid backing store. `new File([new Uint8Array(buffer)], …)` copies into a plain `ArrayBuffer` and satisfies it with no assertion.
- **`renderToBuffer` takes `ReactElement<DocumentProps>`, which a JSX element does not satisfy.** `<ResumeDocument … />` types as `JSX.Element` and needs a cast. `ResumeDocument({ profile, prose })` — called as a function, with an annotated return type — type-checks cleanly and keeps `lib/resume-generation.ts` a `.ts` file.

**`lib/resume-pdf.tsx` is the one sanctioned exception to the no-hardcoded-hex rule.** A PDF resolves no CSS variables, so `ui-tokens.md` cannot reach it. Three token values are copied in with a comment saying they are copies and will not update themselves. Only the CSS properties `library-docs.md` lists are used — anything else is silently ignored by the renderer, which reads as a layout bug with no error anywhere. Borders are absent for that reason; separation comes from margin and weight.

**Single-page is enforced upstream, not by the renderer.** `@react-pdf/renderer` paginates whatever it is given. `MAX_SUMMARY_CHARS` (400), `MAX_BULLETS_PER_ROLE` (4), `MAX_BULLET_CHARS` (160) and a 20-skill cap live in `lib/resume-pdf.tsx` as the page budget: the prompt asks the model to fit them and the document re-applies them to whatever comes back, so ignoring the instruction cannot overflow the page. The schema's own `maxLength` is set at double the display cap on purpose — those values constrain decoding, and setting them at the exact limit makes the model stop mid-word. `truncate()` does the real cut, where a clean ellipsis is possible.

**No PostHog event.** The nine in `code-standards.md` are still the only nine.

#### Verified offline, without signing in

Rendered three documents through `renderToBuffer` against a hand-built `Profile` and inspected the bytes:

- **All three are exactly one page** (`/Count 1`), including the fullest case — three roles, ten skills, education, summary, links.
- **The per-role degrade path works.** A role the model returned no bullets for printed its own `responsibilities` text as a paragraph while its siblings kept their bullets.
- **The full degrade path renders** (no summary, every role falling back), as does the thinnest profile that passes the gate — name and skills only, no contact line, no history, no education.
- `canGenerateResume()` returns the right answer for all five cases: full profile, no name, name only, name + skills without roles, and name + a single blank role.

Then **sent the generated PDF back to Gemini** and had it transcribe the page. Every line came back correct — section order, `Mar 2022 — Present`, `Jun 2019 — Feb 2022`, the degraded role as a paragraph. This incidentally closes the biggest hole left by Feature 07: **the `{ type: "document" }` path has now carried a real PDF**, not just the text-only probe. Worth knowing — the call bills the document as **image** modality (532 tokens for one page), so Gemini rasterises rather than reading a text layer. 0 thought tokens at `thinking_level: "minimal"`, confirming the setting behaves as it did in Feature 07.

`npx tsc --noEmit`, `npm run lint` and `npm run build` all clean, with `/api/resume/generate` in the build output. **`serverExternalPackages` was not needed** — Turbopack bundled `@react-pdf/renderer` without complaint, so `next.config.ts` is untouched.

#### Review follow-ups, same day

Three gaps found in review and closed.

**There was no way to download the resume, and the way there was went around our own auth.** `/profile` minted a one-hour `createSignedUrl()` per render and rendered the filename as a link to it. That worked, but it was a network round trip on every page render, it handed out a capability that outlived the visit, and it read as a filename rather than an action — so the feature was effectively undiscoverable.

Replaced by **`GET /api/resume/download`**: it re-reads the session, derives the object key **from the session rather than from a parameter** — so there is no path a caller can supply and no other user's resume to ask for — `download()`s the object with a server client, and streams it back with `Content-Disposition: attachment` and `Cache-Control: no-store` (the object changes, the URL never does). The client is a plain `<a href download>` inside `<Button asChild>`: a same-origin navigation carries the httpOnly cookie by itself, which is both simpler than a `fetch` and the only version that obeys `code-standards.md`'s rule that client components never `fetch()` a read.

`getResumeSignedUrl()` is deleted, along with the `resumeHref` prop threaded through `ProfileEditor`. **One authenticated path to the bytes, not two.**

**`lib/resume-storage.ts` is now the single write path.** The upload route and generation each carried their own copy of upload-then-upsert. They write the same object and the same column, and the failure handling between the steps is exactly what drifts when it is duplicated. `replaceStoredResume({ userId, email, file })` is the only caller of `remove`/`upload`/the `resume_pdf_url` upsert now.

**The previous object is removed before the new one is written**, as asked. Worth being clear about what that does and does not buy, because the honest answer is uncomfortable: the SDK documents standard PUT semantics, so writing to an existing key already replaced the object — both writers use the same key, so there were never orphans to collect. What the delete does add is that the stored object cannot outlive the row pointing at it. What it costs is real: an atomic overwrite becomes two steps, and a failure between them leaves the user with no resume at all.

That window is closed rather than ignored:

- The **delete is best-effort**. There is nothing to remove on a first upload, and that is the ordinary case, not an error — a failure is logged and the upload proceeds, since it replaces the key either way.
- **A failed upload after a successful delete clears `resume_pdf_url` to null.** The old object is genuinely gone; leaving the URL would render a link that 404s and let extraction and generation read a file that is not there. This is the case that made the shared module worth writing — it is easy to get right once and easy to miss in the second copy.

`resume_pdf_url` is therefore written on exactly three outcomes now: the URL on a successful upload, the URL on a successful generation, and `null` when a replacement destroyed the old object without landing a new one.

#### Second review pass — the delete-first window, closed properly

The first pass at delete-first closed the database side and left the UI and the copy behind. Three findings, one root cause.

**The card kept advertising a file that was gone.** Neither `upload()` nor `generate()` called `router.refresh()` on its failure path, so after a replacement deleted the old object and failed, the server had correctly nulled `resume_pdf_url` while the client still held its mount-time prop — **Extract from Resume and Download stayed on screen**, pointing at nothing. `router.refresh()` now runs in `finally` on both, unconditionally.

**That alone was not enough, and the reason is the more useful lesson.** `currentResume` was `uploadedName ?? (resumeUrl ? "resume.pdf" : null)` — client state ranked *above* the server's answer, so a filename left over from an earlier successful upload kept the buttons visible no matter how many times the page refreshed. Inverted to `resumeUrl ? (uploadedName ?? "resume.pdf") : null`: the server decides whether a resume exists, and `uploadedName` only makes the label nicer than the storage key. The cost is that the buttons appear a beat later on a first upload, once the refresh lands — correct, and worth it.

**"Could not upload your resume." was a lie when the old one had just been deleted.** It reads as "nothing happened". `ResumeWriteResult` and `GenerationOutcome` now carry `previousResumeRemoved`, and both routes say so plainly when it is true. The user may have no other copy of that file; they need to know immediately, not the next time they go looking for it.

**Download is disabled while busy**, having deliberately not been. That was right when upload was an atomic overwrite and wrong the moment deletion came first: for the length of an upload or generation there is genuinely nothing at the other end of the href. It swaps to a real disabled `<button>` rather than an anchor styled to look disabled — an anchor has no `disabled` attribute, and `pointer-events-none` lies to assistive technology.

**A failed first upload no longer creates an empty profile row.** The cleanup path uses `.update()` where the write path uses `.upsert()` — deliberately opposite. Clearing is only meaningful for a row that already holds a URL, so matching zero rows is the correct outcome rather than something to repair.

Also closed: the download route answers a 404 with `text/plain` rather than the JSON envelope (nothing parses it — a person reads it, because the route is reached by navigation); an armed Generate confirm resets when an upload or extraction starts, since it describes a specific stored file; `formatDateRange` renders "Until Jun 2023" for a role with an end and no start, which previously printed a bare date that read as the start; `CompletionIndicator` carries one `aria-live="polite"` over the whole banner instead of `role="status"` on the percentage alone, so the heading change is what gets announced; and `replaceStoredResume` builds one InsForge client instead of two.

#### Not yet verified

**Nothing has run inside the app.** Specifically untested: the generate route end to end, `canGenerateResume` against a real database row, the upload of a generated `File` to InsForge Storage, `resume_pdf_url` surviving a subsequent form save now that a **third** writer touches that column, the two-step confirm in a browser, and the 429 path. The Gemini prose call has never been made — only the transcription call above, which used a different prompt and no `response_format`.

**The review follow-ups are equally unrun**, and two of them touch paths that previously worked: `remove()` has **no other caller anywhere in the app** and has never executed, and the download route is the second-ever caller of `storage.download()`. Upload and extraction both regressed in scope here — re-test them, not just the new button.

---

### Feature 09 — Find Jobs Page UI (2026-07-31)

**Filter, sort and pagination live in the URL, not in component state.** `/find-jobs?q=&match=&sort=&page=` — the page is a Server Component that reads `await searchParams`, and `selectJobs()` in `lib/jobs.ts` was meant to be the **one seam Feature 11 replaces**: its body becomes an InsForge `.or().order().range()` query and `lib/jobs-mock.ts` is deleted, with no component changes. **Corrected 2026-08-02 — both halves of that were wrong.** The function had to move to a server-only `lib/jobs-query.ts` (a Client Component imports this file), and `page.tsx`, `JobsTable.tsx` and the shape of `JobSelection` all changed. See § Feature 10. Client-side filtering would have been thrown away, and inert controls would have shipped unverified — build-plan.md's "no logic yet" is satisfied by there being no *data* logic, not by the controls being dead.

**The design's five columns win over build-plan.md's six.** Both `build-plan.md` and `project-overview.md` list a SOURCE badge column, and `context/design/find-jobs.png` does not have one. URL import is explicitly out of scope, so `jobs.source` is `'search'` on every row that will ever exist — the column would be constant-valued decoration. The **"Jobs by Adzuna" credit** `project-overview.md` requires instead sits in the table footer beside the results count, so the attribution obligation is met. Same reasoning shape as Feature 01's dashboard-cards decision: the design settles what the two spec files disagree about.

**20 rows per page, not the mock's 6.** `JOBS_PER_PAGE` in `lib/jobs.ts`, per `build-plan.md` Feature 11 and `project-overview.md`. "Showing 1 to 6 of 24" in the design is an illustrative crop. The mock set is 24 rows precisely so page 2 exists and the pager is real.

**Match bar colours still come from `matchScoreBarClass()`.** The design paints 85% and 88% blue; `ui-rules.md` says ≥80 is green. Feature 01 already settled this — the rule wins, the mock's pixels do not. Do not re-litigate it a third time.

**Rows are `<Link>` elements in a CSS grid, not a `<table>`.** The whole row navigates, and a `<tr>` cannot be a link without a stretched-link hack. The grid is `JobsTablePreview`'s, which `ui-registry.md` already named as the reference pattern — stepped up from `text-xs` to the app body scale.

**`/find-jobs/{id}` 404s until Feature 12**, exactly as the nav links did through Phase 1.

**An unscored job is a low match, not an invisible one.** `jobs.match_score` is nullable. `matchesBand()` treats null as 0 so it appears under Low Match rather than being filtered out of every band, and the score sort ranks it with `?? -1` so it sits below a genuine zero. The cell reads "Not scored", not "0%".

**Trimming on one side of a round trip is an infinite loop — found in the browser, not in review.** `parseJobQuery()` trims `q`, and `JobFilters`' debounce originally compared the raw input against it. Type a trailing space and `"react "` came back as `"react"`, which never equals the input's value, so the effect re-fired `router.replace` every 300ms forever. Fixed by trimming on the client too — compare trimmed, navigate trimmed. **Any future URL-state control needs the same invariant: `parse(href(x))` must equal `x`, or the effect that syncs them never settles.**

**`JobFilters` takes the parsed query as a prop rather than calling `useSearchParams()`.** The server has already parsed and defaulted the params; reading them again in the client would be a second parser on the same input, and would opt the tree out of static rendering to re-derive a value that was already passed down.

**Every filter change resets to page 1.** Narrowing the result set while on page 2 otherwise lands on a page that no longer exists. `selectJobs()` also clamps a page past the end rather than rendering an empty table, since the URL is hand-editable.

**Two empty states, saying different things.** "No jobs yet" (nothing has ever been found) and "No jobs match these filters" (+ a Clear filters button). `hasAnyJobs` is a prop precisely so the two cannot collapse into one message. Both use the centred `px-6 py-12` treatment `ProfileLoadError` established, in `text-text-muted` per `ui-rules.md § Empty States` — these are empty, not failed.

**The Find Jobs button is wired to a placeholder, and it is marked as one.** It refuses an empty field and otherwise reveals the design's banner copy. Feature 10 replaces the handler body with `POST /api/agent/find`; the comment in `SearchControls.tsx` says so. **`/api/agent/:path*` must be added to the `proxy.ts` matcher then** — see § Feature 06 for what happens when it is not.

**No new PostHog events and no new dependencies.** The nine in `code-standards.md` are still nine; `job_search_started` belongs to Feature 10. The pager is `<Link>`s rather than a shadcn pagination component.

**Verified in the browser, signed in.** `tsc`, `lint` and `build` clean with `/find-jobs` in the output. Signed out returns 307 to `/login`. Page 1 shows 20 of 24 with Previous disabled; page 2 shows "21 to 24" with Next disabled; the null-salary row renders "—" and the unscored row "Not scored"; green/blue/orange bars all appear. Typing in the filter box updates `?q=` and narrows the rows without losing input focus, High Match combines with it, `?q=zzz` reaches the filtered empty state, and both banner states render. **No horizontal overflow at 1897, 1024 or 430** (`scrollWidth === clientWidth`), with the table scrolling inside its own card at 430.

**`resize_window` in the Chrome extension does not resize a maximised window** — it reports success and the layout viewport stays put, which reads as a page that ignores media queries. Breakpoints were checked by loading `/find-jobs` into a same-origin `<iframe>` of a fixed width instead: media queries resolve against the iframe, the session cookie comes along, and `contentDocument` gives the real `scrollWidth`/`clientWidth`. Cheaper than the headless-Edge-over-CDP route in § Notes when the page needs a session.

---

### Feature 10 — Adzuna Job Discovery, with Feature 11 folded in (2026-08-02)

**Feature 11 shipped with Feature 10, not after it.** Built to the letter, Feature 10 writes to a table nothing reads: `/find-jobs` still rendered `MOCK_JOBS`, so a successful search would have shown "Found 10 jobs…" above 23 fake rows, verifiable only by SQL. `code-standards.md` says a feature that cannot be verified immediately is incomplete. The read seam was the cheaper half of the two, and folding it in is what made every check below possible.

**`selectJobs()` moved to a new `lib/jobs-query.ts` rather than staying in `lib/jobs.ts`.** `JobFilters` is a Client Component importing `jobsHref()` and the option lists, so putting `createInsforgeServer` and zod in `lib/jobs.ts` would have shipped both to the browser. Same split as `lib/profile.ts` / `lib/profile-schema.ts`, for the same reason. **§ Feature 09's claim of "one seam" and "no component changes" was wrong on both counts** — `page.tsx`, `JobsTable.tsx` and the shape of `JobSelection` all changed.

**The list query selects six columns, not `*`.** `JobListItem` is a `Pick` of `Job`. A list page has no use for `company_research`, and pulling twenty jsonb dossiers to render six cells is bytes nobody reads. It also removes the need to validate a nested dossier shape Feature 13 has not written yet.

**`redirect_url` is not a stable identity — verified against the live API.** Two identical searches a second apart return the same listing with a different `se=` tracking token, so a dedupe keyed on the full URL matches nothing and **every repeat search would have duplicated every row.** The path without the query string is stable and carries the Adzuna ad id. `source_url` now holds that canonical form and `external_apply_url` holds the full tracked link — one is the listing's identity, the other is what the user clicks. **Any future dedupe on a third-party URL needs this checked first.**

**`where=Remote` returns zero results**, and "Remote" is the first word of the design's own placeholder. Adzuna has no remote filter on this endpoint and `where` matches place names only. `toAdzunaWhere()` drops the word, so "Remote" becomes a country-wide search and "Remote, New York" still searches New York.

**`contract_type` is not our `job_type`.** `library-docs.md` prescribed `job.contract_type || "fulltime"`, which writes `"permanent"` — a value the `jobs_job_type` CHECK rejects, failing the whole insert. Adzuna splits the two axes: `contract_type` is permanent/contract, `contract_time` is full_time/part_time, and both are frequently absent. `toJobType()` maps them. **library-docs.md § Adzuna is now corrected.**

**PostgREST answers an out-of-range offset with 416, not an empty page.** The first implementation fetched the requested page and clamped afterwards, so `?page=99` rendered the read-failure state — telling the user their jobs could not be loaded when the only problem was a number they typed. The count now comes first and the page is clamped before any rows are asked for.

**One batched Gemini call scores all ten jobs, not ten calls.** The free tier is rate-limited per minute, and ten calls fired back to back is the shape most likely to hit it — on the one action the user is watching. Scores are keyed back by the `index` the model was given, never by position in its reply: a model that skips or reorders would otherwise hand every job after it someone else's score, which is wrong in a way that looks entirely plausible.

**A scoring failure is not a search failure.** Verified by breaking `GEMINI_API_KEY`: ten listings still saved with `match_score = null`, the banner said so, and Feature 09's existing null handling caught them — "Not scored" in the cell, Low Match in the band. Throwing away listings that already cost a network call because the scorer was busy would be the worse trade.

**The empty-state pair became a trio.** `JobsTable` now renders a read failure as well, using the `ProfileLoadError` treatment (`bg-accent-muted` medallion, `AlertCircle` in `text-error`). "No jobs yet" while the database is unreachable tells the user their jobs are gone and invites them to fix something that is not their problem.

**`.or()` can only be called once per query — caught in review, not in the first pass of testing.** Two calls send two `or=` params and PostgREST rejects the request outright. The text search worked alone, the Low Match band worked alone, and **only the combination failed** — so testing each filter independently proved nothing about the pair. The two OR groups are now distributed into one nested `or=(and(…),and(…),…)` expression. **The lesson: filters that are independent in the UI are not independent in the query — exercise them together.** Recorded in `library-docs.md § DB Queries`.

**Search text is quoted, not stripped.** A comma in `q` splits PostgREST's `or()` expression and silently changes the query. Wrapping the value in double quotes is PostgREST's own answer and keeps commas, brackets, dots and ampersands searchable — confirmed against a real row titled "Frontend Engineer, Fauna". Only `% _ *` and backslash are dropped: they are LIKE wildcards and LIKE's escape character, and PostgREST gives no way to override the escape, so passing a backslash through makes `a\b` quietly search for `ab`.

**`discoverJobs()` owns the `agent_runs` record**, rather than taking a `runId` as `code-standards.md § Agent Code` sketches. Only the code that can fail knows when to mark a run `failed`, and a route handler writing `agent_runs` is a route holding business logic. `logAgentError()` also carries a `userId` the sketch omits — `agent_logs.user_id` is NOT NULL and its RLS policy compares it to `auth.uid()`.

**The scoring token budget is derived from the batch, not fixed at a number that assumes ten.** `outputTokenBudget(jobs.length)` — `300` per job with a `600` floor, which reproduces the previous 3000 exactly at ten jobs. A comment saying "raise this if you raise `results_per_page`" is not a guard, and overrunning does not shorten a reason: it returns unparseable JSON and loses every score in the call.

**`discoverJobs()` opens its try before the profile read, not after the run is created.** `readProfile()` and `createInsforgeServer()` both throw rather than returning an error, so the original shape let a failure escape the agent function entirely — the route caught it, but no `agent_runs` row was ever marked `failed`. `runId` is now declared outside the try so the catch can tell "failed before a run existed" from "failed during one".

**Location is now optional.** `library-docs.md` forbids sending an empty `where`, so a blank location is a country-wide search rather than a refusal. Only the job title is required.

**Verified in the browser, signed in.** `tsc`, `lint` and `build` clean, `/api/agent/find` in the output. A real search returned 10 jobs in ~14s with a spread of real scores (80/75/55/45/40), real salaries including the `salary_min === salary_max` single-value case, and the button disabled reading "Searching…" throughout. An identical repeat search returned `saved: 0`. High (5) + Low (15) = 20 = total, with all ten unscored rows landing in Low. `?page=99` clamps, every filter **combined with every other** (`q`+high, `q`+low, `q`+low+oldest, a comma-bearing `q`+band) returns the right rows, `?sort=banana&match=nope&page=abc` falls back to the default view, both empty states and the Clear filters button render, a broken `ADZUNA_APP_KEY` returns 502 with the run marked `failed`, and a cookie-less POST returns 401. Console clean.

**Both upstream calls are bounded** — Adzuna at 15s via `AbortSignal.timeout()`, Gemini at 60s via the SDK's second-argument `timeout` option (`interactions.create(params, { timeout })`, which is `GoogleGenAIRequestOptions`). A search is a blocking POST the user watches with the button disabled, so an upstream that never answers has to become a failure rather than a hang. The Gemini ceiling is deliberately generous: overshooting it throws away listings Adzuna has already been paid for, and an unscored save is the better outcome.

**`job_search_started` fires before the work and on every outcome, not only on success.** It was first written inside the `completed` branch, which made the failure rate unmeasurable — the event is the funnel's denominator, and it is the one signal that would show an expired Adzuna key as a cliff rather than as silence. It also stamped the event at completion rather than at the click, distorting any duration derived from it. One PostHog client now spans the request: `flushAt: 1` sends each capture as it happens, and a `finally` guarantees the shutdown on every path, including the 502. **Any event named for a user action belongs at the action, not at its result.**

**PostHog is unverified at the network layer.** Both events fire, the failure path was exercised and logged nothing, but delivery was not decoded from the wire the way Feature 03's events were.

---

### Feature 12 — Job Details Page (2026-08-03)

**The two questions this feature was expected to open were closed by reading the design.** § Feature 10 left "backfill Adzuna's `created` and `about_company`, or leave null?" as the next session's first decision. The mock answers both: DATE FOUND is `found_at`, and the company story is the Company Research card, which is Feature 13. **Nothing was backfilled and nothing needed to be.** Adzuna's `created` is still parsed and dropped in `lib/adzuna.ts`; `about_company` is still an unwritten column.

**`project-overview.md` asks for five sections that can never have data.** Its Job Details list (`:86-106`) names Responsibilities, Requirements, Nice to Have, Benefits and About the Company. Feature 10 writes none of them — Adzuna returns a snippet, not a structured posting — so all five columns are permanently null. The page follows the design mock and `build-plan.md:258-275` instead: one Job Description card rendering `about_role`. This is the same call Feature 01 made on the dashboard cards, in the opposite direction: **the disagreement is settled by which source has a design asset behind it and whether the data exists.** Do not add the five sections back without a data source.

**A malformed job id is not-found, not an error — and it took a guard to make it so.** PostgREST answers a non-uuid `id` with `invalid input syntax for type uuid`, which arrives as an *error*, not as zero rows, so `/find-jobs/abc` rendered the read-failure card and told the user the system had broken. `selectJob()` now validates with `z.uuid()` **before** touching the database. This is the third member of a family worth naming: **a user-supplied value reaching Postgres in a shape it rejects looks like an outage.** The others are Feature 10's 416 on an out-of-range page offset and Feature 06's `invalid input syntax for type uuid: "undefined"`.

**`selectJob()` returns three answers, and "empty" covers two different causes on purpose.** A job that does not exist and a job belonging to another user are indistinguishable — RLS returns no row either way — and neither is a failure. `empty` → `notFound()`, `error` → `JobLoadError`. Same discipline as `ProfileReadResult`; see § Feature 06 for why collapsing them is dangerous.

**`company_research` is deliberately absent from `JOB_DETAIL_COLUMNS`.** The card renders its empty state unconditionally. Selecting the column would create a populated case with nothing to render it — a hole that produces a blank card and no error. **Feature 13 adds the column, the dossier branch and the button's behaviour together**, and the button is `disabled` until then rather than pretending to work. `types/index.ts` already carries the 9-field `CompanyResearch` shape.

**Two score scales now exist and neither is wrong.** `matchScoreBarClass` (bars, ui-rules.md: ≥80 green, ≥60 blue, <60 orange) and the new `matchScoreBadgeClass` (pills, ui-tokens.md: ≥90/≥70 green, ≥50 orange, else muted). They were read as a conflict at first; they describe different elements, and the bar turns blue at 60 where the pill never does. Both are commented in `lib/utils.ts` so neither gets "fixed" into the other.

**An unscored job keeps every section.** Ten rows in the database have no score, from Feature 10's broken-Gemini test, so this is a clickable state rather than a hypothetical. The pill reads "Not scored"; Match Reasoning and Skills each render one muted line. Hiding them would change the page's shape between jobs with no explanation, against `ui-rules.md § Empty States`.

**`components/job-details/` deviates from `architecture.md:112-117` in one place.** That list prescribes a single `MatchScore.tsx`; this ships `MatchReasoning.tsx` and `SkillsComparison.tsx`, because they are two independently-empty cards and `code-standards.md:63` is one component per file. `JobInfo`, `JobDescription`, `CompanyResearch` and `JobActions` keep the prescribed names. `JobHeader` and `JobLoadError` are additions.

**`AppNavbar` gained the avatar and Sign out, which unblocked a three-session-old gap.** `LogoutButton.tsx` has existed since Feature 02 and was **imported by nothing** — which is exactly why the logout click and `user_logged_out` were never tested. The design mock shows both on this page, so mounting them was in scope, and it fixes every authenticated page at once. **A finished component that nothing imports is not shipped.**

**`loading.tsx` and `not-found.tsx` are the first of each in the project.** No route-level boundary existed anywhere before this. The skeleton addresses the row-click half of the standing "no pending feedback" finding; **the list page's filter, sort and pagination navigation still has none.**

**`size="xl"` (h-12) was added to `button.tsx`** for the full-width Apply Now, per `ui-registry.md § Button`'s rule that a new geometry is a new size variant rather than a call-site override.

#### Verified in the browser, signed in

`npx tsc --noEmit`, `npm run lint` and `npm run build` all clean, with `/find-jobs/[id]` in the build output as a dynamic route.

A scored job (ManpowerGroup, 85%) renders every field matching the row it was reached from, with a green pill, real salary, `Full-time`, and "45 minutes ago". An unscored job (Kizen) renders "Not scored" plus both empty states with the page's shape unchanged. A job with matched skills and no gap skills shows only the "You have" group. `/find-jobs/abc` **and** a well-formed but nonexistent uuid both land on not-found rather than the failure card — the uuid guard confirmed. View Job Post and Apply Now resolve to the same URL, both `target="_blank" rel="noopener noreferrer"`. Back to Jobs returns to `/find-jobs`. The tab title reads the job title, the first page in the app to override the root `<title>`. The loading skeleton was observed painting on a row click. No horizontal overflow at the default width; console clean, the only messages coming from a browser extension.

#### Not verified

**Responsive behaviour at 1024 and 430.** The Chrome window would not resize — it is OS-maximized, and `innerWidth` stayed at 1912 through every attempt — so the `sm:`/`lg:` reflow of the four stat tiles has not been seen. This is the one item from the plan's list left open.

**The Log out click still has not happened.** The button is now mounted and reachable, which is the part that was blocking it, but clicking it ends the session and re-authenticating needs a real Google sign-in. Left for the user to trigger. It closes Feature 02 and verifies `user_logged_out` when it happens.

#### Review findings triaged (2026-08-03)

The eight findings that shipped unresolved in `5e30c44` were triaged: five fixed, one accepted, two deferred. `tsc`, `lint` and `build` clean after the fixes. Commits `ed13b15` (the triage), `6e0ecc9` (the strip log below) and `8921264` (registry pattern note).

**Fixed:**

1. **`external_apply_url` is now scheme-guarded at the domain boundary.** The open question — does this React block a `javascript:` href — was answered by reading the installed renderers: React 19.2.4's `sanitizeURL` replaces a `javascript:` href with a throwing URL, in both `react-dom-client` and the server renderer Next bundles (`app-page.runtime.prod.js`). That closes the XSS vector but no other scheme, and the column is bare text with `jobs.source` allowing `'url'` manual import — so `jobDetailSchema` now passes the value through `httpUrlOrNull()`: anything that is not http(s) degrades to `null`, and the page renders its existing disabled no-link button. Same self-repairing posture the schema already documents. A `JobDetail.external_apply_url` is now guaranteed renderable — future consumers inherit the guarantee.
2. **The read-failure state now has an `h1`.** `JobLoadError`'s heading was `h2`; when it renders, `JobHeader` does not, so the page had no `h1` at all. Promoted, with a comment saying why.
3. **Skills dedupe at render.** `agent/matcher.ts` neither dedupes nor uniques, and the skill string is the React key. `SkillsComparison` now renders `Array.from(new Set(...))` for both groups.
4. **Stat-tile `title` is opt-in.** Only Location — the one value that truncates — carries it, via a `withTitle` flag on the tile config. The other three no longer produce tooltips.
5. **`JobActions` import grouping** matches every other file — one `@/` block.

**Accepted:**

6. **`not-found.tsx` uses `SearchX`, not the plan's `Building2`.** Intentional deviation, kept: the icon describes the situation (a search that found nothing), not the subject (a company). No code change.

**Deferred:**

7. **Navbar below ~405px overflows** (430px — the project's tested floor — still fits). Fixing it means deciding what collapses on a 375px phone, and responsive verification is currently blocked (the OS-maximized Chrome window will not resize). Take it up with the next responsive pass.
8. **The card class string appears in 20 source files** (measured by the shadow literal — memory's "17" undercounted). `globals.css` already holds `@utility` precedents (`field-label`, `logo-gradient`, `aurora`) that could hold a `card` utility once. Deferred to its own pass and commit: paddings and radii legitimately vary per surface (`p-6`, `p-4` tiles, `p-3` control strip, `px-6 py-12` centred states, `rounded-t-xl` homepage frame, padding-less table cards), so the extraction needs `ui-registry.md`'s per-surface recipes updated with it — not a triage-pass edit.

**The triage pass was itself reviewed, and two things came out of it:**

- **A stripped apply URL now logs before degrading** (`6e0ecc9`). `httpUrlOrNull()` is the one repair in `jobDetailSchema` that nullifies *valid-looking* data — a scheme-less URL from a manual import would lose its apply link with no trace — so it leaves a `[lib/jobs-query]` `console.error` with the value. The schema's other `.catch(null)` repairs stay silent by design; this one is different because the data it discards may be a working link missing only its scheme.
- **Case-insensitive skill duplicates still render twice** ("React"/"react") — the render-side dedupe is exact-match, which is all the key collision needed. The real fix is normalization in `agent/matcher.ts`, deliberately out of scope for a render-side triage. **Owed whenever the matcher is next touched.**

The five fixes were verified statically only (`tsc`, `lint`, `build`) — **no browser re-verification happened**, against this project's click-verification habit. Low risk: attribute-level and semantic changes, and the scheme guard is a no-op for every current row (all Adzuna https URLs). If anything on the details page looks off next session, re-check these five first.

---

### Feature 13 — Company Research Agent (built 2026-08-03, awaiting click-through)

**What shipped.** `agent/research.ts` (the whole run), `app/api/agent/research/route.ts`, `lib/browserbase.ts`, `lib/stagehand.ts`, `ResearchOutcome` in `agent/types.ts`, `company_research` in `JOB_DETAIL_COLUMNS`/`jobDetailSchema`/`JobDetail`, and the UI split: `ResearchButton.tsx` (client, the fetch + pending + error line) mounted inside `CompanyResearch.tsx` (server, empty state or nine dossier sections). `/architect` ran first; the three decisions it put to the user: **re-run overwrites** (button becomes "Research Again"), **research owns an `agent_runs` row with the search columns null** (no migration — a research run is recognisable by exactly that), **sources render as sanitized links**.

**Stagehand 3.7.1 is the v3 API, and two documented shapes were wrong.** `extract()` is positional — `extract(instruction, zodSchema, { timeout })` — not the `{ instruction, schema }` object every context doc showed; and the page accessor is `stagehand.context.activePage()`, which returns `Page | undefined` (`stagehand.page` does not exist). `library-docs.md` and `architecture.md` were corrected against the installed types. `Stagehand` is an alias of the `V3` class; the constructor shape the docs taught (`browserbaseSessionID`, `model: { modelName, apiKey }`, `disablePino`) is real.

**The route holds the connection for the whole run — the docs said the opposite.** `library-docs.md`'s old Browserbase note ("the route returns while the session continues") misdescribed the design: only the browser is remote; every extraction and the synthesis are awaited in the route, so a run is ~40s–3min of held connection. Corrected, with the serverless `maxDuration = 300` caveat recorded for a future deploy. A client navigating away does not cancel the run — it completes and saves.

**Synthesis: seed, default thinking, 2500 tokens — overriding two stale numbers.** The build plan's `temperature: 0.4` does not exist on the Interactions API (the same correction Feature 10 made for scoring), and the documented 800-token budget paired with default thinking is the exact broken-JSON failure Feature 08 measured (767 thought tokens on a *smaller* task). Research is the one task that keeps default thinking — fusing three sources is deliberation — so the budget was sized for thought plus nine fields. Extraction meanwhile runs on Stagehand's own Gemini calls against the **same** `GEMINI_API_KEY` quota: an extraction 429 degrades that page (or the whole browse) to synthesis-only; **only a synthesis 429 surfaces as the route's 429.**

**Homepage derivation is the spec plus three hardenings.** Following the apply-link redirect server-side (`fetch(redirect: "follow")`, root-domain strip, `www.{company}.com` fallback) is build-plan's recipe; what it lacked: a 10s `AbortSignal.timeout` (a hanging redirect chain would eat the run before the browser opened), a multi-part-TLD allowlist (`jobs.foo.co.uk` must not become `co.uk` — gb/au rows exist), and an ATS denylist (greenhouse/lever/workday/ashby/smartrecruiters/icims/bamboohr — stripping subdomains there yields the ATS's homepage, not the employer's).

**Sources are the pages extraction actually visited, not the model's citations.** The model can cite pages it never saw, so when the browse succeeded the visited list overwrites `sources`; the model's own list survives only synthesis-only runs, filtered to http(s). Read-side, `jobDetailSchema` guards each source through the same `httpUrlOrNull` as `external_apply_url` — the registry's schema-guard rule, applied both ends.

**A dossier written without the site says so.** `browsed: false` surfaces as a notice line under the button ("written from the job posting and your profile") — the Feature 08 degrade-and-admit rule. Browser failure is never a run failure; only synthesis or the save fail a run. First real use of `agent_logs.job_id`: every log row in a research run carries the job.

**Known-accepted gaps** (from the plan, unchanged): no rate/cost ceiling per click; no cross-tab concurrent-run guard (second tab's browser fails → degrades → overwrites); no persistent "running" indicator across navigation.

#### Verified live, signed in, same day (2026-08-03)

`npx tsc --noEmit`, `npm run lint`, `npm run build` all clean, `/api/agent/research` in the build output, no server-only leak through `ResearchButton`.

Three real runs against ManpowerGroup (85% row), all three `completed` in `agent_runs` with null search columns, every `agent_logs` row carrying the `job_id`. The Stagehand model config authenticated against Gemini on its first live use. **The happy path end to end:** homepage + 2 sub-pages read (`manpowergroup.com`, `/What%20We%20Do`, `/Insights`), dossier in ~53s with real facts (NYSE: MAN, Manpower/Experis/Talent Solutions, the MyPath programme), Sources rendering exactly the three visited URLs as muted links, button flipped to "Research Again", hard reload persisted it. **The degraded path, courtesy of the real world:** the first run hit ManpowerGroup mid-outage (Cloudflare 502) and produced an honest synthesis-only dossier with the notice line under the button. **Re-run overwrites** verified — the inferred dossier was replaced by the browsed one. Unauthenticated `POST` → 401 with the standard body. Console clean.

**Two findings surfaced live and were fixed during verification:**

1. **One click started two runs.** The second click event landed ~100ms after the first — before React committed the `disabled` re-render — so two full runs raced (two sessions, two syntheses, double save with last-writer-wins). `ResearchButton` now carries a synchronous `useRef` in-flight guard alongside the state; the state still drives the label, the ref drives re-entry. A human double-click is the same event sequence, so this was a user-reachable bug, not an automation artefact.
2. **A 502 page passed the empty-site check.** The extraction *described* the error page — non-empty `oneLiner` — so `!oneLiner && !productSummary` never fired, and the run logged "1 page researched" with the 502 page as a source. The fix is deterministic rather than heuristic: `page.goto()` returns a Playwright-style `Response`, and any non-`ok()` homepage bails to synthesis-only (a non-`ok()` sub-page is skipped) **before** an extraction call is spent. The check caught its first real case minutes later — the model hallucinated an `/About%20Us` link that answered 404 and was skipped, logged, and excluded from sources.

#### Not verified

The Browserbase dashboard was not opened to visually confirm sessions closed (indirect evidence: all runs completed, none hung, no session-limit errors on the re-run). The unset-`BROWSERBASE_API_KEY` degrade was not staged — the real 502 exercised the same synthesis-only path. Navigate-away-mid-run untested (the route completes and saves regardless; accepted). PostHog `company_researched` delivery unverified at the network layer — the same standing item Feature 10 carries. A cosmetic Stagehand-internal log line ("Shutdown supervisor entry missing") appears at session start; runs complete regardless.

#### Review findings (2026-08-03) — five Minor, all shipped unresolved

`/review` passed plan alignment and system integrity; the two serious live findings were already fixed during verification. What remains, none blocking:

1. **Homepage self-exclusion misses the www/apex mismatch** — `selectSubPages` excludes the homepage by hostname equality, but a redirect-derived homepage is apex (`https://{root}`) while page links are usually `www.` URLs, so one of the three sub-page slots can re-extract the homepage. Costs an extraction call, never correctness.
2. **Validation-failure detail dies in `agent_logs`** — `logAgentError` stringifies zod issues to `[object Object]`; the detail survives only in the server console.
3. **Malformed JSON body → 500, not 400** — `await req.json()` throws into the outer catch. Inherited: `find/route.ts` behaves identically; fix both together or accept both.
4. **⚠ Feature 15/16 requirement, not a bug here:** research runs live in `agent_runs` with null search columns (decision 2). **Any dashboard stat that counts `agent_runs` as "searches" must filter on `job_title_searched IS NOT NULL`** or research runs inflate it. Recorded here so it is a requirement going into Phase 5, not a surprise during it.
5. **A repaired-empty company name** renders "Researching ." in logs and skips the fallback URL — cosmetic, unreachable for current rows.

Also restated by review, pre-existing: AGENTS.md's "AgentSpan step IDs `apply-{job_id}`" invariant has no counterpart anywhere in the code; the logging model is flat run + leveled messages.

---

### Feature 14 — Dashboard Page — Full UI (2026-08-03)

**Built from `project-overview.md` and the design mock, not `build-plan.md`'s list — as Feature 01 already decided.** The four stat cards are Total Jobs Found, Avg. Match Rate, Companies Researched, Jobs This Week; the three charts are Company Research Activity, Jobs Found Over Time and Match Score Distribution. Build-plan's "Cover Letters Generated" card and "Resume Tailoring Activity" chart stay unbuilt — both features are out of scope.

**recharts 3.10.1 installed** — the first new dependency since zod. Feature 17 mandates it, so building the chart UI with it now means 17 swaps mock props for PostHog data with no component changes. Added to `code-standards.md`'s approved list and documented in a new `library-docs.md § Recharts`: client components only, every colour a `var(--color-*)` reference (SVG props take CSS variables, so the no-hex rule holds inside charts), `ResponsiveContainer` requires a fixed-height wrapper (`h-[280px]`) or it measures 0 and renders nothing.

**`--color-chart-axis` (#9ca3af) added to `@theme`** — ui-tokens.md specifies that exact grey for axis labels twice, and no text token matches it (`text-muted` is `#99A1AF`, a different grey). A chart-only token keeps the hex out of components without bending an existing token's meaning.

**Three chart components instead of the prescribed `AnalyticsCharts.tsx`** — `architecture.md:96-98` lists one file, but the mock's grid interleaves the research chart with the Recent Activity card and puts the other two in a second row, so no single component can own that layout; and one component per file stands. Same documented-deviation shape as Feature 12's `MatchScore` split. `StatsBar` and `RecentActivity` keep their prescribed names.

**The incomplete-profile banner is real data, deliberately, on a mock page.** `project-overview.md` requires it and no later feature wires the dashboard's banner, so building it mock would have left it mock forever. It reuses `readProfile()` + `calculateCompletion()`; a profile read *error* renders the dashboard without the banner rather than a failure card — the dashboard must not block on a row it only decorates from, and `/profile` owns that failure state. The component nulls itself when `missingFields` is empty, so the page composes it unconditionally.

**`POST_LOGIN_ROUTE` restored to `/dashboard` and the homepage CTA to "Go to dashboard"** — closing the deferral § Feature 02 recorded. Both verified in the browser: a signed-in `/login` visit redirects to `/dashboard`, and the CTA lands there. `AppNavbar`'s `Logo href="/dashboard"` stopped 404ing with no change.

**Activity dots follow Feature 16's colour rule, not the mock's pixels.** The mock paints some dots purple — those rows belong to out-of-scope activity types. The two real kinds: search = success green, research = info blue.

**The dataviz palette validator was run** on the three chart hues (accent/info/success): all checks pass; a contrast warning on the info and success fills against white (<3:1) is relieved by visible axis labels and hover tooltips. **Feature 17 must keep axis labels and tooltips when it rewires the data** — they are the accessibility relief, not decoration.

**Mock data lives in `lib/dashboard-mock.ts`**, typed against the component prop types (`DashboardStat`, `ActivityEntry`, the three chart point shapes — each exported from its component). Features 15/16/17 delete it, the `lib/jobs-mock.ts` precedent.

#### Verified in the browser, signed in (2026-08-03)

`npx tsc --noEmit`, `npm run lint`, `npm run build` all clean, `/dashboard` in the build output. Signed out, `curl` shows `/dashboard` → 307 `/login`. Signed in: all four stat cards with trend badges, five activity entries with correct dot colours and connectors, all three charts matching the mock (blue bars 0–12, accent line with gradient on 0–100, green distribution bars), hover tooltip renders ("Fri — Companies researched: 12"), navbar Dashboard item active with underline, tab title "Dashboard — JobMax" (second page to override the root title). No horizontal overflow (`scrollWidth === clientWidth`); console clean (extension noise only).

#### Not verified

The **incomplete-banner branch was not seen rendered** — the signed-in profile row is complete, and staging an incomplete one means mutating real data; the complete branch (no banner) is what the mock shows and is what rendered. Verify the incomplete branch whenever the profile row is next legitimately incomplete, or when Feature 15's work touches this page. Responsive at 1024/430 remains blocked on the OS-maximized-window limitation every feature carries.

#### Review findings triaged (2026-08-03) — three fixed, rest noted

`/review` passed plan alignment; seven findings, none critical. **Fixed same day:**

1. **`/dashboard` now carries an `sr-only` h1** ("Dashboard") — the page had no h1 at all, every heading being an h2. Copied the `/find-jobs` precedent. `/profile` still shares this gap — pre-existing, owed whenever that page is next touched.
2. **The fixed `domain={[0,100]}`/`ticks` were removed from `JobsFoundChart` and `MatchScoreChart`.** Real Feature 17 data over 100 would have been *clipped at the top of the plot* — wrong in a way that looks plausible. Recharts' nice-tick auto-scale reproduces the mock's 0/25/50/75/100 axis for the mock data (verified in the browser after the change) and rescales rather than clips for anything larger. The research chart always auto-scaled.
3. **`app/dashboard/loading.tsx` added** — the page awaits a real profile read, and the job-details precedent says a navigation that waits on the database needs pending feedback. The skeleton mirrors the grid. *Not observed painting* — the local read resolves too fast; it will show on a slow connection.

**Noted, no action:**

- `lib/dashboard-mock.ts` imports types from `components/dashboard/` — the project's first `lib → components` import. Type-only, forbidden by no invariant (only `agent/` is barred), and the file dies with Features 15/16/17. If a *second* lib→components import ever looks necessary, move the shared types to `types/index.ts` instead.
- The `AXIS_TICK` const and tooltip `contentStyle` literal are copied across the three chart files. Same family as the card-class-literal standing item. **The rule: a fourth chart triggers extraction of a shared chart-chrome module; three copies do not.**
- Recharts prop styling as the second sanctioned non-Tailwind surface, and the mock numbers rendering to a real user, were both already documented above — deliberate.
- The banner's incomplete branch stays owed, as recorded under Not verified.

---

### Feature 15 — Stats Bar — Real Data (2026-08-03)

**The four stat cards read live jobs-table counts; `MOCK_STATS` is deleted.** Total Jobs Found = all rows for the user; Avg. Match Rate = mean of `match_score` over **scored rows only** (nulls excluded, never counted as zero — the Feature 09 posture); Companies Researched = rows where `company_research IS NOT NULL` (**a row count, not distinct companies** — build-plan § 15's wording is the spec, the label is marketing); Jobs This Week = `found_at` in the last 7 **rolling** days, not since Monday.

**`lib/dashboard-query.ts` is the dashboard's read layer, and it returns raw numbers, not display strings.** `selectDashboardStats(userId)` → `{ status: "ok", stats } | { status: "error" }` with `{ totalJobs, avgMatchScore: number | null, companiesResearched, jobsThisWeek, jobsPriorWeek }`. Labels, "%" formatting, captions and the badge math live in `app/dashboard/page.tsx` (`buildStats()` / `trendBadge()`) — keeping presentation out of lib is what avoided a second lib→components type import and the `types/index.ts` migration § Feature 14 warned about. Feature 16's `agent_runs` reads belong in this file, not in `lib/jobs-query.ts`, whose charter stays the find-jobs list.

**Trend badges are computed, never stored — and only shown for genuine positive movement.** No history table exists, so: card 1's badge is jobs-added-this-week over the total as it stood a week ago (`totalJobs − jobsThisWeek`, zero extra queries); card 4's is this 7-day window vs the prior one (one extra count over the half-open `[14d ago, 7d ago)` window). The badge hides when the prior period is 0 (a new user's "+∞%"), when change ≤ 0 (`StatsBar` has only the success-green badge; a red variant was declared out of scope), or when it rounds to +0%. Cards 2 and 3 are caption-only by decision. Captions when no badge: "All time" / "Across scored jobs" / "Total researched" / "New this week"; with a badge, "vs last week".

**A failed read renders dashes, not a missing section.** Any single query failure fails the whole read (the `selectJobs` owned/total precedent — three real numbers beside one dash reads as corruption), and the page renders all four cards with "—" and no badges. No scored jobs is *not* an error: Avg. Match Rate alone shows "—" while the counts show real zeros. The stats read runs in `Promise.all` with the banner's profile read; each degrades independently.

**The average is computed in JS over one fetched integer column, not a PostgREST aggregate.** Aggregate functions are opt-in PostgREST server configuration this backend is not known to enable; at this project's scale the `match_score` column fetch is cheap. The comment in `lib/dashboard-query.ts` says to revisit if the jobs table outgrows one response. Count queries use the established `{ head: true, count: "exact" }` pattern; separate small count functions rather than a builder-taking helper, for the type-instantiation reason `lib/jobs-query.ts` documents.

#### Verified in the browser, signed in (2026-08-03)

`npx tsc --noEmit`, `eslint`, `npm run build` all clean. Ground truth first via SQL: 49 jobs, mean score 42 over 39 scored, 1 researched, all 49 within 7 days, prior week 0. The page rendered exactly that — **49 / All time, 42% / Across scored jobs, 1 / Total researched, 49 / New this week, both badges correctly hidden** (prior periods are 0). The badge branch was then exercised for real: 20 test rows (dossier row excluded) backdated 8 days via SQL, reload showed **"+145% vs last week"** on card 1 (29 new ÷ 20 prior total) and **"+45%"** on card 4 (29 vs 20) — both matching hand-computed expectations — then the rows were restored (+8 days, confirmed 49/49) and the original render re-verified. Console clean throughout.

#### Not verified

The **error branch** (four dashes) was not staged — it requires a database failure mid-render. The **incomplete-profile banner branch stays owed** from § Feature 14: this feature never made the profile row incomplete, so the chance did not arise. The `+0%`-rounding hide is arithmetic, unexercised by the live data.

---

### Feature 16 — Recent Activity — Real Data (2026-08-03)

**Nothing recorded when a job was researched, so `jobs.researched_at` (timestamptz, nullable) was added.** The jobs row has no `updated_at`, the research `agent_runs` row deliberately carries no job reference (its null search columns are how research runs are recognised — § Feature 13), and `agent_logs` is a log stream, not a data model to build a feed on. `agent/research.ts` now stamps `researched_at` in the same update that saves the dossier, so a re-run re-stamps it and re-research surfaces as fresh activity. The one pre-existing dossier row was backfilled from its own dossier-saved success log via SQL. `architecture.md`'s jobs table documents the column. This is the feature's one schema change; additive and nullable.

**The feed is the top five of two merged reads in `lib/dashboard-query.ts § selectRecentActivity`.** Searches: `agent_runs` where `status = 'completed'` **and `job_title_searched IS NOT NULL`** — § Feature 13 review's carry-forward requirement, discharged here; research runs share the table and would otherwise appear as blank searches. A defensive `completed_at IS NOT NULL` keeps a half-written row from failing the zod parse. Research: jobs where `company_research IS NOT NULL AND researched_at IS NOT NULL` (the second filter also hides any dossier row that predates the column). Five fetched per source — the merged top five is always contained in the union of each source's top five — sorted by timestamp descending in JS. Searches order on `completed_at` ("Found X jobs" became true at completion), research on `researched_at`.

**Same raw-data/presentation split as Feature 15.** The lib returns `ActivityItem` (a kind-discriminated union of raw fields); `app/dashboard/page.tsx` composes the display strings — `activityMessage()` ("Found X jobs for Y" with singular "1 job", "Researched Z") and `formatTimeAgo()` (Just now / mins / hours / Yesterday / days, the mock's vocabulary, rolling not calendar). React keys are `${kind}-${id}` — the two id namespaces are different tables, and a key should not rest on uuid non-collision. Either source failing fails the whole read: a feed silently missing one kind of activity looks complete and is not.

**`RecentActivity` gained an `emptyMessage` prop and never hides** (the SkillsComparison rule). The page distinguishes the two empty renders: read ok with no items → "No activity yet — search for jobs to get started."; read failed → "Activity couldn't be loaded." The list `<ol>` renders only when entries exist, so the empty state is one muted line, not a padded void. `MOCK_ACTIVITY` deleted from `lib/dashboard-mock.ts`, which is now charts-only and dies with Feature 17.

#### Verified in the browser, signed in (2026-08-03)

`npx tsc --noEmit`, `eslint`, `npm run build` all clean. SQL ground truth (a UNION mirroring both reads) predicted five entries; the page rendered exactly them, in order: **"Researched ManpowerGroup — 5 hours ago"** (info-blue dot, the backfilled timestamp) above four green search entries — **"Found 0 jobs for QA Engineer", "Found 10 jobs for QA Engineer", "Found 9 jobs for Frontend Engineer", "Found 0 jobs for DevOps Engineer", all "19 hours ago"**. The 0-count entries render with plural "jobs", correctly. Stats bar and the three mock charts unaffected (a first screenshot caught the recharts entrance animation mid-flight — bars grow over ~1s; not a bug). Console clean.

#### Not verified

The **empty state and the couldn't-load line** were not staged — the signed-in account has activity, and the error branch needs a mid-render database failure. `formatTimeAgo`'s "Just now"/"mins"/"Yesterday"/"days" branches are unexercised by the live data (everything sat in the hours band); they are arithmetic. **A failed search run is excluded by design** (`status = 'completed'`, build-plan § 16's "agent_run completed") — the two 0-job entries above are *completed* runs that found nothing, which is activity, not failure. The incomplete-profile banner branch stays owed from § Feature 14.

#### Review findings triaged (2026-08-03) — none require action; all noted

`/review` of Features 15+16 together: plan alignment and system integrity pass (the one scope addition, `jobs.researched_at`, was already flagged and documented above). Five minors, one observation, no fixes applied:

- **No index backs the activity queries** — `agent_runs` is indexed on `(user_id, started_at DESC)` but the feed orders by `completed_at`; `researched_at` has no index. Add one only if these tables ever grow real volume.
- **`averageMatchScore` has no `.limit()`** — if InsForge sets PostgREST's `db-max-rows`, a large table would silently average a truncated set. Already commented in code with its revisit trigger.
- **`formatTimeAgo` trusts the timestamp format** — a non-parseable string renders "NaN days ago"; PostgREST always returns valid ISO, so theoretical.
- **Time vocabulary stops at "N days ago"** — a month-old entry reads "34 days ago", not a date; only the top 5 render, so rare.
- **Unstaged branches** as listed in the two Not verified blocks above.
- **Observation: the real feed now displays the `SearchControls` double-click bug** — the live data's paired runs seconds apart ("Found 0 jobs" / "Found 10 jobs" for the same title) are duplicate agent runs from the unguarded button, now user-visible on the dashboard. Raises the priority of the standing 2-line `useRef` fix (see § Feature 13 / the registry's SearchControls note).

---

### Feature 17 — Analytics Charts — PostHog Data (2026-08-03)

**The charts read PostHog through the HTTP Query API, because nothing else can read PostHog.** No PostHog MCP is configured, and `posthog-node@5.46.1` is capture/flags-only — verified against the installed types, zero query surface. `lib/posthog-query.ts` POSTs HogQL to `/api/projects/{id}/query`, authenticated by a **personal API key** (`POSTHOG_PERSONAL_API_KEY`, scope query:read — a server-only secret, minted this session) with `POSTHOG_PROJECT_ID=533085` (recovered from `posthog-setup-report.md`). The project token cannot query; `library-docs.md § PostHog → Querying events` now documents the split. The Query API origin (`us.posthog.com`) is derived from the ingestion host by stripping `.i` — no third env var to drift; unrecognised hosts throw.

**Three exports, per-chart independent degrade** — `selectJobsFoundDaily` (30 days), `selectResearchDaily` (7 days), `selectMatchScoreDistribution` (all-time, six buckets `<50%` + the design's five, **null matchScore excluded** — a score distribution charts scores, closing § Feature 10's open item). Zero-filling lives in the lib (a missing day is a zero-activity day — completeness is data); labels live in the page (`formatChartDay`, UTC-pinned). **UTC end-to-end by assumption**, commented with the tradeoff. `distinct_id` interpolation is **validate-don't-escape**: the session-sourced UUID passes a hex-and-hyphens regex or the read fails closed. Rate limits: per-render querying, revisit trigger in the lib header.

**The design-mock bucket set was extended, not obeyed**: the mock's 50–100 buckets would have hidden most real data (live average is 42). `<50%` + the five design buckets, decided in `/architect`.

**Charts gained exactly one prop** — `emptyMessage`, rendered as the registry's card-empty-state line centred in the held `h-[280px]` slot when `data` is empty. The page distinguishes error ("Chart couldn't be loaded.") from all-zero no-data (per-chart copy); an ok zero-filled result is never literally empty, so **all-zero IS the no-data condition**. Axis labels, tooltips and auto-scaled domains untouched — § Feature 14's contrast-relief requirement.

**`lib/dashboard-mock.ts` is deleted** — the last mock surface, and with it the project's only lib→components import.

#### Verified live, signed in (2026-08-03)

`tsc`/`eslint`/`build` clean. Ground truth curl'd from the Query API first: sanity query confirmed `distinct_id` = InsForge `user.id` (49 `job_found`, **3 `company_researched`** — the research agent ran three times in Feature 13 testing; events count *activity*, the stats card counts *rows*, 1 — different sources, both honest). The three production queries predicted: Aug 2 = 49 with 29 zero days; today (Mon Aug 3) = 3; buckets 28/1/1/5/4/0 (39 scored = exactly the DB's 49 − 10 unscored, the null filter working). **The page rendered all three exactly**: 30-day axis Jul 5→Aug 3 with auto-thinned date ticks and the 49-spike (tooltip "Aug 2 — Jobs found: 49"), research bar 3 on the rightmost (today) slot, distribution bars 28/1/1/5/4/0. Console clean. **The error branch was verified first, live, before the key existed**: all three charts fail closed to "Chart couldn't be loaded." in held slots, three `[lib/posthog-query]` errors in the server log, stats/activity unaffected, page 200 — the dev overlay's "N issues" badge is those logged errors, expected in dev only.

#### Review findings triaged (2026-08-03) — four fixed same day, one noted

Reviewed before the key existed (error branch verified first, happy path after). **Fixed the same day, user-directed:** **(a) windowed empty-state copy** — now window-scoped ("No jobs found in the last 30 days — run a search to see this trend." / "No research in the last 7 days."), never "yet" on a windowed chart; the all-time distribution keeps "No scored jobs yet.", which is accurate. **(b) the `emptyMessage: ""` sentinel** — helpers return `emptyMessage?: string` and omit it on the data path. **(c) fractional Y ticks** — `allowDecimals={false}` on all three chart Y-axes (not a fixed domain — it only stops the auto-scale offering 0.75/1.5/2.25 on integer count axes); verified live, research axis now 0–4 in integers. **(d) JSX re-indented** in all three chart files. **Noted, no action:** (e) the distribution fetch is unbounded — commented in code, `averageMatchScore` precedent.

---

### Post-plan — Legal pages `/privacy` and `/terms` (2026-08-03)

**Both routes 404'd while being linked from two places** — the marketing footer (`Footer.tsx`) and the login page's terms line — surfaced live when the user clicked them (two 404s in the dev log). Built as marketing-side pages: `app/privacy/page.tsx` and `app/terms/page.tsx` compose the marketing `Navbar` (CTA resolved by `getCurrentUser`, the homepage pattern) + a new shared `components/layout/LegalPage.tsx` + `Footer`. One shared body component so the two documents cannot drift visually — title, muted last-updated line, intro, then `{heading, paragraphs[]}` sections in the established recipes (h1 `text-3xl leading-9 font-bold tracking-tight`; h2 the standard section heading; body `text-sm leading-6 text-text-secondary`; reading column `max-w-3xl px-6 py-16` on `bg-surface`).

**The copy is generic legal text, honest to what the app does** — names the categories of third-party processing (auth/DB/storage, listings, AI scoring/generation, browser automation, analytics) without naming vendors, states that applications always happen on the employer's site (the Easy-Apply invariant, user-facing), and Terms carries an AI-generated-content clause. Contact is `support@jobmax.app` — placeholder domain, same status as the Tom Wilson testimonial. Not reviewed by a lawyer; replace before this is a real product.

**Not in the proxy matcher, deliberately** — public pages. Known consequence (pre-existing, shared with `/`): outside the matcher no token refresh runs, so a signed-in user with an expired access token sees the signed-out navbar CTA on these pages.

Verified: `tsc`/`eslint`/`build` clean (both routes in the build output), both pages rendered in the browser with correct tab titles, navbar and footer intact.

---

### Cross-cutting — AI provider changed to Google Gemini (2026-07-31)

**GPT-4o is out; Google Gemini is in, across Features 07, 08, 10 and 13.** No OpenAI credits. Every doc that named GPT-4o or `OPENAI_API_KEY` was rewritten. No application code changed — nothing had been built against OpenAI yet, and no AI package was ever installed, so this cost nothing but documentation.

**The env var is `GEMINI_API_KEY`**, not a name of our choosing: `@google/genai` reads that exact variable when constructed with no argument. `.env.local` was renamed and **its value blanked** — the old `sk-…` value was an OpenAI key and useless here. The app cannot make a model call until a Google AI Studio key is pasted in.

**The package is `@google/genai` v2, not `openai` and not `@google/generative-ai`.** Its surface is an Interactions API — `ai.interactions.create({ model, system_instruction, input, response_format, generation_config })` returning `interaction.output_text`. The `models.generateContent()` / `response.text()` shape that most training data teaches is superseded. Verified against the live docs on 2026-07-31 **and against the installed `.d.ts`** — `interactions` is a public getter on `GoogleGenAI`, `constructor(options)` takes a required options object, and the params really are snake_case (`system_instruction`, `generation_config`, `response_format`) despite being a TypeScript SDK. Installed at v2.15.0.

**`lib/gemini.ts` exists and is the only place the key or the model string is named.** It exports `getGeminiApiKey()`, `getGemini()` and `GEMINI_MODEL`, following the `getInsforgeUrl()` accessor convention in `lib/auth.ts`. The client is lazy on purpose: a module-level `new GoogleGenAI(...)` throws during `next build` on any machine without the key, including CI. Server-only by comment convention, matching `lib/profile-schema.ts` — the `server-only` package is not used anywhere in this project. **It has no caller yet** and has never made a live API call.

**Model is `gemini-3.6-flash`, pinned once as `GEMINI_MODEL` in `lib/gemini.ts`.** The old rule was "the model string is always `gpt-4o`", which invited hardcoding at four call sites. `gemini-3.5-flash-lite` is the fallback if the free tier rate-limits us.

**Structured output got stronger, not weaker.** Gemini constrains decoding to a JSON Schema passed in `response_format.schema`, where GPT-4o's `json_object` mode only promised *some* valid JSON. The schema is generated with `z.toJSONSchema()` — built into zod v4, which we already have — so the zod schema stays the single definition of the shape and both constrains generation and validates the result.

**`pdf-parse` was dropped from the approved dependency list before it was ever installed.** Gemini takes a PDF as a `{ type: "document" }` input part, so Feature 07 sends the bytes and skips text extraction entirely — better on multi-column resumes, and image-only PDFs now work instead of returning empty. What is lost is the pre-flight readability check: we no longer know a PDF is unreadable until after the model call, so "could not extract" is now decided from an all-empty extraction result rather than from an empty `pdfData.text`.

**The free tier rate-limits per minute and per day.** Every AI call site must render a 429 as "try again in a moment". This did not matter with a paid OpenAI key and now does.

**Stagehand's model config is documented but unverified.** `model: { modelName: "google/gemini-3.6-flash", apiKey: process.env.GEMINI_API_KEY! }` in both `architecture.md` and `library-docs.md`. Stagehand is not installed, so this string has not been run against a real version — confirm it against the installed package when Feature 13 starts. `architecture.md` also still shows the older `stagehand.page` accessor where `library-docs.md` shows `stagehand.context.activePage()`; `library-docs.md` is the corrected one.

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
