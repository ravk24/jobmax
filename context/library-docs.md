# Library Docs

Project-specific usage patterns for every third party library in this project. This file only covers how we use each library in this specific project — rules, patterns, and constraints specific to JobMax.

Read the relevant section before implementing any feature that touches these libraries.

---

## Before Using Any Library

Before implementing any feature that uses a third party library:

1. **Check AGENTS.md** at the project root — it lists every skill installed for this project and how to use them. Skills contain up-to-date API documentation, usage patterns, and best practices specific to this codebase.

2. **Check if an MCP server is configured** for that library. Some tools have MCP servers that give the AI agent direct access to documentation, logs, and debugging tools. If an MCP server is available — use it before falling back to general knowledge.

3. **Read this file** for project-specific patterns that override general library knowledge.

The order of authority is:

```
MCP server (real-time docs) → Skills via AGENTS.md → This file (project rules) → General training knowledge
```

Never rely on general training knowledge alone for library APIs — they change frequently and training data may be outdated.

---

## InsForge

**Check first:** Check AGENTS.md for an installed InsForge skill. If an InsForge MCP server is configured — use it. The skill/MCP will have the latest API patterns.

### Package and imports

The package is **`@insforge/sdk`**. SSR helpers are at the **`@insforge/sdk/ssr`** subpath. There is no `@insforge/ssr` package — importing it fails.

```typescript
import { createClient } from "@insforge/sdk"; // base client (non-SSR contexts)
import {
  createBrowserClient,
  createServerClient,
  createAuthActions,
  updateSession,
  clearAuthCookies,
  getAccessTokenCookieName,
  getRefreshTokenCookieName,
} from "@insforge/sdk/ssr";
```

`createBrowserClient` and `createServerClient` **throw** without both `baseUrl` and `anonKey`. `anonKey` is optional on the base `createClient()` but required by the SSR helpers. Both fall back to `NEXT_PUBLIC_INSFORGE_URL` / `NEXT_PUBLIC_INSFORGE_ANON_KEY`.

### Client vs Server

Two separate instances — never mix them:

```typescript
// lib/insforge-client.ts — browser context only
import { createBrowserClient } from "@insforge/sdk/ssr";
import { getInsforgeUrl } from "@/lib/auth";

export const insforge = createBrowserClient({ baseUrl: getInsforgeUrl() });
```

```typescript
// lib/insforge-server.ts — server context only
import { cookies } from "next/headers";
import { createServerClient } from "@insforge/sdk/ssr";
import { getInsforgeUrl } from "@/lib/auth";

export async function createInsforgeServer() {
  const cookieStore = await cookies();
  return createServerClient({
    baseUrl: getInsforgeUrl(),
    cookies: cookieStore,
  });
}
```

**Rules:**

- Browser client — Client Components, browser-side auth state, realtime subscriptions
- Server client — Server Components, API routes, Server Actions, agent functions
- Never use browser client in server context
- Never use server client in browser context
- The browser client exposes only `getCurrentUser`, `getProfile`, `getPublicAuthConfig` on `auth`. Mutating auth calls are server-side only.

---

### Auth

The method is `getCurrentUser()`, not `getUser()`, and it returns `{ data: { user }, error }`.

```typescript
// Get current user in server context
const insforge = await createInsforgeServer();
const {
  data: { user },
  error,
} = await insforge.auth.getCurrentUser();
if (!user) redirect("/login");
```

Prefer the `getCurrentUser()` wrapper in `lib/insforge-server.ts`, which logs and returns `null` on error.

### OAuth — PKCE, server-side session

Google and GitHub only. Three route handlers, no callback *page*: a page component cannot set cookies during a redirect.

```typescript
// app/api/auth/[provider]/route.ts — start the flow
// The response must exist first: createAuthActions() throws at construction
// without a writable cookie store, even though signInWithOAuth writes none.
const response = NextResponse.redirect(new URL(LOGIN_ROUTE, req.nextUrl.origin));
const actions = createAuthActions({
  baseUrl: getInsforgeUrl(),
  requestCookies: req.cookies,
  responseCookies: response.cookies,
});
const { data, error } = await actions.signInWithOAuth(provider, {
  redirectTo: new URL("/api/auth/callback", req.nextUrl.origin).toString(),
  skipBrowserRedirect: true,
});
// retarget the placeholder redirect, persist data.codeVerifier in a
// short-lived httpOnly cookie, return the response
response.headers.set("location", data.url);
```

```typescript
// app/api/auth/callback/route.ts — finish the flow
const response = NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
const actions = createAuthActions({
  baseUrl: getInsforgeUrl(),
  requestCookies: req.cookies,
  responseCookies: response.cookies, // SDK writes both auth cookies here
});
const { error } = await actions.exchangeOAuthCode(code, codeVerifier);
```

```typescript
// proxy.ts — refresh an expired access token before the request proceeds
const { accessToken, error } = await updateSession({
  baseUrl: getInsforgeUrl(),
  requestCookies: toCookieStore(req.cookies),
  responseCookies: response.cookies,
});
```

**Rules:**

