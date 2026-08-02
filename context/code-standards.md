# Code Standards

Implementation rules and conventions for the entire project. The AI agent must follow these in every session without exception. These rules prevent pattern drift across sessions.

---

## Engineering Mindset

The AI agent on this project operates as a senior engineer. This means:

- **Think before implementing** — understand what is being built and why before writing a single line
- **Read context files first** — never assume, always verify against architecture.md and project-overview.md
- **Scope is sacred** — only build what the current feature requires. Never go beyond scope even if it seems helpful
- **Every feature must be testable** — if it cannot be verified immediately after implementation, it is incomplete
- **Clean over clever** — simple readable code that a junior developer can understand is always preferred over clever abstractions
- **One thing at a time** — complete one feature fully before touching the next
- **Failures are expected** — wrap agent operations in try/catch, log failures, never let one failure crash everything

---

## TypeScript

- Strict mode enabled in tsconfig.json — no exceptions
- Never use `any` — use `unknown` and narrow the type
- Never use type assertions (`as SomeType`) unless absolutely necessary and commented why
- All function parameters and return types must be explicitly typed
- Use `type` for object shapes and unions — use `interface` only for extendable component props
- All async functions must have proper error handling — never let promises float unhandled
- Use `const` by default — only use `let` when reassignment is necessary

---

## Next.js 16 Conventions

- App Router only — no Pages Router
- React 19 — use React 19 APIs throughout
- All components are Server Components by default
- Only add `"use client"` when the component requires:
  - useState or useReducer
  - useEffect
  - Browser APIs
  - Event listeners
  - Third party client-only libraries (PostHog browser side)
- Never add `"use client"` to layout files unless absolutely required
- Data fetching happens in Server Components — never fetch in Client Components directly. **One sanctioned exception:** a client component may `fetch()` an own-origin API route when it is performing a *mutation* that a Server Action cannot carry — today that means file upload only, because Server Action bodies are capped at 1MB (`ResumeUpload` → `POST /api/resume/upload`). Reads are never fetched from a client component. Any such call needs its own try/catch and a user-visible error
- Route handlers live in `app/api/` — never put business logic directly in route handlers
- Server Actions live in `actions/` — never define Server Actions inline in components
- **Middleware is called Proxy in Next.js 16** — the file is `proxy.ts` at the project root exporting `proxy()`. `middleware.ts` is deprecated; never create one.
- Dynamic route params and `searchParams` are Promises — always `await` them
- Caching is uncached by default — all dynamic code runs at request time
- Always read Next.js documentation before implementing any Next.js specific feature — APIs may differ from training data

---

## File and Folder Naming

- Folders: kebab-case — `job-details`, `agent-controls`
- Component files: PascalCase — `StatsBar.tsx`, `RecentActivity.tsx`
- Utility files: camelCase — `browserbase.ts`, `posthog-client.ts`
- Type files: camelCase — `index.ts`
- API route files: always `route.ts`
- Server Action files: camelCase — `profile.ts`, `jobs.ts`
- One component per file — never export multiple components from one file
- Index files only in `components/ui/` — never barrel export from other folders

---

## Component Structure

Every component follows this exact order:

```typescript
"use client"; // only if needed

// 1. External imports
import { useState } from "react";
import { Button } from "@/components/ui/button";

// 2. Internal imports
import { StatsCard } from "@/components/dashboard/StatsCard";

// 3. Type definitions
type Props = {
  jobId: string;
  matchScore: number;
};

// 4. Component
export function ComponentName({ jobId, matchScore }: Props) {
  // state
  // derived values
  // handlers
  // return JSX
}
```

- Never use default exports for components — always named exports
- Props type defined directly above the component — not in a separate types file unless shared
- No inline styles — all styling via Tailwind classes using CSS variables from ui-tokens.md

---

## API Route Handlers

```typescript
// app/api/agent/find/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createInsforgeServer } from "@/lib/insforge-server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // validate body
    // call agent function
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("[agent/find]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

- Every route handler has a try/catch
- Every route handler validates the request body before processing
- Errors are logged with the route path as prefix: `[agent/find]`
- Always return `{ success: boolean, data?: T, error?: string }`
- Never return raw data without the success wrapper

---

## Server Actions

```typescript
// actions/profile.ts

"use server";

import { revalidatePath } from "next/cache";
import { createInsforgeServer } from "@/lib/insforge-server";

