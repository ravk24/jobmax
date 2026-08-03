# Architecture

## Stack

| Layer                          | Tool                     | Purpose                                          |
| ------------------------------ | ------------------------ | ------------------------------------------------ |
| Framework                      | Next.js 16 (App Router)  | Full stack framework                             |
| Auth + DB + Storage + Realtime | InsForge                 | Entire backend                                   |
| Cloud browser                  | Browserbase              | Company research — browsing company public pages |
| AI browser control             | Stagehand                | Company page interaction and content extraction  |
| Job Discovery                  | Adzuna API               | Job search and discovery                         |
| AI model                       | Google Gemini            | Matching, research synthesis, extraction         |
| Analytics                      | PostHog                  | Event tracking and dashboard charts              |
| PDF generation                 | @react-pdf/renderer      | Resume PDF rendering                             |
| Styling                        | Tailwind CSS + shadcn/ui | UI components and styling                        |
| Language                       | TypeScript strict        | Throughout                                       |

---

## Folder Structure

```
/
├── AGENTS.md
├── context/
│   ├── project-overview.md
│   ├── architecture.md
│   ├── ui-tokens.md
│   ├── ui-rules.md
│   ├── ui-registry.md
│   ├── code-standards.md
│   ├── library-docs.md
│   ├── build-plan.md
│   └── progress-tracker.md
├── db/
│   └── schema.sql                          → Full DDL + RLS. Idempotent; source of truth
├── instrumentation-client.ts               → PostHog browser init (Next 16 client bootstrap hook)
├── app/
│   ├── layout.tsx                          → Root layout, mounts PostHogIdentity + SignInTracker
│   ├── global-error.tsx                    → Root error boundary, reports to PostHog
│   ├── page.tsx                            → Homepage
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx                   → Login page
│   ├── dashboard/
│   │   └── page.tsx                       → Main dashboard
│   ├── profile/
│   │   └── page.tsx                       → Profile form + resume management
│   ├── find-jobs/
│   │   ├── page.tsx                       → Find Jobs page — search controls + jobs list
│   │   └── [id]/
│   │       └── page.tsx                   → Individual job details page
│   └── api/
│       ├── auth/
│       │   ├── [provider]/route.ts        → Start OAuth — PKCE challenge, redirect to provider
│       │   ├── callback/route.ts          → Exchange insforge_code, set session cookies
│       │   └── logout/route.ts            → Sign out, clear session cookies
│       ├── agent/
│       │   ├── find/route.ts              → Trigger Adzuna job discovery
│       │   └── research/route.ts          → Trigger company research agent
│       ├── resume/
│       │   ├── upload/route.ts            → Upload resume PDF to Storage, save resume_pdf_url
│       │   ├── generate/route.ts          → Generate base resume PDF from profile
│       │   ├── download/route.ts          → Stream the stored resume back, authenticated
│       │   └── extract/route.ts           → Extract profile data from uploaded resume PDF
├── agent/
│   ├── adzuna.ts                          → Adzuna job discovery — owns the agent_runs record
│   ├── research.ts                        → Company research — Browserbase + Stagehand + Gemini
│   ├── matcher.ts                         → Gemini job matching — one batched call per search
│   ├── logs.ts                            → agent_logs writes, shared by every agent
│   ├── extractor.ts                       → Gemini job description extraction + structuring
│   └── types.ts                           → Agent-specific TypeScript types
├── actions/
│   ├── profile.ts                         → Profile save + update
│   └── jobs.ts                            → Job status updates
├── components/
│   ├── ui/                                → shadcn/ui components only
│   ├── analytics/                         → Effect-only, render null — no markup
│   │   ├── PostHogIdentity.tsx
│   │   ├── SignInTracker.tsx
│   │   └── LoginPageTracker.tsx
│   ├── auth/
│   │   ├── OAuthButtons.tsx
│   │   ├── LogoutButton.tsx
│   │   ├── AuthShowcase.tsx
│   │   └── AuthHighlights.tsx
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   ├── Logo.tsx
│   │   └── Footer.tsx
│   ├── homepage/
│   │   ├── Hero.tsx
│   │   ├── HowItWorks.tsx
│   │   └── Features.tsx
│   ├── dashboard/
│   │   ├── StatsBar.tsx
│   │   ├── RecentActivity.tsx
│   │   └── AnalyticsCharts.tsx
│   ├── profile/
│   │   ├── ProfileEditor.tsx              → Carries an extraction from the resume card to the form
│   │   ├── ProfileForm.tsx
│   │   ├── ResumeUpload.tsx
│   │   ├── CompletionIndicator.tsx
│   │   ├── ProfileLoadError.tsx           → Shown instead of the form when the row cannot be read
│   │   ├── TagInput.tsx                   → Shared by Skills and Industries
│   │   └── WorkExperienceCard.tsx
│   ├── find-jobs/
│   │   ├── SearchControls.tsx
│   │   ├── JobsTable.tsx
│   │   ├── JobFilters.tsx
│   │   └── JobsPagination.tsx
│   └── job-details/
│       ├── JobInfo.tsx
│       ├── MatchScore.tsx
│       ├── JobDescription.tsx
│       ├── CompanyResearch.tsx
│       └── JobActions.tsx
├── proxy.ts                                → Session check on protected routes (Next 16 Proxy)
├── lib/
│   ├── auth.ts                            → OAuth providers, route constants, env accessor
│   ├── profile.ts                         → Completion rules, caps, blankProfile (client-safe)
│   ├── profile-schema.ts                  → zod write + read schemas (server only — keeps zod out of the client bundle)
│   ├── jobs.ts                            → Find Jobs URL rules — parse/build searchParams, relative dates (client-safe)
│   ├── jobs-query.ts                      → The jobs table read — scope, filter, sort, paginate (server only)
│   ├── insforge-client.ts                 → InsForge browser client instance
│   ├── insforge-server.ts                 → InsForge server client + getCurrentUser()
│   ├── gemini.ts                          → Gemini client, GEMINI_MODEL, 429 detection (server only)
│   ├── resume-extraction.ts               → Resume PDF → structured profile fields (server only)
│   ├── resume-generation.ts               → Profile → Gemini prose → PDF → Storage (server only)
│   ├── resume-pdf.tsx                     → @react-pdf/renderer resume layout (server only)
│   ├── resume-storage.ts                  → The one write path: remove → upload → resume_pdf_url
│   ├── browserbase.ts                     → Browserbase session creation + management
│   ├── stagehand.ts                       → Stagehand initialisation with Browserbase session
│   ├── adzuna.ts                          → Adzuna API client
│   ├── posthog-client.ts                  → Typed capture surface (NOT init — see library-docs.md)
│   ├── posthog-server.ts                  → PostHog server client (posthog-node)
│   └── utils.ts                           → Shared utility functions
└── types/
    └── index.ts                           → Global TypeScript types
```