- Never hand-roll the PKCE challenge, the refresh call, or the cookie writes — the SDK owns all three
- The exchange runs `client_type=server` internally; that is what lets us hold the session on our own origin
- Refresh tokens **rotate** on every refresh — always persist the new one, which `updateSession` does for you
- Cookie names come from `getAccessTokenCookieName()` / `getRefreshTokenCookieName()` — never hardcode them
- Next's `req.cookies` does not structurally match the SDK's `CookieStore`; adapt it, never cast it
- Every redirect URL must be listed in `allowedRedirectUrls` in the dashboard or the provider rejects the callback
- Auth error codes are mapped to human-readable copy on the login page — never surface a raw SDK error

---

### DB Queries

**The query builder hangs off `.database`, not off the client.** `InsForgeClient` exposes `readonly database` and `readonly storage`; `insforge.from(...)` does not exist. An earlier version of this file taught `insforge.from("jobs")` — corrected in Feature 06, which was the first code to actually write to the database and would have failed on its first call.

```typescript
// Read
const { data, error } = await insforge.database
  .from("jobs")
  .select("*")
  .eq("user_id", user.id)
  .order("found_at", { ascending: false });

// Insert
const { data, error } = await insforge.database
  .from("jobs")
  .insert({ user_id: user.id, title, company, match_score })
  .select()
  .single();

// Update
const { error } = await insforge.database
  .from("jobs")
  .update({ company_research: dossier })
  .eq("id", jobId)
  .eq("user_id", user.id); // always scope to user

// Upsert — insert if missing, update if present
const { error } = await insforge.database
  .from("profiles")
  .upsert({ id: user.id, email: user.email, full_name }, { onConflict: "id" });
```

`Database.from()` returns a real postgrest-js `PostgrestQueryBuilder`, so the full PostgREST surface is available — including `.upsert()`, `.maybeSingle()`, `.range()` and `.or()` — even though the InsForge MCP docs list only insert/update/delete/select.

**`.upsert()` only writes the columns present in the payload.** PostgREST's merge-duplicates emits `ON CONFLICT DO UPDATE SET` for the supplied keys and leaves every other column untouched. Feature 06 relies on this: the profile form and the resume upload both upsert the same `profiles` row, and neither clobbers the other because each omits the columns it does not own.

### `.or()` can only be called once per query — found in Feature 10

Two `.or()` calls on the same builder send two `or=` parameters, and PostgREST rejects the request with an empty error message. It is not an AND. A text search worked, the Low Match band worked, and combining them failed — the kind of gap that only appears when two independent filters are exercised together.

Groups that must be ANDed have to be folded into one expression using PostgREST's nested boolean syntax:

```typescript
// Wrong — two or= params, request rejected
builder.or("company.ilike.%x%,title.ilike.%x%").or("match_score.lt.70,match_score.is.null");

// Right — one or=, distributed into nested and(...) terms
builder.or(
  "and(company.ilike.%x%,match_score.lt.70)," +
  "and(company.ilike.%x%,match_score.is.null)," +
  "and(title.ilike.%x%,match_score.lt.70)," +
  "and(title.ilike.%x%,match_score.is.null)",
);
```

A single condition never needs this — keep it as `.eq()` / `.gte()`, which chain and AND normally. Only OR groups collide.

**A value containing a comma must be double-quoted**, or it splits the expression and the query silently means something else. `company.ilike."%Smith, Jones%"`. `%`, `_`, `*` and `\` have no escape on this surface — `\` is LIKE's own escape character and PostgREST gives no way to override it — so strip them rather than passing them through.

**Rules:**

- Always go through `insforge.database.from(...)` — never `insforge.from(...)`
- Never call `.or()` twice on one query — fold the groups into a single expression
- Always double-quote an `ilike` value built from user input
- Always scope queries to `user_id` — never query without user filter
- Always handle the `error` return — never assume success
- Use `.single()` when expecting exactly one row, `.maybeSingle()` when zero rows is a normal case
- Omit a column from an upsert payload when another write path owns it

---

### Storage

**`upload()` takes two arguments, not three.** The signature is `upload(path: string, file: File | Blob)` — there is no options object, so there is no `contentType` and no `upsert` flag. Overwrite is implicit PUT semantics: uploading to an existing key replaces the object in place, which is exactly the behaviour the one-active-resume-per-user rule needs. An earlier version of this file taught a three-argument call; corrected in Feature 06.

```typescript
const { data, error } = await insforge.storage
  .from("resumes")
  .upload(`${userId}/resume.pdf`, file);

// data.url is the URL to persist — not getPublicUrl()
await insforge.database
  .from("profiles")
  .upsert({ id: userId, email, resume_pdf_url: data.url }, { onConflict: "id" });
```

**The `resumes` bucket is private** (`isPublic: false`). `getPublicUrl()` still exists on the SDK, but on a private bucket it returns a URL that resolves for nobody — use the `data.url` the upload response already gives you, and read it back with an authenticated server client.

**`resume_pdf_url` is a server-side handle, not something a browser can open.** The session lives in httpOnly cookies on *our* origin (`client_type=server`), so the browser holds no credentials for the InsForge domain and a plain `<a href={resume_pdf_url}>` fails.

**The browser reaches the bytes through our own route, not through a storage URL.** `GET /api/resume/download` re-reads the session, derives the object key from it, `download()`s the object with a server client and streams it back with `Content-Disposition: attachment`. The client side is a plain `<a href="/api/resume/download" download>` — a same-origin navigation carries the session cookie automatically, so the request is authenticated with no JavaScript, and `code-standards.md` reserves client-side `fetch()` for mutations anyway.

Deriving the key from the session rather than from a query parameter is the point: there is no path a caller can supply and therefore no other user's resume to ask for.

```typescript
const { data: blob, error } = await insforge.storage
  .from(RESUME_BUCKET)
  .download(resumeObjectKey(user.id));

