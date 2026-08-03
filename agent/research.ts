import type { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";

import { logAgent, logAgentError } from "@/agent/logs";
import type { ResearchOutcome } from "@/agent/types";
import { createResearchSession } from "@/lib/browserbase";
import { GEMINI_MODEL, getGemini, isGeminiRateLimited } from "@/lib/gemini";
import { createInsforgeServer, readProfile } from "@/lib/insforge-server";
import { createStagehand } from "@/lib/stagehand";
import type { CompanyResearch, Profile } from "@/types";

// Company research, end to end: derive the company's website from the job's
// apply link, read it with one Browserbase session, and have Gemini fuse what
// was found with the job posting and the user's profile into a dossier saved on
// the job row.
//
// The one invariant everything below serves: a research run always produces a
// complete dossier. A browser that cannot open, a site that cannot be found and
// a page that will not extract all degrade to synthesizing from the job posting
// and profile alone — never to an empty dossier, and never to a failed run.
// Only a failure of synthesis itself (or of the save) fails the run.
//
// Owns its agent_runs record like agent/adzuna.ts, and for the same reason.
// The search-specific columns stay null: a research run is recognisable by
// exactly that, and agent_logs rows carry the job id — the first real use of
// agent_logs.job_id.

type ResearchContext = { runId: string; userId: string; jobId: string };

async function startRun(userId: string): Promise<string | null> {
  const insforge = await createInsforgeServer();
  const { data, error } = await insforge.database
    .from("agent_runs")
    .insert({
      user_id: userId,
      status: "running",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error(
      "[agent/research]",
      error?.message ?? "run insert returned no row",
    );
    return null;
  }

  return String(data.id);
}

async function finishRun(
  runId: string,
  status: "completed" | "failed",
): Promise<void> {
  try {
    const insforge = await createInsforgeServer();
    const { error } = await insforge.database
      .from("agent_runs")
      .update({
        status,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);

    if (error) {
      console.error("[agent/research]", error.message);
    }
  } catch (error) {
    // A run stuck on `running` is a reporting problem, not a reason to lose a
    // dossier that is already saved.
    console.error("[agent/research]", error);
  }
}

// Same guard and same reasoning as jobIdSchema in lib/jobs-query.ts: PostgREST
// answers a malformed uuid with an error, not zero rows, and this id arrives
// from a request body.
const researchJobIdSchema = z.uuid();

// What the research needs from the job row, read leniently — the run should
// proceed with a null description rather than refuse over one odd cell. Never
// fed to z.toJSONSchema, so .catch is fine here.
const researchJobSchema = z.object({
  company: z.string().catch(""),
  title: z.string().catch(""),
  about_role: z.string().nullable().catch(null),
  matched_skills: z.array(z.string()).nullable().catch(null),
  missing_skills: z.array(z.string()).nullable().catch(null),
  external_apply_url: z.string().nullable().catch(null),
});

type ResearchJob = z.infer<typeof researchJobSchema>;

type JobReadOutcome =
  | { status: "found"; job: ResearchJob }
  | { status: "empty" }
  | { status: "error" };

async function readJobForResearch(
  userId: string,
  jobId: string,
): Promise<JobReadOutcome> {
  if (!researchJobIdSchema.safeParse(jobId).success) {
    return { status: "empty" };
  }

  const insforge = await createInsforgeServer();
  const { data, error } = await insforge.database
    .from("jobs")
    .select(
      "company,title,about_role,matched_skills,missing_skills,external_apply_url",
    )
    .eq("id", jobId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[agent/research]", error.message);
    return { status: "error" };
  }
  if (!data) {
    return { status: "empty" };
  }

  const parsed = researchJobSchema.safeParse(data);
  if (!parsed.success) {
    console.error("[agent/research]", parsed.error.issues);
    return { status: "error" };
  }

  return { status: "found", job: parsed.data };
}

// --- Homepage derivation -----------------------------------------------------

// Following the apply link is a plain server-side fetch, not a browser job: the
// redirect chain resolves before a session is ever paid for.
const REDIRECT_TIMEOUT_MS = 10_000;

// Where a naive "last two labels" root would be wrong: jobs.foo.co.uk must
// become foo.co.uk, not co.uk. Adzuna serves gb and au listings, so these are
// reachable rows, not hypotheticals.
const MULTI_PART_TLDS = new Set([
  "co.uk",
  "org.uk",
  "ac.uk",
  "gov.uk",
  "com.au",
  "net.au",
  "org.au",
  "co.nz",
  "co.in",
  "co.jp",
  "com.br",
  "com.mx",
  "com.sg",
]);

// Apply links routinely terminate on an applicant-tracking system, and
// stripping subdomains there yields the ATS's homepage, not the employer's.
// Rather than research Greenhouse on the user's behalf, fall back to guessing
// the employer's own domain.
const ATS_DOMAINS = new Set([
  "greenhouse.io",
  "lever.co",
  "ashbyhq.com",
  "myworkdayjobs.com",
  "workday.com",
  "smartrecruiters.com",
  "icims.com",
  "bamboohr.com",
]);

// Suffixes that belong to the legal name, not the domain: "Acme Inc" lives at
// acme.com.
const LEGAL_SUFFIXES = new Set([
  "inc",
  "llc",
  "ltd",
  "limited",
  "gmbh",
  "corp",
  "corporation",
  "plc",
  "group",
  "holdings",
]);

function rootDomain(hostname: string): string {
  const labels = hostname.toLowerCase().split(".").filter(Boolean);
  if (labels.length <= 2) {
    return labels.join(".");
  }
  const lastTwo = labels.slice(-2).join(".");
  if (MULTI_PART_TLDS.has(lastTwo)) {
    return labels.slice(-3).join(".");
  }
  return lastTwo;
}

function companyFallbackUrl(company: string): string | null {
  const slug = company
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => !LEGAL_SUFFIXES.has(word.replace(/[.,]+$/, "")))
    .join("")
    .replace(/[^a-z0-9-]/g, "");

  return slug ? `https://www.${slug}.com` : null;
}

type DerivedHomepage = { url: string; derivedFrom: "redirect" | "fallback" };

async function deriveHomepageUrl(
  applyUrl: string | null,
  company: string,
): Promise<DerivedHomepage | null> {
  const fallback = companyFallbackUrl(company);
  const fallbackResult: DerivedHomepage | null = fallback
    ? { url: fallback, derivedFrom: "fallback" }
    : null;

  if (!applyUrl) {
    return fallbackResult;
  }

  let parsed: URL;
  try {
    parsed = new URL(applyUrl);
  } catch {
    return fallbackResult;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return fallbackResult;
  }

  try {
    const response = await fetch(applyUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(REDIRECT_TIMEOUT_MS),
    });

    // The landing host matters even on a 403 — bot protection still answers
    // from the employer's own domain.
    const landed = new URL(response.url);
    const host = landed.hostname.toLowerCase();

    if (host.includes("adzuna")) {
      return fallbackResult;
    }

    const root = rootDomain(host);
    if (ATS_DOMAINS.has(root)) {
      return fallbackResult;
    }

    return { url: `https://${root}`, derivedFrom: "redirect" };
  } catch {
    // DNS failure, TLS failure, or the 10s abort — the guess is all that's left.
    return fallbackResult;
  }
}

// --- Browsing ----------------------------------------------------------------

const PAGE_KINDS = [
  "about",
  "careers",
  "blog",
  "engineering",
  "product",
  "team",
  "other",
] as const;

// Careers pages describe openings, not the employer — build-plan.md ranks them
// last on purpose.
const KIND_PRIORITY: Record<(typeof PAGE_KINDS)[number], number> = {
  about: 0,
  engineering: 1,
  product: 2,
  blog: 3,
  team: 4,
  other: 5,
  careers: 6,
};

const MAX_SUB_PAGES = 3;
const GOTO_TIMEOUT_MS = 20_000;
const EXTRACT_TIMEOUT_MS = 30_000;

const HOMEPAGE_INSTRUCTION =
  "This is a company's homepage. Capture what the company actually does, who it's for, and any concrete signals (funding, customers, scale, mission, recent launches). Then find the internal links most worth visiting to research them as an employer.";

const homepageSchema = z.object({
  oneLiner: z.string().describe("What the company does in one sentence"),
  productSummary: z.string().describe("What they build/sell and who it's for"),
  signals: z
    .array(z.string())
    .describe("Funding, notable customers, scale, mission, recent news"),
  pageLinks: z
    .array(z.object({ url: z.string(), kind: z.enum(PAGE_KINDS) }))
    .describe("Internal links worth visiting"),
});

const SUBPAGE_INSTRUCTION =
  "Extract substance that helps a candidate understand this company before applying: what they do, their values and how they work, the specific technologies and tools they use, notable projects or customers, and how the team operates. Ignore nav, footers, cookie banners, and generic marketing copy.";

const subPageSchema = z.object({
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
});

type BrowseResult = {
  homepage: z.infer<typeof homepageSchema> | null;
  subPages: z.infer<typeof subPageSchema>[];
  // The URLs extraction actually ran against — these become the dossier's
  // sources, because the model's own citations can name pages it never saw.
  visited: string[];
};

const EMPTY_BROWSE: BrowseResult = { homepage: null, subPages: [], visited: [] };

// The model may return relative paths, external links, or the homepage itself.
// Keep http(s) links on the company's own root domain, dedupe, and take the
// best three by kind.
function selectSubPages(
  links: z.infer<typeof homepageSchema>["pageLinks"],
  homepageUrl: string,
): string[] {
  const base = new URL(homepageUrl);
  const homeRoot = rootDomain(base.hostname);
  const seen = new Set<string>();
  const candidates: { url: string; kind: (typeof PAGE_KINDS)[number] }[] = [];

  for (const link of links) {
    let resolved: URL;
    try {
      resolved = new URL(link.url, base);
    } catch {
      continue;
    }
    if (resolved.protocol !== "https:" && resolved.protocol !== "http:") {
      continue;
    }
    if (rootDomain(resolved.hostname) !== homeRoot) {
      continue;
    }

    resolved.hash = "";
    const href = resolved.toString();
    const isHomepage =
      resolved.hostname === base.hostname &&
      (resolved.pathname === "/" || resolved.pathname === "");

    if (isHomepage || seen.has(href)) {
      continue;
    }
    seen.add(href);
    candidates.push({ url: href, kind: link.kind });
  }

  return candidates
    .sort((a, b) => KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind])
    .slice(0, MAX_SUB_PAGES)
    .map((candidate) => candidate.url);
}