---

## System Boundaries

| Folder        | Owns                                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| `app/`        | Pages and API routes only. No business logic.                                                          |
| `agent/`      | All agent logic. Adzuna discovery, company research, matching, extraction. Nothing here touches React. |
| `actions/`    | Server Actions for UI-triggered mutations only. Profile save, profile update.                          |
| `components/` | UI only. No data fetching logic. No direct DB calls. `components/analytics/` is the one exception in spirit — those components render `null` and exist purely for side effects (identify, event capture); they still hold no data fetching or DB access. |
| `lib/`        | Third party client initialisation and shared utilities only.                                           |
| `db/`         | SQL schema. `schema.sql` is the source of truth; `types/` mirrors it.                                  |
| `types/`      | TypeScript types shared across the project.                                                            |

---

## Data Flow

### UI Mutations (Server Actions)

```
User interaction in component
        ↓
Server Action in actions/
        ↓
InsForge DB write
        ↓
Revalidate or redirect
```

### Agent Operations (API Routes)

```
User clicks Find Jobs
        ↓
API route in app/api/agent/find
        ↓
Calls agent/adzuna.ts
        ↓
Adzuna API returns job listings
        ↓
Gemini scores each job against user profile
        ↓
Agent writes results to InsForge DB
        ↓
Page data revalidated
```

### Company Research (API Routes)

```
User clicks Research Company on job details page
        ↓
API route in app/api/agent/research
        ↓
Calls agent/research.ts
        ↓
Single Browserbase session opens with Stagehand
        ↓
Navigates to company homepage + sub pages
        ↓
Gemini synthesizes dossier from extracted content
        ↓
Dossier saved to jobs.company_research
        ↓
Page data revalidated
```

### Resume Operations (API Routes)