return new NextResponse(blob, {
  headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": 'attachment; filename="resume.pdf"',
    "Cache-Control": "no-store", // the object changes; the URL never does
  },
});
```

> **`createSignedUrl()` was used for this and is no longer.** `/profile` used to mint a one-hour signed URL on every render and render the filename as a link to it. It worked, but it was a second way to reach the same bytes, it cost a network round trip per page render, and it handed out a capability that outlived the visit. The method still exists and is still correct for a link that must work outside our origin — there is no such case in this project today.

**Deleting:**

```typescript
const { error } = await insforge.storage.from(RESUME_BUCKET).remove(key);
```

`remove()` is overloaded for one path or an array of them.

**Storage paths:**

- Base resume: `resumes/{user_id}/resume.pdf`

**Rules:**

- `upload(path, file)` — two arguments; overwrite is automatic, never pass an options object
- Save `data.url` from the upload response back to the DB — never `getPublicUrl()` on a private bucket
- Upload with `.upsert()`, not `.update()` — the profile row may not exist yet, and an update matching zero rows drops the URL silently
- Never write files to disk — always upload the File or Blob directly to storage
- **Every resume write goes through `replaceStoredResume()` in `lib/resume-storage.ts`** — never call `remove`/`upload`/`upsert` directly from a route. Two writers share one key, and the failure handling between those three steps is what keeps the row and the object agreeing
- Serve private objects through an own-origin route, never by handing the browser a storage URL

---

## Adzuna API

**Check first:** Check AGENTS.md for an installed Adzuna skill. If none exists — use this file and the official Adzuna API docs.

### Job Search

```typescript
// lib/adzuna.ts
export async function searchJobs(
  jobTitle: string,
  location: string,
  country: string = "us",
): Promise<AdzunaJob[]> {
  const params = new URLSearchParams({
    app_id: process.env.ADZUNA_APP_ID!,
    app_key: process.env.ADZUNA_APP_KEY!,
    what: jobTitle,
    category: "it-jobs", // always filter to IT jobs
    results_per_page: "10",
    "content-type": "application/json",
  });

  // Only add where if location is provided
  if (location) {
    params.set("where", location);
  }

  const response = await fetch(
    `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`,
  );

  if (!response.ok) {
    throw new Error(`Adzuna API error: ${response.status}`);
  }

  const data = await response.json();
  return data.results || [];
}
```

### Response Shape

Each Adzuna job result contains:

```typescript
type AdzunaJob = {
  id: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string };
  description: string; // snippet only — not full description
  redirect_url: string; // Adzuna tracking URL → redirects to actual job
  salary_min?: number;
  salary_max?: number;
  salary_is_predicted: "0" | "1"; // "1" means salary is estimated
  contract_type?: string; // "permanent" | "contract" — often absent
  contract_time?: string; // "full_time" | "part_time" — often absent
  created: string; // ISO date string
  category: { tag: string; label: string };
};
```

**Everything optional here really is optional.** Verified against the live API in Feature 10: `contract_type` and `contract_time` are frequently both absent, and `salary_min` often equals `salary_max` (a predicted figure), which formats as "$90k - $90k" and reads as a bug. Parse each result on its own so one malformed listing costs that listing, not the whole search.

### `redirect_url` is not an identity — verified 2026-08-02

Two identical searches a second apart return the same listing with a **different `se=` tracking token**. Deduping on the full URL therefore matches nothing, and every repeat search duplicates every row. The path without the query string is stable and carries the Adzuna ad id:

```typescript
const [canonical] = job.redirect_url.split("?");
```

`jobs.source_url` holds that canonical form — it is the listing's identity and what the dedupe reads back. `jobs.external_apply_url` holds the full tracked URL, which is what the user clicks.

### `where` takes place names only

There is no remote filter on this endpoint. `where=Remote` matches no place and returns **zero results** — which is the first thing anyone types, since the design's own placeholder reads "Remote, New York...". Strip the word before sending: "Remote" becomes a country-wide search (omit `where` entirely), and "Remote, New York" still searches New York.

### Saving Jobs to DB

```typescript
// Map Adzuna result to jobs table
const jobRecord = {
  user_id: userId,
  run_id: runId,
  source: "search", // always 'search' for Adzuna jobs
  source_url: canonicalJobUrl(job), // stable identity — see above
  external_apply_url: job.redirect_url, // the tracked link the user clicks
  title: job.title,
  company: job.company.display_name,
  location: job.location?.display_name ?? null,
  // Currency follows the country endpoint, and min === max is common.
  salary: formatAdzunaSalary(job, country),
  // NOT `job.contract_type || "fulltime"`. That writes "permanent", which the
  // jobs_job_type CHECK rejects — failing the entire insert, not one column.
  // Adzuna splits the two axes; toJobType() in lib/adzuna.ts maps them.
  job_type: toJobType(job),
  about_role: job.description, // Adzuna returns snippet — used as description
  match_score: scoredJob.matchScore,
  match_reason: scoredJob.matchReason,
  matched_skills: scoredJob.matchedSkills,
  missing_skills: scoredJob.missingSkills,
  found_at: new Date().toISOString(),
};
```

**Rules:**

- Always include `category=it-jobs` — never search Adzuna without this filter
- Never pass `where` if location is empty — omit the parameter entirely, and strip "remote" before deciding whether it is empty
- Never key a dedupe on `redirect_url` — use the canonical path, which is the only stable part
- Never map `contract_type` straight onto `jobs.job_type` — the CHECK constraint rejects "permanent"
- `source` is always `'search'` for Adzuna jobs — never any other value
- `salary_is_predicted: "1"` means Adzuna estimated the salary — this is normal, and it is why `salary_min === salary_max` happens
- Adzuna description is a snippet — Gemini scores from it, not a full description
- Default country to `'us'` — support `gb`, `au`, `ca` as alternatives. Detect from country names only, never city names: a wrong guess returns plausible results for the wrong country

---

## Browserbase

**Check first:** Check AGENTS.md for an installed Browserbase skill. If a Browserbase MCP server is configured — use it. The skill/MCP will have the latest session management and API patterns.

### Session Creation — Company Research

```typescript
import Browserbase from "@browserbasehq/sdk";