// The whole browser phase. Every failure inside — session creation, an
// unreachable page, an extraction that 429s against the shared Gemini quota —
// degrades to returning whatever was collected so far. The session is closed in
// the finally whichever way this exits.
async function browseCompanySite(
  context: ResearchContext,
  homepage: DerivedHomepage,
): Promise<BrowseResult> {
  let stagehand: Stagehand;

  try {
    const session = await createResearchSession();
    stagehand = await createStagehand(session.id);
  } catch (error) {
    console.error("[agent/research]", error);
    await logAgent({
      ...context,
      level: "warning",
      message:
        "Could not open a browser — synthesizing from the job posting and profile alone.",
    });
    return EMPTY_BROWSE;
  }

  const subPages: BrowseResult["subPages"] = [];
  const visited: string[] = [];

  try {
    const page = stagehand.context.activePage();
    if (!page) {
      await logAgent({
        ...context,
        level: "warning",
        message: "The browser session opened with no page — skipping the site.",
      });
      return EMPTY_BROWSE;
    }

    let homepageData: z.infer<typeof homepageSchema>;
    try {
      const response = await page.goto(homepage.url, {
        timeoutMs: GOTO_TIMEOUT_MS,
      });

      // Checked by HTTP status, not by what the extraction says: a 502 page
      // extracts *non-empty* text describing the error — observed live against
      // manpowergroup.com — which sails past the empty-answer bail below and
      // grounds the dossier in an error page. A null response (no navigation
      // metadata) proceeds; the extraction checks stay as the backstop.
      if (response && !response.ok()) {
        await logAgent({
          ...context,
          level: "warning",
          message: `${homepage.url} answered ${response.status()} — synthesizing from the job posting and profile alone.`,
        });
        return EMPTY_BROWSE;
      }

      homepageData = await stagehand.extract(
        HOMEPAGE_INSTRUCTION,
        homepageSchema,
        { timeout: EXTRACT_TIMEOUT_MS },
      );
    } catch (error) {
      console.error("[agent/research]", error);
      await logAgent({
        ...context,
        level: "warning",
        message: `Could not read ${homepage.url} — synthesizing from the job posting and profile alone.`,
      });
      return EMPTY_BROWSE;
    }

    // Empty answers on both headline fields mean a parked domain or the wrong
    // site entirely — researching it further would write someone else's story
    // into the dossier.
    if (!homepageData.oneLiner && !homepageData.productSummary) {
      await logAgent({
        ...context,
        level: "warning",
        message: `${homepage.url} did not look like the company's site — synthesizing from the job posting and profile alone.`,
      });
      return EMPTY_BROWSE;
    }

    visited.push(homepage.url);

    for (const url of selectSubPages(homepageData.pageLinks, homepage.url)) {
      try {
        const response = await page.goto(url, { timeoutMs: GOTO_TIMEOUT_MS });

        // Same status check as the homepage: a 404'd sub-page must not spend
        // an extraction call describing an error page into the research.
        if (response && !response.ok()) {
          await logAgent({
            ...context,
            level: "warning",
            message: `Skipped ${url} — it answered ${response.status()}.`,
          });
          continue;
        }

        const data = await stagehand.extract(SUBPAGE_INSTRUCTION, subPageSchema, {
          timeout: EXTRACT_TIMEOUT_MS,
        });
        subPages.push(data);
        visited.push(url);
      } catch (error) {
        // One unreadable sub-page costs that page, never the run.
        console.error("[agent/research]", error);
        await logAgent({
          ...context,
          level: "warning",
          message: `Skipped ${url} — the page could not be read.`,
        });
      }
    }

    return { homepage: homepageData, subPages, visited };
  } finally {
    try {
      await stagehand.close();
    } catch (error) {
      // A close failure must not mask whatever the browse collected.
      console.error("[agent/research]", error);
    }
  }
}

