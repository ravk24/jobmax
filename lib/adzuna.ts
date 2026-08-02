import { z } from "zod";

// Server-only, by the same convention as lib/gemini.ts. Neither key carries a
// NEXT_PUBLIC_ prefix, so a Client Component that reached this module would
// ship code that can never authenticate.

const ADZUNA_BASE_URL = "https://api.adzuna.com/v1/api/jobs";

// build-plan.md Feature 10. Safe to change: agent/matcher.ts sizes its output
// budget from the actual batch length rather than from a constant that assumes
// this value.
export const ADZUNA_RESULTS_PER_PAGE = 10;

// architecture.md makes this an invariant: never search Adzuna without it.
const IT_JOBS_CATEGORY = "it-jobs";

// A search is a blocking POST the user is watching with the button disabled, so
// an upstream that never answers has to become a failure rather than a hang.
// Measured at roughly one second against the live API; this is a ceiling, not a
// target.
const ADZUNA_TIMEOUT_MS = 15_000;

export function getAdzunaAppId(): string {
  const id = process.env.ADZUNA_APP_ID;
  if (!id) {
    throw new Error("ADZUNA_APP_ID is not set");
  }
  return id;
}

export function getAdzunaAppKey(): string {
  const key = process.env.ADZUNA_APP_KEY;
  if (!key) {
    throw new Error("ADZUNA_APP_KEY is not set");
  }
  return key;
}

export type AdzunaCountry = "us" | "gb" | "ca" | "au";

export const DEFAULT_COUNTRY: AdzunaCountry = "us";

// Country names and codes only — deliberately no city names. "London" alone
// stays on the US endpoint: a guess that silently searches the wrong country
// returns plausible results for the wrong place, which is harder to notice than
// no results at all. Someone who means the UK can type "London, UK".
const COUNTRY_TOKENS: { pattern: RegExp; country: AdzunaCountry }[] = [
  { pattern: /\bunited kingdom\b/, country: "gb" },
  { pattern: /\bgreat britain\b/, country: "gb" },
  { pattern: /\bengland\b/, country: "gb" },
  { pattern: /\bscotland\b/, country: "gb" },
  { pattern: /\bwales\b/, country: "gb" },
  { pattern: /\buk\b/, country: "gb" },
  { pattern: /\bgb\b/, country: "gb" },
  { pattern: /\bcanada\b/, country: "ca" },
  { pattern: /\baustralia\b/, country: "au" },
];

export function detectCountry(location: string): AdzunaCountry {
  const haystack = location.toLowerCase();
  return (
    COUNTRY_TOKENS.find(({ pattern }) => pattern.test(haystack))?.country ??
    DEFAULT_COUNTRY
  );
}

// Adzuna quotes salaries in the endpoint's own currency, so the symbol follows
// the country rather than being a fixed "$".
const CURRENCY_SYMBOL: Record<AdzunaCountry, string> = {
  us: "$",
  ca: "$",
  au: "$",
  gb: "£",
};

// Tolerant on purpose. Everything the jobs table can hold as null is nullish
// here, so one listing missing a location does not cost us the listing — only
// title, company and the apply URL are load-bearing, and a result without them
// is dropped rather than saved as a row nobody can act on.
const adzunaJobSchema = z.object({
  title: z.string().min(1),
  company: z.object({ display_name: z.string().min(1) }),
  location: z.object({ display_name: z.string() }).nullish(),
  description: z.string().nullish(),
  redirect_url: z.url(),
  salary_min: z.number().nullish(),
  salary_max: z.number().nullish(),
  contract_type: z.string().nullish(),
  contract_time: z.string().nullish(),
  created: z.string().nullish(),
});

export type AdzunaJob = z.infer<typeof adzunaJobSchema>;

const adzunaResponseSchema = z.object({
  results: z.array(z.unknown()).nullish(),
});

// redirect_url is not stable. Verified against the live API: two identical
// searches a second apart return the same listing with a different `se=`
// tracking token, so the full URL is useless as an identity and a dedupe keyed
// on it would match nothing — every repeat search would duplicate every row.
// The path is stable, and it carries the Adzuna ad id.
//
// This is why source_url holds the canonical form and external_apply_url holds
// the full tracked one: one is the listing's identity, the other is the link
// the user clicks.
export function canonicalJobUrl(job: AdzunaJob): string {
  const [withoutQuery] = job.redirect_url.split("?");
  return withoutQuery || job.redirect_url;
}