const bb = new Browserbase({ apiKey: process.env.BROWSERBASE_API_KEY! });

// Single session for company research — sequential page visits
const session = await bb.sessions.create({
  projectId: process.env.BROWSERBASE_PROJECT_ID!,
  timeout: 120, // 2 minute session — visits 3-4 pages max
});
```

**Important — only the browser runs on Browserbase; the route waits for the run (corrected in Feature 13):**
An earlier version of this note claimed the API route "triggers the session and returns while it continues running". That does not describe this codebase: only the *browser* lives on Browserbase's infrastructure — every `extract()` call and the Gemini synthesis are awaited inside `/api/agent/research`, so the route holds its connection for the whole run (roughly 40 seconds to 3 minutes; worst case ≈ 10s redirect-follow + 120s session cap + 90s synthesis). On the local node server this needs no configuration. **If this app ever deploys to a serverless platform, the route needs `export const maxDuration = 300`** — the opposite of what this note used to say. A client that navigates away does not cancel the server run; it completes and saves, and the dossier is there on return.

**Rules:**

- Always use single sessions — never parallel sessions (free plan limit)
- Session timeout is 120 seconds — sufficient for 3-4 page visits
- Always end sessions cleanly — call stagehand.close() when done
- Project ID always from `process.env.BROWSERBASE_PROJECT_ID` — never hardcode
- Browserbase client lives in `lib/browserbase.ts` — always import from there

---

## Stagehand

**Check first:** Check AGENTS.md for an installed Stagehand skill. If a Stagehand MCP server is configured — use it. The skill/MCP will have the latest act() and extract() patterns.

### Initialisation

Installed at **3.7.1** (the v3 API — `Stagehand` is an alias of the `V3` class). Initialisation lives in `lib/stagehand.ts`; never construct inline. Verified against the installed types in Feature 13:

```typescript
import { Stagehand } from "@browserbasehq/stagehand";

const stagehand = new Stagehand({
  env: "BROWSERBASE",
  apiKey: process.env.BROWSERBASE_API_KEY,
  projectId: process.env.BROWSERBASE_PROJECT_ID,
  browserbaseSessionID: session.id,
  model: {
    // Provider-prefixed. lib/stagehand.ts derives this from GEMINI_MODEL so
    // lib/gemini.ts stays the single place the model is pinned.
    modelName: "google/gemini-3.6-flash",
    apiKey: getGeminiApiKey(),
  },
  disablePino: true,
});

await stagehand.init();
// Returns Page | undefined — handle the undefined, never assert it away.
const page = stagehand.context.activePage();
```

### extract()

**Positional in v3, not an options object** — an earlier version of this file taught `extract({ instruction, schema })`, which does not type-check on 3.7.1. The signature is `extract(instruction, zodSchema, options?)`, where options carries `timeout` (ms). `extract()` reads the **current** page — every extraction is preceded by a `page.goto()`.

```typescript
import { z } from "zod";

const result = await stagehand.extract(
  "Extract the company overview, main product description, and any technology mentions from this page.",
  z.object({
    companyOverview: z.string().optional(),
    mainProduct: z.string().optional(),
    techMentions: z.array(z.string()).optional(),
  }),
  { timeout: 30_000 },
);
```

### act()

Also positional in v3: `act(instruction, options?)`.

```typescript
// Always wrap in try/catch
try {
  await stagehand.act("Click the About link in the navigation");
} catch (error) {
  await logAgentError(runId, userId, "act failed", error);
}
```

### Company Research Pattern

Three-step process: homepage extraction → sub-page extraction → Gemini synthesis.
Job description and user profile come from DB — never re-fetch what you already have.
Browser's only job is the company website.

```typescript
// Step 1 — Homepage extraction (after page.goto(homepageUrl) — extract()
// reads the current page; the homepage URL derivation lives in
// deriveHomepageUrl() in agent/research.ts, per build-plan.md § Feature 13)
const homepageData = await stagehand.extract(
  "This is a company's homepage. Capture what the company actually does, who it's for, and any concrete signals (funding, customers, scale, mission, recent launches). Then find the internal links most worth visiting to research them as an employer.",
  z.object({
    oneLiner: z.string().describe("What the company does in one sentence"),
    productSummary: z
      .string()
      .describe("What they build/sell and who it's for"),
    signals: z
      .array(z.string())
      .describe("Funding, notable customers, scale, mission, recent news"),
    pageLinks: z
      .array(
        z.object({
          url: z.string(),
          kind: z.enum([
            "about",
            "careers",
            "blog",
            "engineering",
            "product",
            "team",
            "other",
          ]),
        }),
      )
      .describe("Internal links worth visiting"),
  }),
);