export async function saveProfile(formData: ProfileFormData) {
  try {
    const insforge = await createInsforgeServer();
    // validate
    // write to DB
    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    console.error("[actions/profile]", error);
    return { success: false, error: "Failed to save profile" };
  }
}
```

- Every Server Action has a try/catch
- Every Server Action returns `{ success: boolean, error?: string }`
- Always call `revalidatePath` after mutations that affect page data
- Never throw from Server Actions — always return the error
- Always authenticate inside the action. A Server Action compiles to a POST endpoint anyone can call; rendering the form on a protected page is not a security boundary
- Validate input with zod before writing. The client is untrusted, and a bad enum otherwise surfaces as an opaque Postgres CHECK error rather than something a user can act on
- **The caller needs its own try/catch too.** The action returns its errors rather than throwing, but the *call* can still reject — dropped connection, restarted server, 500 before the body runs. Without it the status never updates and the button stays stuck pending

---

## Agent Code

```typescript
// agent/adzuna.ts

export async function discoverJobs(
  jobTitle: string,
  location: string,
  profile: Profile,
  runId: string,
): Promise<{ success: boolean; jobs?: Job[]; error?: string }> {
  try {
    // implementation
    return { success: true, jobs };
  } catch (error) {
    await logAgentError(runId, null, error);
    return { success: false, error: String(error) };
  }
}
```

- Every agent function returns `{ success: boolean, error?: string }`
- Every agent function has a try/catch — never let one failure crash the run
- Errors are always logged to agent_logs table before returning
- Agent functions never import from `components/` or `actions/`
- Agent functions never use React hooks or browser APIs

---

## InsForge Client Usage

```typescript
// Browser context — Client Components only
import { insforge } from "@/lib/insforge-client";

// Server context — Server Components, Route Handlers, Server Actions, Agent
import { createInsforgeServer } from "@/lib/insforge-server";
const insforge = await createInsforgeServer();