// Adzuna has no remote filter on this endpoint, and `where=Remote` matches no
// place, so it returns zero results — for the first thing the design's own
// placeholder invites anyone to type. Dropping the word turns it into the
// country-wide search the user meant, and "Remote, New York" still searches
// New York.
const REMOTE_TOKEN = /\bremote(ly)?\b/gi;

export function toAdzunaWhere(location: string): string {
  return location.replace(REMOTE_TOKEN, "").replace(/[\s,]+/g, " ").trim();
}

export function formatAdzunaSalary(
  job: AdzunaJob,
  country: AdzunaCountry,
): string | null {
  const symbol = CURRENCY_SYMBOL[country];
  const thousands = (value: number): string =>
    `${symbol}${Math.round(value / 1000)}k`;

  if (job.salary_min && job.salary_max) {
    // Adzuna sends the same figure in both fields for a fixed salary, and
    // "$90k - $90k" reads as a bug.
    return job.salary_min === job.salary_max
      ? thousands(job.salary_min)
      : `${thousands(job.salary_min)} - ${thousands(job.salary_max)}`;
  }
  if (job.salary_min) {
    return `${thousands(job.salary_min)}+`;
  }
  return null;
}

// Adzuna's vocabulary is not ours. contract_type is "permanent" | "contract"
// and the full/part-time split lives in contract_time — so library-docs.md's
// `job.contract_type || "fulltime"` would write "permanent", which the
// jobs_job_type CHECK rejects, failing the whole insert.
export function toJobType(job: AdzunaJob): "fulltime" | "parttime" | "contract" {
  if (job.contract_type === "contract") {
    return "contract";
  }
  return job.contract_time === "part_time" ? "parttime" : "fulltime";
}

// A union rather than { success, error }: the caller maps each outcome to its
// own log line and its own user-facing sentence. Same shape as
// ExtractionOutcome in lib/resume-extraction.ts, for the same reason.
export type AdzunaSearchOutcome =
  | { status: "ok"; jobs: AdzunaJob[]; country: AdzunaCountry }
  | { status: "error" };

export async function searchAdzuna(
  jobTitle: string,
  location: string,
): Promise<AdzunaSearchOutcome> {
  try {
    const country = detectCountry(location);

    const params = new URLSearchParams({
      app_id: getAdzunaAppId(),
      app_key: getAdzunaAppKey(),
      what: jobTitle,
      category: IT_JOBS_CATEGORY,
      results_per_page: String(ADZUNA_RESULTS_PER_PAGE),
      "content-type": "application/json",
    });

    // Never send an empty `where` — an empty value is not the same as an absent
    // one to Adzuna, and it narrows the search to nothing.
    const where = toAdzunaWhere(location);
    if (where) {
      params.set("where", where);
    }

    const response = await fetch(
      `${ADZUNA_BASE_URL}/${country}/search/1?${params}`,
      { cache: "no-store", signal: AbortSignal.timeout(ADZUNA_TIMEOUT_MS) },
    );

    if (!response.ok) {
      console.error("[lib/adzuna]", `search returned ${response.status}`);
      return { status: "error" };
    }

    const body = adzunaResponseSchema.safeParse(await response.json());

    if (!body.success) {
      console.error("[lib/adzuna]", body.error.issues);
      return { status: "error" };
    }

    // Parsed one result at a time so a single malformed listing costs us that
    // listing rather than the entire search.
    const jobs = (body.data.results ?? []).flatMap((result) => {
      const parsed = adzunaJobSchema.safeParse(result);
      if (!parsed.success) {
        console.error("[lib/adzuna]", parsed.error.issues);
        return [];
      }
      return [parsed.data];
    });

    return { status: "ok", jobs, country };
  } catch (error) {
    // A timeout arrives here as a TimeoutError DOMException. Told apart in the
    // log because "Adzuna is slow" and "Adzuna rejected us" want different
    // responses from whoever reads it; the user sees the same sentence either
    // way.
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    console.error(
      "[lib/adzuna]",
      timedOut ? `search timed out after ${ADZUNA_TIMEOUT_MS}ms` : error,
    );
    return { status: "error" };
  }
}