// If oneLiner and productSummary are empty — wrong site or parked domain
// Skip to synthesis with job description and profile only
if (!homepageData.oneLiner && !homepageData.productSummary) {
  await stagehand.close();
  // proceed to synthesis with empty companyResearch
}

// Step 2 — Sub-page extraction (max 3, prefer about/blog/engineering/product
// over careers; goto() each URL first — links resolved against the homepage,
// kept http(s) and same-root-domain only)
const subPageData = await stagehand.extract(
  "Extract substance that helps a candidate understand this company before applying: what they do, their values and how they work, the specific technologies and tools they use, notable projects or customers, and how the team operates. Ignore nav, footers, cookie banners, and generic marketing copy.",
  z.object({
    keyPoints: z.array(z.string()),
    technologies: z
      .array(z.string())
      .describe("Specific languages, frameworks, tools, platforms"),
    valuesOrCulture: z
      .array(z.string())
      .describe("Stated values, working style, team norms"),
    notable: z
      .array(z.string())
      .describe("Customers, funding, scale, projects, awards"),
  }),
);

// Step 3 — Gemini synthesis (after browser closes)
// Feed three data sources: company research + job from DB + profile from DB
const systemPrompt = `You are a sharp career strategist preparing a candidate to apply for a specific role. You are given (a) research collected from the company's own website, (b) the job posting, and (c) the candidate's profile. Produce a concise, concrete briefing that gives this specific candidate an edge for this specific role.

Rules:
- Ground every company claim in the provided research or job posting. Never invent funding, customers, headcount, or facts. If research was thin, infer carefully from the job posting and say what's inferred.
- Be specific to THIS candidate. Connect their actual skills and past work to this company's stack, product, and values. No generic advice that would apply to anyone.
- Turn the candidate's missing skills into a strategy: how to frame the gap honestly and what adjacent experience to lean on.
- Talking points and questions must reference real things from the research, the kind of detail that signals the candidate did their homework.
- Keep every item tight: one or two sentences. No fluff.

Return ONLY valid JSON matching this shape:
{
  "companyOverview": string,
  "techStack": string[],
  "culture": string[],
  "whyThisRole": string,
  "yourEdge": string[],
  "gapsToAddress": string[],
  "smartQuestions": string[],
  "interviewPrep": string[],
  "sources": string[]
}`;

const userPrompt = `COMPANY RESEARCH (from their website):
${JSON.stringify(companyResearch)}

JOB POSTING:
Title: ${job.title}
Company: ${job.company}
Description: ${job.description}
Matched skills (already computed): ${job.matched_skills.join(", ")}
Missing skills (already computed): ${job.missing_skills.join(", ")}

CANDIDATE PROFILE:
Current title: ${profile.current_title}
Experience: ${profile.years_experience} years, level ${profile.experience_level}
Skills: ${profile.skills.join(", ")}
Work history: ${JSON.stringify(profile.work_experience)}`;

const interaction = await getGemini().interactions.create({
  model: GEMINI_MODEL,
  system_instruction: systemPrompt,
  input: userPrompt,
  response_format: {
    type: "text",
    mime_type: "application/json",
    schema: z.toJSONSchema(dossierSchema),
  },
  // No temperature — it does not exist on the Interactions API (see § Google
  // Gemini below). Default thinking level on purpose: fusing three sources is
  // the one task here where deliberation is the point. Thinking tokens come
  // out of this same budget (767 were measured on a smaller task), which is
  // why it is 2500 and not the 800 an earlier version of this file taught —
  // unused headroom is free.
  generation_config: { seed: RESEARCH_SEED, max_output_tokens: 2500 },
});