```
User uploads resume or clicks Generate
        ↓
API route in app/api/resume/
        ↓
Gemini processes content
        ↓
@react-pdf/renderer renders PDF buffer
        ↓
New PDF uploaded to InsForge Storage
        ↓
URL saved to profiles table
```

Resume upload is the one UI-triggered mutation that is **not** a Server Action. Server Action request bodies are capped at 1MB by default (`serverActions.bodySizeLimit`) and the resume card advertises 5MB; route handlers carry no such cap.

**Authenticated API routes must be listed in the `proxy.ts` matcher.** `updateSession()` is the only thing that refreshes an expired access token, so a route left out of the matcher returns 401 as soon as the token ages out, while every protected page silently refreshes and keeps working — an intermittent failure that looks like a broken session. `/api/resume/:path*` is matched for this reason, and `/api/agent/:path*` was added in Feature 10. `/api/auth/*` stays out: those routes establish the session and must be reachable without one. Route handlers still call `getCurrentUser()` themselves — the proxy refreshes, it does not authorise.

---

## InsForge Database Schema

### `profiles`

| Column              | Type        | Notes                                        |
| ------------------- | ----------- | -------------------------------------------- |
| id                  | uuid        | References auth.users                        |
| full_name           | text        |                                              |
| email               | text        | Pre-filled from auth                         |
| phone               | text        |                                              |
| location            | text        | City, country                                |
| current_title       | text        | Most recent job title                        |
| experience_level    | text        | junior / mid / senior / lead                 |
| years_experience    | integer     |                                              |
| skills              | text[]      | Array of skill tags                          |
| industries          | text[]      | Industries worked in                         |
| work_experience     | jsonb       | Array of up to 3 roles                       |
| education           | jsonb       | Degree, field, institution, year             |
| job_titles_seeking  | text[]      | Roles they want                              |
| remote_preference   | text        | remote / onsite / hybrid / any               |
| preferred_locations | text[]      | Optional preferred locations                 |
| salary_expectation  | text        | Optional                                     |
| cover_letter_tone   | text        | formal / casual / enthusiastic               |
| linkedin_url        | text        |                                              |
| portfolio_url       | text        |                                              |
| work_authorization  | text        | citizen / permanent_resident / visa_required |
| resume_pdf_url      | text        | InsForge Storage URL of current resume       |
| is_complete         | boolean     | True when all required fields filled         |
| created_at          | timestamptz |                                              |
| updated_at          | timestamptz |                                              |

### `agent_runs`

| Column             | Type        | Notes                        |
| ------------------ | ----------- | ---------------------------- |
| id                 | uuid        |                              |
| user_id            | uuid        | References profiles          |
| status             | text        | running / completed / failed |
| job_title_searched | text        |                              |
| location_searched  | text        |                              |
| jobs_found         | integer     | Total jobs discovered        |
| started_at         | timestamptz |                              |
| completed_at       | timestamptz |                              |

### `jobs`

| Column             | Type        | Notes                                          |
| ------------------ | ----------- | ---------------------------------------------- |
| id                 | uuid        |                                                |
| run_id             | uuid        | References agent_runs — null if from URL input |
| user_id            | uuid        | References profiles                            |
| source             | text        | search / url                                   |
| source_url         | text        | Original job listing URL                       |
| external_apply_url | text        | Direct company apply URL                       |
| title              | text        |                                                |
| company            | text        |                                                |
| location           | text        |                                                |
| salary             | text        | If available                                   |
| job_type           | text        | fulltime / parttime / contract                 |
| about_role         | text        | 2-3 sentence summary                           |
| responsibilities   | text[]      | Bullet points                                  |
| requirements       | text[]      | Bullet points                                  |
| nice_to_have       | text[]      | Optional                                       |
| benefits           | text[]      | Optional                                       |
| about_company      | text        | Brief company description                      |
| match_score        | integer     | 0-100 scored against main profile              |
| match_reason       | text        | Gemini explanation                             |
| matched_skills     | text[]      | Skills user has that match                     |
| missing_skills     | text[]      | Skills user lacks                              |
| company_research   | jsonb       | Company dossier from research agent            |
| researched_at      | timestamptz | Stamped with the dossier save (Feature 16) — the activity feed's research timestamp; null until first researched |
| found_at           | timestamptz |                                                |

### `agent_logs`