// Just need the signed-in user? Use the wrapper — it logs and returns null on error.
import { getCurrentUser } from "@/lib/insforge-server";
const user = await getCurrentUser();
```

The package is `@insforge/sdk`; SSR helpers are at `@insforge/sdk/ssr`. There is no `@insforge/ssr` package.

- Never use the browser client in server context
- Never use the server client in browser context
- Always await createInsforgeServer() — it reads cookies asynchronously
- Always scope every query to the current user_id — never query without a user filter

---

## Error Handling

- Never use empty catch blocks — always log or handle
- Console errors always include context prefix: `[component/function name]`
- User-facing errors must be human readable — never expose raw error messages
- Agent errors go to agent_logs table — never surface raw agent errors to the UI
- API route errors return `status: 500` with generic message — never expose internals

---

## PostHog Events

All PostHog events must use these exact event names. Never invent new event names without adding them here first.

Events are never captured by calling `posthog.capture()` directly. Client-side captures go through `captureEvent()` in `lib/posthog-client.ts`, whose `AnalyticsEvent` union is the single source of truth for names and payloads — an unlisted name is a type error. Adding an event means adding it to that union **and** to a table below.

### Product events

The events the dashboard charts are built on. Each belongs to a feature that has not been built yet, so none of them fire today.

| Event                | When                                       | Key Properties             | Status             |
| -------------------- | ------------------------------------------ | -------------------------- | ------------------ |
| `job_search_started` | Find Jobs button clicked                   | userId, jobTitle, location | built Feature 10   |
| `job_found`          | Each job discovered and saved              | userId, source, matchScore | built Feature 10   |
| `profile_completed`  | User saves complete profile for first time | userId                     | built Feature 06   |
| `company_researched` | Company research dossier generated         | userId, jobId, company     | pending Feature 13 |

`job_found` powers the Jobs Found Over Time and Match Score Distribution dashboard charts.
`company_researched` powers the Company Research Activity dashboard chart.
Always fire these with correct properties.

These four are captured **server-side** using `createPostHogServer()` from `lib/posthog-server.ts` — from the API route that performs the work, or from the Server Action in `profile_completed`'s case. Always `await posthog.shutdown()` in the same function or the event is lost. Always include `userId` as a property.

Server-side events do **not** join the `AnalyticsEvent` union in `lib/posthog-client.ts` — that union types the browser capture surface only. Wrap the capture in its own try/catch: `createPostHogServer()` throws when the key is unset, and analytics must never fail the write it is measuring.

`profile_completed` fires on the save where `is_complete` transitions from false to true, which is why `saveProfile` reads the existing flag before upserting. Re-saving an already-complete profile does not re-fire it.

### Auth lifecycle events

Added in Feature 03. These are captured **client-side** and carry no `userId` property — identity comes from `posthog.identify()`, which the root layout calls for every signed-in render.

| Event                   | When                                    | Key Properties |
| ----------------------- | --------------------------------------- | -------------- |
| `login_page_viewed`     | `/login` mounts                         | —              |
| `oauth_sign_in_started` | A provider button is clicked            | provider       |
| `oauth_sign_in_failed`  | `/login` renders with an `?error=` code | reason         |
| `user_signed_in`        | The OAuth exchange succeeds             | —              |
| `user_logged_out`       | The logout form is submitted            | —              |

`oauth_sign_in_started` → `user_signed_in` is the sign-in conversion funnel; `oauth_sign_in_failed` carries the same error codes the login page maps to human copy.

`user_signed_in` cannot be captured on the landing page alone — every page load there would fire it. The callback route appends `SIGNED_IN_PARAM` to the post-login redirect, and `SignInTracker` in the root layout captures once and strips the param. It lives in the layout rather than on `/profile` so it survives `POST_LOGIN_ROUTE` moving to `/dashboard` in Feature 14.

These nine events are the only events in this project. Do not add more without updating these tables first.

---

## Environment Variables

All environment variables defined in `.env.local` for development. Never hardcode any key, URL, or secret anywhere in the codebase.

| Variable                        | Used In                |
| ------------------------------- | ---------------------- |
| `NEXT_PUBLIC_INSFORGE_URL`      | lib/insforge-client.ts |
| `NEXT_PUBLIC_INSFORGE_ANON_KEY` | lib/insforge-client.ts |
| `BROWSERBASE_API_KEY`           | lib/browserbase.ts     |
| `BROWSERBASE_PROJECT_ID`        | lib/browserbase.ts     |
| `GEMINI_API_KEY`                | lib/gemini.ts          |
| `ADZUNA_APP_ID`                 | lib/adzuna.ts          |
| `ADZUNA_APP_KEY`                | lib/adzuna.ts          |
| `NEXT_PUBLIC_POSTHOG_KEY`       | instrumentation-client.ts, lib/posthog-server.ts |
| `NEXT_PUBLIC_POSTHOG_HOST`      | instrumentation-client.ts, lib/posthog-server.ts |

`NEXT_PUBLIC_` prefix means the variable is exposed to the browser. Never add `NEXT_PUBLIC_` to secret keys.

---

## Match Threshold

The job match threshold is defined once as a constant. Never hardcode this value anywhere else.

```typescript
// lib/utils.ts
export const MATCH_THRESHOLD = 70;
```

Import and use `MATCH_THRESHOLD` everywhere this value is needed.

---

## Import Aliases

Always use the `@/` alias — never use relative imports that go up more than one level.

```typescript
// Correct
import { Button } from "@/components/ui/button";
import { insforge } from "@/lib/insforge-client";
import { MATCH_THRESHOLD } from "@/lib/utils";

// Never
import { Button } from "../../../components/ui/button";
```

---

## Comments

- No comments explaining what the code does — code must be self-explanatory
- Comments only for why — explaining a non-obvious decision
- Agent functions may have a brief comment explaining the Browserbase or Stagehand strategy
- Never leave TODO comments in committed code

---

## Dependencies

Never install a new package without a clear reason. Before installing anything check:

1. Does shadcn/ui already have this component?
2. Does Next.js already provide this functionality?
3. Is there a simpler native solution?

Approved dependencies for this project:

- `@insforge/sdk` — InsForge client (SSR helpers at `@insforge/sdk/ssr`)
- `class-variance-authority`, `clsx`, `tailwind-merge`, `radix-ui`, `tw-animate-css` — installed by shadcn/ui init
- `@browserbasehq/sdk` — Browserbase sessions
- `@browserbasehq/stagehand` — AI browser control
- `@google/genai` — Google Gemini API (v2 Interactions surface)
- `posthog-js` — PostHog browser client
- `posthog-node` — PostHog server client
- `@react-pdf/renderer` — Resume PDF generation
- `zod` — Schema validation
- `lucide-react` — Icons
- `tailwindcss` — Styling
- `shadcn/ui` components — UI primitives

Do not install any other packages without updating this list first.