// output_text is string | undefined — guard before parsing, validate with the
// same zod schema that generated the constraint. agent/research.ts is the
// reference implementation.
const dossier = dossierSchema.parse(JSON.parse(interaction.output_text));
```

**Dossier fields:**

| Field           | Type     | Purpose                                             |
| --------------- | -------- | --------------------------------------------------- |
| companyOverview | string   | What the company does                               |
| techStack       | string[] | Technologies they use                               |
| culture         | string[] | Values and working style                            |
| whyThisRole     | string   | Why this role exists                                |
| yourEdge        | string[] | Specific links between THIS candidate and this role |
| gapsToAddress   | string[] | Missing skills reframed as strategy                 |
| smartQuestions  | string[] | Questions that show real research                   |
| interviewPrep   | string[] | Topics to prepare for this role                     |
| sources         | string[] | Pages the company info came from                    |

**Rules:**

- Always use `extract()` with a Zod schema — never parse raw HTML or use regex
- Always wrap every `act()` and `extract()` in try/catch
- Always call `await stagehand.close()` when done — ends the Browserbase session
- Model always comes from `GEMINI_MODEL` in `lib/gemini.ts` — never hardcode a model string
- Synthesis uses a fixed `seed` and the **default** thinking level with a `2500` token budget — there is no temperature on this API, and thinking spends from the same budget
- Max 3 sub-pages — never exceed this on free plan
- Always close session in finally block — never leave sessions open even if research fails
- Job description and profile always come from DB — never re-fetch via browser
- If browser research returns empty — still run synthesis with job + profile only
- yourEdge, gapsToAddress, and smartQuestions are the most valuable fields — never skip them

## Google Gemini

**Check first:** Check AGENTS.md for an installed Gemini skill. The skill will have the latest API patterns and model capabilities.

**This is not the Gemini SDK you may remember.** `@google/genai` v2 exposes an **Interactions API** — `ai.interactions.create({ input })` returning `interaction.output_text`. The older `ai.models.generateContent({ contents })` / `response.text()` shape is superseded. Read the installed package types before writing code.

Package: `@google/genai` (v2.15.0 at time of writing). Not `openai`, not `@google/generative-ai`.

### Client

`lib/gemini.ts` owns the client and the model string. It follows the `getInsforgeUrl()` convention in `lib/auth.ts` — an accessor that throws on a missing key, not a bare `process.env` read.

```typescript
import { getGemini, GEMINI_MODEL } from "@/lib/gemini";

const gemini = getGemini();
```

The client is built on first call, not at import. A module-level `new GoogleGenAI(...)` would throw during `next build` on any machine without the key.

`new GoogleGenAI({})` would read `GEMINI_API_KEY` from the environment by itself, but we pass it explicitly through `getGeminiApiKey()` so a missing key fails with our own message instead of a 401 from Google at the first call.

Server-only, by convention rather than by the `server-only` package — the same convention `lib/profile-schema.ts` uses. `GEMINI_API_KEY` has no `NEXT_PUBLIC_` prefix, so a Client Component that imports this module ships code that can never authenticate.

### Structured JSON Response

Gemini takes a **JSON Schema**, not a zod schema, and constrains decoding to it. This is a real guarantee, not a prompt instruction — much stronger than the old `json_object` mode.

```typescript
import { z } from "zod";
import { getGemini, GEMINI_MODEL } from "@/lib/gemini";

const matchSchema = z.object({
  score: z.number().min(0).max(100),
  reason: z.string(),
  matchedSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
});

const interaction = await getGemini().interactions.create({
  model: GEMINI_MODEL,
  system_instruction: "You are a job matching assistant.",
  input: `Your prompt here`,
  response_format: {
    type: "text",
    mime_type: "application/json",
    schema: z.toJSONSchema(matchSchema),
  },
  generation_config: {
    seed: 7,
    max_output_tokens: 300,
    thinking_level: "minimal",
  },
});