// --- Synthesis ---------------------------------------------------------------

// Determinism, not variation: the same research and profile should produce the
// same dossier twice. The interactions API has no temperature — see
// agent/matcher.ts for the same note.
const RESEARCH_SEED = 21;

// Synthesis keeps the default thinking level — fusing three sources is the one
// task in this project where deliberation is the point. Thinking tokens come
// out of this same budget (767 were measured on a smaller task), so the budget
// is sized for thought plus a nine-field dossier. Unused headroom is free.
const SYNTHESIS_OUTPUT_TOKENS = 2500;

const SYNTHESIS_TIMEOUT_MS = 90_000;

const MAX_LIST_ITEMS = 8;
const MAX_ITEM = 300;
const MAX_PARAGRAPH = 2000;

const SYNTHESIS_SYSTEM_INSTRUCTION = `You are a sharp career strategist preparing a candidate to apply for a specific role. You are given (a) research collected from the company's own website, (b) the job posting, and (c) the candidate's profile. Produce a concise, concrete briefing that gives this specific candidate an edge for this specific role.

Rules:
- Ground every company claim in the provided research or job posting. Never invent funding, customers, headcount, or facts. If research was thin, infer carefully from the job posting and say what's inferred.
- Be specific to THIS candidate. Connect their actual skills and past work to this company's stack, product, and values. No generic advice that would apply to anyone.
- Turn the candidate's missing skills into a strategy: how to frame the gap honestly and what adjacent experience to lean on.
- Talking points and questions must reference real things from the research, the kind of detail that signals the candidate did their homework.
- Keep every item tight: one or two sentences. No fluff.`;