| Column     | Type        | Notes                            |
| ---------- | ----------- | -------------------------------- |
| id         | uuid        |                                  |
| run_id     | uuid        | References agent_runs            |
| user_id    | uuid        | References profiles              |
| message    | text        | Human readable log entry         |
| level      | text        | info / success / warning / error |
| job_id     | uuid        | Optional — related job           |
| created_at | timestamptz |                                  |

---

## Database Security Model

The schema lives in `db/schema.sql` and is applied with the MCP `run-raw-sql` tool. Row types mirror it in `types/index.ts`.

**RLS is the only access control on these tables.** InsForge sets a default ACL on `public` granting `arwd` to both `anon` and `authenticated` for every table `project_admin` creates, and both roles already hold schema `USAGE`. A new table without RLS is world-readable and world-writable by unauthenticated callers.

Every table therefore:

- has `ENABLE ROW LEVEL SECURITY`
- has one `FOR ALL TO authenticated` policy comparing `auth.uid()` — `id` on `profiles`, `user_id` on the rest
- explicitly `REVOKE`s `anon`, so anonymous callers are refused rather than matching zero rows

`auth.uid()` is `SELECT nullif(auth.jwt() ->> 'sub', '')::uuid`. `anon` and `authenticated` have `rolbypassrls = false`; `project_admin` (admin tooling and MCP) has `rolbypassrls = true` and sees every row by design.

Application-level scoping is still required — the invariant "always scope queries to `user_id`" stands. RLS is the backstop, not a licence to drop the filter.

---

## InsForge Storage

| Bucket  | Path                         | Contents                  |
| ------- | ---------------------------- | ------------------------- |
| resumes | resumes/{user_id}/resume.pdf | Current active resume PDF |

Access: authenticated users only, own files only.

---

## Authentication

- Provider: InsForge Auth
- Methods: Google OAuth, GitHub OAuth
- Protected routes: /dashboard, /profile, /find-jobs, /find-jobs/[id]
- Public routes: /, /login
- **`proxy.ts`** checks the session on every protected route. Next.js 16 renamed Middleware to Proxy — the file is `proxy.ts` at the project root exporting `proxy()`. A `middleware.ts` file is deprecated.
- On login → redirect to /dashboard

---

## InsForge Client Pattern

The package is **`@insforge/sdk`**, and the SSR helpers live at the **`@insforge/sdk/ssr`** subpath. There is no separate `@insforge/ssr` package.

Both helpers require `baseUrl` **and** `anonKey` — `anonKey` is optional on the base `createClient()` but mandatory here; they throw without it.

Two separate InsForge instances — never mix them:

```typescript
// lib/insforge-client.ts
// Browser-side — used in client components for auth state
import { createBrowserClient } from "@insforge/sdk/ssr";

export const insforge = createBrowserClient({ baseUrl: getInsforgeUrl() });

// lib/insforge-server.ts
// Server-side — used in Server Components, API routes, Server Actions, agent code
import { cookies } from "next/headers";
import { createServerClient } from "@insforge/sdk/ssr";

export async function createInsforgeServer() {
  const cookieStore = await cookies();
  return createServerClient({
    baseUrl: getInsforgeUrl(),
    cookies: cookieStore,
  });
}
```

`baseUrl` and `anonKey` fall back to `NEXT_PUBLIC_INSFORGE_URL` and `NEXT_PUBLIC_INSFORGE_ANON_KEY` when not passed explicitly.

---

## Auth Session Pattern

OAuth is **PKCE**, and the session is held in httpOnly cookies **on our own origin** so that Proxy, Server Components, Server Actions, and API routes can all read it.

The exchange runs with `client_type=server`, which returns the refresh token to us rather than storing it in a cookie on the InsForge domain — a cookie our own origin could never read.

Never hand-roll the PKCE dance, the token refresh, or the cookie writes. `@insforge/sdk/ssr` provides all three:

| Helper                  | Used in                                            |
| ----------------------- | -------------------------------------------------- |
| `createAuthActions()`   | Route handlers — `signInWithOAuth`, `exchangeOAuthCode`, `signOut` |
| `updateSession()`       | `proxy.ts` — refreshes an expired access token and writes rotated cookies |
| `clearAuthCookies()`    | Sign-out and any failed-session path               |
| `getAccessTokenCookieName()` / `getRefreshTokenCookieName()` | Cookie presence checks |