if (!interaction.output_text) throw new Error("no output");
const result = matchSchema.parse(JSON.parse(interaction.output_text));
```

**`output_text` is `string | undefined`.** A blocked or truncated interaction returns none, and `JSON.parse(undefined)` throws. Guard it.

### There is no `temperature` on this API

`GenerationConfig_2` in v2.15.0 declares exactly ten fields — `image_config`, `max_output_tokens`, `seed`, `speech_config`, `stop_sequences`, `thinking_level`, `thinking_summaries`, `tool_choice`, `transcription_config`, `video_config`. `temperature` survives only on the legacy `models.generateContent` config, so passing it here does not compile.

**Use `seed` instead.** Verified: the same input returns byte-identical output across runs.

### Thinking tokens come out of the output budget

`gemini-3.6-flash` reasons before answering, and `max_output_tokens` covers both. Measured on a two-role resume with an 800 budget:

| `thinking_level` | Thought tokens | Output tokens | Result |
| --- | --- | --- | --- |
| default | 767 | 14 | truncated — unparseable JSON |
| `"minimal"` | 0 | 399 | complete |

A budget overrun does not shorten a field; it returns broken JSON and loses the whole call. For extraction, matching and scoring — transcription and classification, not reasoning — set `thinking_level: "minimal"`. Leave it at default only where the task genuinely needs deliberation.

`z.toJSONSchema()` is built into zod v4 — no converter package. The zod schema stays the single definition: it generates the constraint and validates the result.

### PDF Input — no text extraction step

Gemini reads PDFs natively. Send the bytes; do not run `pdf-parse` first.

```typescript
const interaction = await getGemini().interactions.create({
  model: GEMINI_MODEL,
  input: [
    { type: "text", text: "Extract this candidate's profile." },
    {
      type: "document",
      data: pdfBuffer.toString("base64"),
      mime_type: "application/pdf",
    },
  ],
  response_format: {
    type: "text",
    mime_type: "application/json",
    schema: z.toJSONSchema(profileExtractionSchema),
  },
});
```

Limit is 50MB or 1000 pages; each page costs roughly 258 tokens. Our own resume cap is `MAX_RESUME_BYTES` (5MB) from `lib/profile.ts`, far below it, so inline base64 is always sufficient — the Files API is not needed anywhere in this project.

### Models

| Model                   | Use                                                     |
| ----------------------- | ------------------------------------------------------- |
| `gemini-3.6-flash`      | Project default — balanced, multimodal, agentic         |
| `gemini-3.5-flash-lite` | Fallback if rate-limited on the free tier               |

**Determinism.** `seed` on every call. The temperature scale this section used to prescribe (0.3 / 0.4 / 0.7) does not exist on this API — see above. Where the old rule wanted *variation* rather than repeatability, as in resume generation, vary the prompt rather than reaching for a knob the surface does not have.

**Thinking level:**

- `"minimal"` — extraction, matching, scoring, **and resume generation**. Transcription, classification and rewriting, where reasoning only eats the budget.
- default — company research synthesis, where connecting three separate sources is the point.

Resume generation moved to `"minimal"` in Feature 08. The instinct that "writing benefits from deliberation" is not wrong, but it is not worth the failure mode here: the task is rewriting the user's own responsibility text into bullets, the facts are all supplied, and a budget overrun does not shorten a bullet — it returns broken JSON and loses the call.

**Max output tokens** — a budget covering thinking *and* answer. Overrunning it returns unparseable JSON and loses the whole call, so size for the worst case:

- Job matching + scoring: `300`
- Company research synthesis: `2500` — raised from 800 in Feature 13: synthesis keeps the default thinking level, and thinking spends from the same budget (767 thought tokens were measured on a smaller task), so 800 risked the broken-JSON failure this section describes
- Profile extraction from resume: `1200` — raised from 800 after measuring a two-role resume at 399 output tokens; three roles with twenty skills lands near the old ceiling. Output is billed as generated, so unused headroom is free.
- Resume generation: `2000` — raised from 1000 in Feature 08. It is the largest response in the project: a summary plus up to three roles of bullets. The old figure was set alongside default thinking, a pairing that on the one measurement we have (`800` budget, `767` thought tokens, `14` emitted) returns nothing usable.

**Rules:**

- Model always comes from `GEMINI_MODEL` in `lib/gemini.ts` — never hardcode a model string at a call site
- Always pass `response_format` with a `schema` for structured data — never ask for JSON in the prompt alone
- Always derive that schema with `z.toJSONSchema()` from the zod schema that validates the result — never hand-write a second copy
- The default draft-2020-12 output is accepted, `$schema` / `anyOf` / `additionalProperties` included — verified against a live call. `{ target: "openapi-3.0" }` is available if a future model rejects it
- Never build one of these schemas from `lib/profile-schema.ts`'s helpers — they end in `.transform()`, and `z.toJSONSchema()` throws on a transform. Avoid `.catch()` too: it converts to a `default` hint rather than a constraint and hides model misbehaviour. Tolerance comes from `.nullish()`
- Always guard `interaction.output_text` before parsing — it is `string | undefined`
- Always validate parsed JSON with zod before using — wrap in try/catch
- Treat schema `maxItems` as a request, not a guarantee — slice after parsing, or an over-long list surfaces later as a save rejected for data the user never entered
- The free tier is rate-limited per minute and per day. Every call site handles a 429 as a user-visible "try again in a moment", never a crash
- `GEMINI_API_KEY` is server-only — never `NEXT_PUBLIC_`, never imported into a client component
- Match threshold is always `MATCH_THRESHOLD` from `lib/utils.ts` — never hardcode 70
- Company research synthesis must always return a complete dossier — never return empty even if browser research failed

---

## PostHog

**Check first:** Check AGENTS.md for an installed PostHog skill. If a PostHog MCP server is configured — use it. The skill/MCP will have the latest client and server patterns.

### Client Setup (Browser)

**Init lives in `instrumentation-client.ts`, not in a provider component.** Next.js 16 provides that file as the client bootstrap hook; it runs before any component mounts, so there is no `initPostHog()` to call and no `"use client"` wrapper in the root layout. An earlier version of this file described a `lib/posthog-client.ts` that called `posthog.init()` with `capture_pageview: false` — that predates the installed PostHog skill and is superseded. `defaults` turns on autocapture including `$pageview`; we keep it rather than hand-rolling pageview tracking.

```typescript
// instrumentation-client.ts
import posthog from "posthog-js";

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST!,
  capture_exceptions: true,
  defaults: "2026-01-30",
});
```

The env var is `NEXT_PUBLIC_POSTHOG_KEY`. The PostHog wizard writes `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` instead — if it is ever re-run, rename it back or the app reads an undefined key and silently sends nothing.

`lib/posthog-client.ts` is **not** an init module. It is the typed capture surface: an `AnalyticsEvent` discriminated union plus `captureEvent()`, `identifyUser()`, and `resetUser()`. Never import `posthog-js` directly in a component — go through these helpers so an unlisted event name fails to compile.

```typescript
import { captureEvent } from "@/lib/posthog-client";

captureEvent({ name: "oauth_sign_in_started", properties: { provider } });
```

### Server Setup

Built in Feature 03, but **nothing calls it yet** — the four product events that need it all belong to Features 06/10/13. It is in place so those features have a client to import rather than each rolling their own.

```typescript
// lib/posthog-server.ts
import { PostHog } from "posthog-node";

export function createPostHogServer(): PostHog {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) {
    throw new Error("NEXT_PUBLIC_POSTHOG_KEY is not set");
  }

  return new PostHog(key, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    flushAt: 1, // send immediately
    flushInterval: 0, // no batching — Next.js functions are short-lived
  });
}