// No .transform() and no .catch() — this schema feeds z.toJSONSchema(). String
// and array caps are generous steering, not tight limits: a cap the model
// overruns fails the whole parse, and constrained decoding treats maxItems as
// a request rather than a guarantee, so arrays are sliced after parsing too.
const dossierSchema = z.object({
  companyOverview: z.string().max(MAX_PARAGRAPH),
  techStack: z.array(z.string().max(MAX_ITEM)).max(MAX_LIST_ITEMS),
  culture: z.array(z.string().max(MAX_ITEM)).max(MAX_LIST_ITEMS),
  whyThisRole: z.string().max(MAX_PARAGRAPH),
  yourEdge: z.array(z.string().max(MAX_ITEM)).max(MAX_LIST_ITEMS),
  gapsToAddress: z.array(z.string().max(MAX_ITEM)).max(MAX_LIST_ITEMS),
  smartQuestions: z.array(z.string().max(MAX_ITEM)).max(MAX_LIST_ITEMS),
  interviewPrep: z.array(z.string().max(MAX_ITEM)).max(MAX_LIST_ITEMS),
  sources: z.array(z.string().max(MAX_ITEM)).max(MAX_LIST_ITEMS),
});

const DOSSIER_JSON_SCHEMA = z.toJSONSchema(dossierSchema);

