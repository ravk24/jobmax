# Memory — Feature 04: Database Schema (complete and verified)

Last updated: 2026-07-30

## What was built

Feature 04 is done. Four tables, RLS, and the storage bucket are **live on the InsForge backend and verified**, not just written. Phase 1 — Foundation is now complete apart from two outstanding Feature 02 clicks.

**New files:**

- `db/schema.sql` — the source of truth for the schema. `profiles`, `agent_runs`, `jobs`, `agent_logs`, plus CHECK constraints, six indexes, an `updated_at` trigger, RLS policies, and grants. Every statement is idempotent, so re-running is safe. Applied in a single batch through the MCP `run-raw-sql` tool.
- `types/index.ts` — row types (`Profile`, `AgentRun`, `Job`, `AgentLog`), the jsonb shapes (`WorkExperience`, `Education`, `CompanyResearch`), and string unions mirroring every CHECK constraint.

**Created on the backend:** the four tables, and the `resumes` storage bucket (private, `isPublic: false`). Objects live at `{user_id}/resume.pdf` inside it.

**Context files updated:** `progress-tracker.md` (Feature 04 section, 04 ticked), `architecture.md` (new *Database Security Model* section, `db/` added to the folder tree).

## Decisions made

- **RLS is the only access control on these tables — not defence in depth.** InsForge sets a default ACL on `public` (`pg_default_acl`) granting `arwd` to **both `anon` and `authenticated`** on every table `project_admin` creates, and both roles already hold schema `USAGE`. A table added to `public` without RLS is world-readable *and* world-writable by unauthenticated callers. **Never add a table without enabling RLS and adding a policy.**
- **`anon` is explicitly REVOKEd** on all four tables, so anonymous callers are refused outright rather than connecting and matching zero rows.
- **Every table has one `FOR ALL TO authenticated` policy** comparing `auth.uid()` — `id` on `profiles`, `user_id` on the other three.
- **App-level `user_id` scoping is still required.** RLS is the backstop, not a licence to drop the filter. The existing architecture invariant stands.
- **CHECK constraints were added beyond the spec** so documented invariants are enforced by the database: `jobs.source IN ('search','url')`, `match_score BETWEEN 0 AND 100`, `job_type`, `agent_runs.status`, `agent_logs.level`, and the enumerated `profiles` columns. All mirrored as TS unions.
- **`profiles.updated_at` is maintained by a trigger** (`set_updated_at`). Feature 06 must not set it manually.
- **`db/schema.sql` and `types/index.ts` are authored from one column list.** Change one and change the other in the same commit.
- **Delete behaviour:** `profiles.id` and all `user_id` FKs cascade; `jobs.run_id` and `agent_logs.job_id` are `SET NULL`; `agent_logs.run_id` cascades.

## Problems solved

- **The InsForge MCP server does not attach to Claude Code, but works perfectly standalone.** `ToolSearch` found no `insforge` tools all session. Spawning the exact command from `.mcp.json` over stdio and doing an MCP `initialize` + `tools/list` handshake returned all 17 tools (`run-raw-sql`, `get-table-schema`, `create-bucket`, `fetch-docs`, …). So the config is correct and a **Claude Code restart should attach it**. If it ever fails again, driving the server directly over stdio from a small Node script is a working fallback — that is how this entire feature was applied and verified.
- **`auth.users` exists and `architecture.md` was right.** `profiles.id uuid REFERENCES auth.users(id)` is valid; `auth.users.id` is `uuid NOT NULL`. This could not be confirmed from the REST API because **PostgREST is scoped to `public`** — `/api/database/records/<table>` returns `relation "public.X" does not exist` for anything outside it, so the whole `auth` schema is invisible that way. Only `run-raw-sql` / `get-table-schema` can see it.
- **Postgres RLS is genuinely supported**, despite the InsForge database docs never mentioning RLS, policies, or row-level security. `auth.uid()` exists, defined as `SELECT nullif(auth.jwt() ->> 'sub', '')::uuid`, alongside `auth.jwt()`, `auth.role()`, `auth.email()`.
- **`project_admin` has `rolbypassrls = true`.** Admin tooling and MCP see every row by design — do not mistake that for a broken policy. `anon` and `authenticated` both have `rolbypassrls = false`, so policies do apply to app traffic.
- **No name collision for `profiles`.** InsForge exposes `/api/auth/profiles/`, but that reads `auth.users.profile` — a jsonb column holding name/avatar, a different thing from our `profiles` table. `public` was completely empty before this feature.
- **`run-raw-sql` rejects parameterised queries** ("could not be parsed and was rejected for security reasons"). Use literal SQL. `$$dollar quoting$$` works and avoids shell/JSON escaping pain.
- **The REST admin API mirrors the MCP docs.** `GET /api/docs` and `/api/docs/{type}` serve the same content as `fetch-docs`, authenticated with the key from `.mcp.json`. Useful when MCP is detached.