// Always use and shutdown in the same function
const posthog = createPostHogServer();
posthog.capture({
  distinctId: userId,
  event: "company_researched",
  properties: { userId, jobId, company },
});
await posthog.shutdown(); // required — ensures event is sent
```

**Rules:**

- Always call `await posthog.shutdown()` in server-side functions — events are lost without it
- `flushAt: 1` and `flushInterval: 0` always set on server client
- Event names must match exactly the tables in `code-standards.md`
- Always include `userId` as a property on every server-side event
- Never import `posthog-js` in a component. Everything goes through `lib/posthog-client.ts`: `captureEvent()` for product events, `captureError()` for exceptions, `identifyUser()` / `resetUser()` for identity
- `captureError()` is the one exception to the event-name rule — it reports to Error Tracking and carries no `AnalyticsEvent` name
- Pass `{ sendInstantly: true }` when the capture is followed by a navigation or a `resetUser()`, or the batch queue can lose it
- Browser init belongs in `instrumentation-client.ts` only — never re-init in a provider or a layout
- Identity is mounted by `PostHogIdentity` in the root layout, so it re-identifies on every signed-in render; `resetUser()` runs in `LogoutButton`

---

## @react-pdf/renderer

**Check first:** Check AGENTS.md for an installed react-pdf skill. PDF generation APIs can differ from general training knowledge.

Installed at **4.5.1**. Its peer range is `^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0`, so React 19.2 is supported.

### Resume PDF Generation

```typescript
// lib/resume-pdf.tsx — server only
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  type DocumentProps,
} from "@react-pdf/renderer";
import type { ReactElement } from "react";

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: "Helvetica" },
  section: { marginBottom: 10 },
  heading: { fontSize: 14, fontWeight: "bold" },
  text: { fontSize: 10 },
});

export function ResumeDocument({
  profile,
}: {
  profile: Profile;
}): ReactElement<DocumentProps> {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.heading}>{profile.full_name}</Text>
          <Text style={styles.text}>{profile.email}</Text>
        </View>
      </Page>
    </Document>
  );
}
```

```typescript
// lib/resume-generation.ts — a .ts file, no JSX needed
const buffer = await renderToBuffer(ResumeDocument({ profile, prose }));
```

**Call the document as a function, do not write it as JSX at the call site.** `renderToBuffer` is typed `(document: ReactElement<DocumentProps>) => Promise<Buffer>`. A JSX element built from a custom component types as `JSX.Element`, which does not carry `DocumentProps` and needs an assertion to pass — and `code-standards.md` forbids assertions without a documented reason. Calling `ResumeDocument({...})` directly returns the annotated `ReactElement<DocumentProps>`, so it type-checks with no cast **and** keeps the calling module a plain `.ts` file.

### Uploading the result — `renderToBuffer` returns a Buffer, `upload()` will not take one

```typescript
const buffer = await renderToBuffer(ResumeDocument({ profile, prose }));

// Buffer → File. Node 20+ has both File and Blob as globals.
const file = new File([buffer], "resume.pdf", { type: "application/pdf" });

const { data, error } = await insforge.storage
  .from(RESUME_BUCKET)
  .upload(resumeObjectKey(userId), file);
```

An earlier version of this section taught `upload(path, buffer, { contentType, upsert: true })`. **Every part of that is wrong** and it is the same error the InsForge examples carried before Features 06 and 07 corrected them:

- `upload()` takes **two** arguments. There is no options object, so no `contentType` and no `upsert` flag — overwrite is implicit PUT semantics. See **InsForge → Storage** above.
- The second argument is `File | Blob`. A Node `Buffer` is neither, so it must be wrapped.
- The bucket is private, so the URL to persist is the upload response's own `data.url` — never `getPublicUrl()`.

**Supported CSS properties:**
Only use these — others are silently ignored, so a wrong property reads as a layout bug with no error anywhere:
`padding, margin, fontSize, color, fontFamily, flexDirection, alignItems, justifyContent, borderRadius, width, height, fontWeight, textAlign, lineHeight`

`ui-tokens.md` does not reach this file — a PDF cannot resolve a CSS variable. `lib/resume-pdf.tsx` is the **one sanctioned exception** to the no-hardcoded-hex rule in `AGENTS.md`, and it says so in a comment at the top so a review does not flag it every pass.

**Rules:**

- Server-side only — never import in a client component
- Always `renderToBuffer` — not `renderToStream`, not `PDFDownloadLink`
- PDF generation only from `app/api/resume/` routes, through `lib/`
- Wrap the buffer in a `File` before uploading — never pass a `Buffer` to `upload()`
- Never write the file to disk — upload the `File` straight to storage
- Save `data.url` from the upload response to `profiles.resume_pdf_url`

---

## pdf-parse — dropped, do not install

The move from GPT-4o to Gemini removed the need for this package. Gemini accepts a PDF directly as a `{ type: "document" }` input part, so there is no text-extraction step to perform: the model sees the document itself, including layout and column structure that `pdfData.text` flattens away. Image-based resumes that `pdf-parse` returned empty for are read as images.

Feature 07 sends the PDF bytes straight to Gemini. See **Google Gemini → PDF Input** above.

The one thing lost is the cheap pre-flight check — `pdf-parse` could tell us a PDF was unreadable before spending a model call. Gemini answers that only after the call, so the "Could not extract anything from this PDF" error is raised from the extraction result instead: if the model returns every field empty, treat it as a failed extraction and tell the user to try a different file.