Cookie names come from the SDK (`insforge_access_token`, `insforge_refresh_token`) — never hardcode them.

```
/login
   ↓ user clicks a provider
GET /api/auth/{provider}          → signInWithOAuth(provider, { skipBrowserRedirect: true })
   ↓                                 codeVerifier saved to a short-lived httpOnly cookie
provider consent screen
   ↓ redirects back with ?insforge_code=
GET /api/auth/callback            → exchangeOAuthCode(code, codeVerifier)
   ↓                                 SDK writes both auth cookies
/dashboard
```

Every redirect URL used here must be listed in `allowedRedirectUrls` in the InsForge dashboard, or the provider rejects the callback.

---

## Browserbase Session Pattern

```typescript
// Company research session — single session, sequential page visits
const session = await bb.sessions.create({
  projectId: process.env.BROWSERBASE_PROJECT_ID!,
  timeout: 120, // 2 minute session — visits 3-4 pages max
});
```

---

## Job Discovery Pattern

**Adzuna API — job search**

```typescript
const response = await fetch(
  `https://api.adzuna.com/v1/api/jobs/us/search/1?` +
    `app_id=${process.env.ADZUNA_APP_ID}&` +
    `app_key=${process.env.ADZUNA_APP_KEY}&` +
    `what=${encodeURIComponent(jobTitle)}&` +
    `where=${encodeURIComponent(location)}&` +
    `category=it-jobs&` +
    `results_per_page=10&` +
    `content-type=application/json`,
);
const data = await response.json();
// data.results — array of job listings
// Each job: title, company.display_name, location.display_name,
//           salary_min, salary_max, description, redirect_url, created
```

---

## Company Research Pattern

Built in Feature 13 — `agent/research.ts` is the reference implementation, and
`library-docs.md § Stagehand` documents the installed v3 API. The shape:

```typescript
// Single session — visits company homepage and sub pages sequentially.
// createResearchSession() in lib/browserbase.ts, createStagehand(sessionId) in
// lib/stagehand.ts. Stagehand v3 (verified against installed 3.7.1 types):
// the active page comes from stagehand.context.activePage(), which can return
// undefined — there is no stagehand.page on this version — and extract() is
// positional: extract(instruction, zodSchema, { timeout }).
const session = await createResearchSession();
const stagehand = await createStagehand(session.id);
const page = stagehand.context.activePage(); // undefined → degrade

// Homepage URL comes from following the job's apply link with a plain
// server-side fetch(redirect: "follow") and stripping the landing host to its
// root domain — build-plan.md § Feature 13 has the recipe;
// deriveHomepageUrl() in agent/research.ts implements it, with a fetch
// timeout, multi-part-TLD handling (co.uk, com.au) and an ATS denylist
// (greenhouse, lever, workday…) the sketch here used to lack. Guessing
// https://www.{company}.com is the fallback, not the first resort.

// Navigate and extract — graceful degrade if a page will not read
try {
  await page.goto(homepageUrl, { timeoutMs: 20_000 });
  const content = await stagehand.extract(instruction, schema, {
    timeout: 30_000,
  });
} catch (error) {
  // Log and continue — Gemini synthesizes from whatever was collected
}

// Always close, in a finally — a browser failure is never a run failure
await stagehand.close();
```

---

## Invariants

Rules the AI agent must never violate:

- API routes contain no UI logic. Components contain no DB logic.
- Agent code in `/agent` never imports from `/components` or `/actions`.
- Server Actions never call agent functions. Agent functions are only called from API routes.
- All InsForge server-side writes use `createInsforgeServer()` — never the browser client.
- No hardcoded hex values or raw Tailwind color classes in components — use CSS variables from ui-tokens.md. **One exception: `lib/resume-pdf.tsx`.** A PDF resolves no CSS variables, so the tokens it needs are copied in as literals with a comment saying so. Nothing else may claim this exception.
- Every Stagehand action is wrapped in try/catch. Failures are logged to agent_logs, never thrown to crash the run.
- Company research always returns a dossier — even if browser research fails, Gemini synthesizes from company name and job description alone. Never return empty.
- Browserbase sessions are always closed with stagehand.close() when done — never leave sessions open.
- Always scope InsForge queries to the current user_id — never query without a user filter.
- Adzuna API always includes category=it-jobs — never search without this filter.
- jobs.source is always 'search' or 'url' — never any other value.