## Current state

**Verified working.** All four tables present with `relrowsecurity = true` and one policy each. The FK to `auth.users` was proven by inserting a row keyed on the real signed-in user; the `updated_at` trigger fired on update. `jobs.source = 'linkedin'`, `match_score = 150`, and an orphan `user_id` were all rejected. Over HTTP an anon-key request returned `permission denied for table profiles` (HTTP 401) on both `GET` and `POST`. **All test rows were deleted — the four tables are empty.** `npx tsc --noEmit` and `npm run lint` are clean.

**Feature 02 still open.** GitHub sign-in past the authorize screen, and the Log out button (route works; button never clicked). Google sign-in works end to end.

**Feature 03 carry-over, both verification gaps rather than known defects.** `user_logged_out` is unverified — it needs a real session and uses `{ sendInstantly: true }` as a reasoned, unobserved mitigation. The restyled `app/global-error.tsx` has **never been rendered**; `next/font` inside a `"use client"` file and a second Inter instance sharing `--font-inter` with the root layout are both things the build will not catch.

**Not built.** Features 05 onward. No `agent/` or `actions/` directories. `/dashboard` and `/find-jobs` still 404 — expected.

**Uncommitted — nothing has ever been committed on this project.** The working tree holds all of Features 01–04 on `master`, including the untracked `db/` and `types/` directories.

## Next session starts with

**Restart Claude Code first** so the `insforge` MCP server attaches natively. Features 06, 10 and 13 all need it, and the stdio-script fallback should not become the normal path.

**Commit.** Four features of work are sitting uncommitted. Do this before adding more.

**The dev server must be on port 3000.** The OAuth redirect registered with InsForge is `http://localhost:3000/api/auth/callback`. If something holds 3000, Next silently falls back to 3001 and sign-in fails at the callback for a reason that looks nothing like the real cause. Check `Get-NetTCPConnection -LocalPort 3000 -State Listen`; killing an `npm run dev` wrapper does not always kill its `next dev` child.

**Then Feature 05 — Profile Page — Full UI.** Build the complete profile page with mock data, no save logic. Settle the completion-percentage question below before starting, since the page renders a completion ring and missing-field tags.

**Also worth closing out while signed in:** GitHub sign-in, and the Log out button — which simultaneously verifies `user_logged_out`.

## Open questions

- **`profiles` has no completion-percentage or missing-fields columns**, yet Feature 05's UI shows a completion ring with missing-field tags and Feature 06 says "completion percentage and missing fields calculated and saved". Recommendation: **derive them at read time** — the data is already in the row and a stored percentage goes stale. Decide before Feature 05.
- **`agent_runs.user_id` and `jobs.user_id` reference `profiles`, not `auth.users`.** No agent run can exist before a profile row is saved in Feature 06. That matches the intended flow (matching needs a profile), but it is a real ordering constraint.
- **`allowedRedirectUrls` is `[]` on the live backend** yet Google OAuth works, so InsForge does not enforce it for localhost. A production origin must be added at deploy time.
- **Known-open review findings from Feature 03, all Minor.** `architecture.md`'s System Boundaries table still says `components/` is "UI only" and does not account for `components/analytics/`. `.env.example` documents only the two PostHog variables, not the other seven in `code-standards.md`. `posthog-setup-report.md` is a superseded wizard artifact still in the project root.
- **The `hasSession` gate on `user_signed_in` can under-count.** `getCurrentUser()` returns `null` on error, not only when signed out, so a transient InsForge failure during the post-login render drops the event *and* strips the marker. Deliberate trade against a metric any visitor could otherwise inflate.
- **Possible duplicate exception reporting — unverified.** `capture_exceptions: true` loads PostHog's exception autocapture and `global-error.tsx` also calls `captureError()`. Reasoning says they should not collide; untested.
- **`defaults: "2026-01-30"`** in `instrumentation-client.ts` is a wizard-invented baseline; the installed PostHog skill documents `'2026-05-30'`. Ours resolves `capture_pageview` to `"history_change"` and works. Re-verify events if you change it.
- **PostHog test data is in the production project** from 2026-07-30 verification runs, including one `user_signed_in` fired anonymously before the session gate was added.
- **Testimonial copy is fabricated placeholder text** attributed to a named person ("Tom Wilson, Junior Developer"). Replace before the page is public.
- **Button hover zoom is project-wide** (`hover:scale-101` on the base ring in `components/ui/button.tsx`). May be too much in dense app UI.
- **Frame gutters.** `max-w-[1440px]` with `border-x` means the mock's hairline gutters only appear above 1440px viewport width.