// Mirrors describeProfile in agent/matcher.ts, which is module-private there.
// The two describe the same profile to the same model for different tasks; if a
// third copy is ever needed, promote one to a shared helper.
function describeProfile(profile: Profile): string {
  const roles = (profile.work_experience ?? [])
    .map(
      (role) =>
        `- ${role.title || "Untitled role"} at ${role.company || "an unnamed employer"}: ${role.responsibilities || "no detail given"}`,
    )
    .join("\n");

  return [
    `Current title: ${profile.current_title ?? "not given"}`,
    `Experience: ${profile.years_experience ?? "not given"} years, level ${profile.experience_level ?? "not given"}`,
    `Skills: ${(profile.skills ?? []).join(", ") || "not given"}`,
    `Industries: ${(profile.industries ?? []).join(", ") || "not given"}`,
    `Work history:\n${roles || "- none given"}`,
  ].join("\n");
}

function buildSynthesisInput(
  research: BrowseResult,
  job: ResearchJob,
  profile: Profile,
): string {
  const companyResearch =
    research.homepage === null
      ? "No research could be collected from the company's website. Work from the job posting and profile alone, and say what is inferred."
      : JSON.stringify({
          homepage: research.homepage,
          pages: research.subPages,
        });

  return [
    "COMPANY RESEARCH (from their website):",
    companyResearch,
    "",
    "JOB POSTING:",
    `Title: ${job.title}`,
    `Company: ${job.company}`,
    `Description: ${job.about_role ?? "not given"}`,
    `Matched skills (already computed): ${(job.matched_skills ?? []).join(", ") || "not computed"}`,
    `Missing skills (already computed): ${(job.missing_skills ?? []).join(", ") || "not computed"}`,
    "",
    "CANDIDATE PROFILE:",
    describeProfile(profile),
  ].join("\n");
}

function httpSourceOrNull(value: string): string | null {
  try {
    const { protocol } = new URL(value);
    return protocol === "https:" || protocol === "http:" ? value : null;
  } catch {
    return null;
  }
}

// The dossier's sources are the pages extraction actually ran against. The
// model's own citations are kept only for a synthesis-only run — where they are
// usually empty — and filtered to http(s), because they render as links.
function sanitizeSources(modelSources: string[], visited: string[]): string[] {
  if (visited.length > 0) {
    return visited;
  }
  return modelSources
    .map(httpSourceOrNull)
    .filter((url): url is string => url !== null)
    .slice(0, MAX_LIST_ITEMS);
}

// --- The run -----------------------------------------------------------------

export async function researchCompany(
  user: { id: string; email: string },
  jobId: string,
): Promise<ResearchOutcome> {
  // Declared outside the try so the catch can tell "failed before a run
  // existed" from "failed during one" — the adzuna pattern.
  let runId: string | null = null;

  try {
    // Both reads happen before the run is opened: refusing costs no session
    // and no model call, and leaves no run behind to explain.
    const jobResult = await readJobForResearch(user.id, jobId);
    if (jobResult.status === "error") {
      return { status: "error" };
    }
    if (jobResult.status === "empty") {
      return { status: "not-found" };
    }
    const job = jobResult.job;

    const profileResult = await readProfile(user);
    if (profileResult.status === "error") {
      return { status: "error" };
    }
    if (profileResult.status === "empty") {
      return { status: "no-profile" };
    }
    const profile: Profile = profileResult.profile;

    runId = await startRun(user.id);
    if (!runId) {
      return { status: "error" };
    }
    const context: ResearchContext = { runId, userId: user.id, jobId };

    await logAgent({
      ...context,
      level: "info",
      message: `Researching ${job.company}.`,
    });

    const homepage = await deriveHomepageUrl(job.external_apply_url, job.company);

    let research: BrowseResult = EMPTY_BROWSE;
    if (homepage) {
      await logAgent({
        ...context,
        level: "info",
        message:
          homepage.derivedFrom === "redirect"
            ? `Visiting ${homepage.url}, found by following the job's apply link.`
            : `Visiting ${homepage.url}, guessed from the company name.`,
      });
      research = await browseCompanySite(context, homepage);
    } else {
      await logAgent({
        ...context,
        level: "warning",
        message: `Could not derive a website for ${job.company} — synthesizing from the job posting and profile alone.`,
      });
    }

    const browsed = research.homepage !== null;

    const interaction = await getGemini().interactions.create(
      {
        model: GEMINI_MODEL,
        system_instruction: SYNTHESIS_SYSTEM_INSTRUCTION,
        input: buildSynthesisInput(research, job, profile),
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: DOSSIER_JSON_SCHEMA,
        },
        generation_config: {
          seed: RESEARCH_SEED,
          max_output_tokens: SYNTHESIS_OUTPUT_TOKENS,
        },
      },
      { timeout: SYNTHESIS_TIMEOUT_MS },
    );

    if (!interaction.output_text) {
      await logAgentError(
        runId,
        user.id,
        "Synthesis returned no text",
        "blocked or truncated interaction",
      );
      await finishRun(runId, "failed");
      return { status: "error" };
    }

    const parsed = dossierSchema.safeParse(JSON.parse(interaction.output_text));
    if (!parsed.success) {
      await logAgentError(runId, user.id, "Dossier failed validation", parsed.error.issues);
      await finishRun(runId, "failed");
      return { status: "error" };
    }

    // Sliced rather than trusted — maxItems is a request, not a guarantee.
    const dossier: CompanyResearch = {
      companyOverview: parsed.data.companyOverview,
      whyThisRole: parsed.data.whyThisRole,
      techStack: parsed.data.techStack.slice(0, MAX_LIST_ITEMS),
      culture: parsed.data.culture.slice(0, MAX_LIST_ITEMS),
      yourEdge: parsed.data.yourEdge.slice(0, MAX_LIST_ITEMS),
      gapsToAddress: parsed.data.gapsToAddress.slice(0, MAX_LIST_ITEMS),
      smartQuestions: parsed.data.smartQuestions.slice(0, MAX_LIST_ITEMS),
      interviewPrep: parsed.data.interviewPrep.slice(0, MAX_LIST_ITEMS),
      sources: sanitizeSources(parsed.data.sources, research.visited),
    };

    const insforge = await createInsforgeServer();
    const { error: saveError } = await insforge.database
      .from("jobs")
      .update({ company_research: dossier })
      // RLS scopes this too; the explicit filter stays, as everywhere else.
      .eq("id", jobId)
      .eq("user_id", user.id);

    if (saveError) {
      await logAgentError(runId, user.id, "Saving the dossier failed", saveError.message);
      await finishRun(runId, "failed");
      return { status: "error" };
    }

    await logAgent({
      ...context,
      level: "success",
      message: browsed
        ? `Dossier saved — ${research.visited.length} ${research.visited.length === 1 ? "page" : "pages"} researched.`
        : "Dossier saved — written from the job posting and profile alone.",
    });
    await finishRun(runId, "completed");

    return { status: "completed", browsed, company: job.company };
  } catch (error) {
    if (runId) {
      if (isGeminiRateLimited(error)) {
        await logAgent({
          runId,
          userId: user.id,
          level: "warning",
          message: "Gemini is rate-limited — research could not finish.",
          jobId,
        });
        await finishRun(runId, "failed");
        return { status: "rate-limited" };
      }
      await logAgentError(runId, user.id, "Company research failed", error);
      // Marked before returning, so no run is left reading `running` forever.
      await finishRun(runId, "failed");
      return { status: "error" };
    }

    // No run to attach it to — the failure landed on the reads or on opening
    // the run itself.
    console.error("[agent/research]", error);
    return isGeminiRateLimited(error)
      ? { status: "rate-limited" }
      : { status: "error" };
  }
}
