import { z } from "zod";

import { createInsforgeServer } from "@/lib/insforge-server";
import {
  JOBS_PER_PAGE,
  type JobDetail,
  type JobListItem,
  type JobQuery,
  type JobReadResult,
  type JobsResult,
} from "@/lib/jobs";
import { MATCH_THRESHOLD } from "@/lib/utils";

// Server-only, and separate from lib/jobs.ts for the same reason
// lib/profile-schema.ts is separate from lib/profile.ts: JobFilters is a Client
// Component importing jobsHref() and the option lists, and it must not pull the
// InsForge server client or zod into the browser bundle.

type InsforgeServer = Awaited<ReturnType<typeof createInsforgeServer>>;

// Only what the table renders. A list page has no use for company_research, and
// pulling twenty dossiers to display six columns is bytes nobody reads.
const JOB_LIST_COLUMNS = "id,company,title,match_score,salary,found_at";

// Rows arrive as `any` from the PostgREST builder. Validated rather than cast —
// code-standards.md forbids an undocumented assertion, and parseProfileRow in
// lib/insforge-server.ts already sets the precedent.
const jobListItemSchema = z.object({
  id: z.string(),
  company: z.string(),
  title: z.string(),
  match_score: z.number().int().nullable(),
  salary: z.string().nullable(),
  found_at: z.string(),
});

// PostgREST's or() takes a comma-separated list of filters, and each filter is
// column.operator.value — so a comma in the user's text splits the expression
// and the query silently becomes a different one. A `%` or `_` in the value is
// a LIKE wildcard and widens the match instead of narrowing it.
//
// Wrapping the value in double quotes is PostgREST's own answer to reserved
// characters, and it keeps commas, brackets and dots searchable — "Smith, Jones
// & Co" and "Node.js" are both real things to type.
//
// The dropped characters have no escape on this surface. % _ and * are LIKE
// wildcards, and a backslash is LIKE's own escape character, which PostgREST
// gives no way to override — passing one through makes the next character
// match itself literally, so "a\b" quietly searches for "ab". Dropping them is
// predictable; passing them through is not.
//
// Quoted only when quoting is needed, so the ordinary search takes the plain
// unquoted path that every PostgREST example uses.
const UNSEARCHABLE = /[%_*\\]/g;
const NEEDS_QUOTING = /[,.():"]/;

function toIlikePattern(needle: string): string {
  const cleaned = needle.replace(UNSEARCHABLE, "");

  if (!NEEDS_QUOTING.test(cleaned)) {
    return `%${cleaned}%`;
  }

  return `"%${cleaned.replace(/"/g, '\\"')}%"`;
}

// The filters as data rather than as a builder wrapper. The count query and the
// rows query must always describe the same set of rows, and a generic helper
// that takes a PostgrestFilterBuilder and gives one back is self-referential
// enough to defeat the compiler ("type instantiation is excessively deep").
// Deciding the filters once and applying them mechanically at each call site
// keeps the single source of truth without the type gymnastics.
type JobFilters = {
  // At most one `or=` expression. Two calls to .or() on the same builder send
  // two `or=` params, which PostgREST rejects outright — so a text search
  // combined with the Low Match band failed while either alone worked. Groups
  // that must be ANDed are folded into one expression by combineOrGroups().
  orExpression: string | null;
  minScore: number | null;
};

// Two OR groups ANDed together become one PostgREST expression via its nested
// boolean syntax: or=(and(a,c),and(a,d),and(b,c),and(b,d)). Distributing rather
// than nesting an `and=` param keeps everything inside the single .or() the
// query builder exposes. Both groups hold two clauses, so this is four terms —
// it is not a combinatorial risk at this size.
function combineOrGroups(groups: string[][]): string | null {
  if (groups.length === 0) {
    return null;
  }
  if (groups.length === 1) {
    return groups[0].join(",");
  }

  let combos: string[][] = [[]];
  for (const group of groups) {
    combos = combos.flatMap((combo) => group.map((term) => [...combo, term]));
  }

  return combos.map((combo) => `and(${combo.join(",")})`).join(",");
}

function jobFilters(query: JobQuery): JobFilters {
  const orGroups: string[][] = [];
  let minScore: number | null = null;

  const needle = query.q.trim();
  if (needle) {
    const pattern = toIlikePattern(needle);
    orGroups.push([`company.ilike.${pattern}`, `title.ilike.${pattern}`]);
  }

  if (query.match === "high") {
    // A single condition, so it stays a plain .gte() rather than joining the
    // OR expression — nulls are excluded, which is what "high" means.
    minScore = MATCH_THRESHOLD;
  } else if (query.match === "low") {
    // An unscored job is a low match, not an invisible one — Feature 09's
    // matchesBand() treated null as 0. `match_score.lt.70` alone would drop it
    // out of every band and make it unreachable.
    orGroups.push([`match_score.lt.${MATCH_THRESHOLD}`, "match_score.is.null"]);
  }

  return { orExpression: combineOrGroups(orGroups), minScore };
}

type PageResult =
  | { status: "ok"; jobs: JobListItem[] }
  | { status: "error" };

async function fetchPage(
  insforge: InsforgeServer,
  userId: string,
  query: JobQuery,
  page: number,
): Promise<PageResult> {
  const filters = jobFilters(query);

  // architecture.md: always scope to the current user. RLS is the backstop, not
  // a licence to drop the filter.
  let builder = insforge.database
    .from("jobs")
    .select(JOB_LIST_COLUMNS)
    .eq("user_id", userId);

  if (filters.orExpression) {
    builder = builder.or(filters.orExpression);
  }
  if (filters.minScore !== null) {
    builder = builder.gte("match_score", filters.minScore);
  }

  if (query.sort === "score") {
    // nullsFirst: false because Postgres puts NULLs first on a DESC sort, while
    // Feature 09's `?? -1` put them last. Without it an unscored job would head
    // the default view.
    builder = builder.order("match_score", {
      ascending: false,
      nullsFirst: false,
    });
  }

  const ascending = query.sort === "oldest";

  // The tiebreaker is load-bearing, not tidiness. A sort on one non-unique
  // column is not stable across separate .range() calls, so without it the same
  // row can appear on two pages, or on none.
  builder = builder
    .order("found_at", { ascending })
    .order("id", { ascending });

  const start = (page - 1) * JOBS_PER_PAGE;
  const { data, error } = await builder.range(start, start + JOBS_PER_PAGE - 1);

  if (error) {
    console.error("[lib/jobs-query]", error.message);
    return { status: "error" };
  }

  const parsed = z.array(jobListItemSchema).safeParse(data ?? []);

  if (!parsed.success) {
    console.error("[lib/jobs-query]", parsed.error.issues);
    return { status: "error" };
  }

  return { status: "ok", jobs: parsed.data };
}

async function countJobs(
  insforge: InsforgeServer,
  userId: string,
  query: JobQuery | null,
): Promise<number | null> {
  let builder = insforge.database
    .from("jobs")
    .select("id", { head: true, count: "exact" })
    .eq("user_id", userId);

  // A null query means the unfiltered count — how many jobs this user has at
  // all, regardless of what they are filtering for.
  if (query) {
    const filters = jobFilters(query);
    if (filters.orExpression) {
      builder = builder.or(filters.orExpression);
    }
    if (filters.minScore !== null) {
      builder = builder.gte("match_score", filters.minScore);
    }
  }

  const { count, error } = await builder;

  if (error) {
    console.error("[lib/jobs-query]", error.message);
    return null;
  }

  return count ?? 0;
}

// The details page reads more columns than the table, but still not `*`:
// responsibilities, requirements, nice_to_have, benefits and about_company are
// never written by Feature 10 and the page does not render them, and
// company_research belongs to Feature 13 along with the card that shows it.
const JOB_DETAIL_COLUMNS =
  "id,company,title,location,salary,job_type,about_role,match_score,match_reason,matched_skills,missing_skills,external_apply_url,found_at";

// external_apply_url is the one column whose value becomes a navigable href,
// and nothing constrains it — the column is bare text and jobs.source allows
// 'url' for manual import. React 19 already neutralises javascript: hrefs, but
// no other scheme, so anything that is not a web URL degrades to null here and
// the page renders its existing no-link disabled button instead of a link.
function httpUrlOrNull(value: string | null): string | null {
  if (value === null) {
    return null;
  }

  try {
    const { protocol } = new URL(value);
    if (protocol === "https:" || protocol === "http:") {
      return value;
    }
  } catch {
    // Not parseable as a URL at all — same answer as a wrong scheme.
  }

  // Logged because this is the one repair in jobDetailSchema that nullifies
  // valid-looking data: a scheme-less URL from a manual import would otherwise
  // lose its apply link with no discoverable trace.
  console.error("[lib/jobs-query] external_apply_url stripped, not http(s):", value);
  return null;
}

// Lenient and self-repairing, the posture lib/profile-schema.ts documents for
// reads: a row that exists should render, with a dash in the odd cell, rather
// than fail the whole page over one unexpected value.
const jobDetailSchema = z.object({
  company: z.string().catch(""),
  title: z.string().catch(""),
  location: z.string().nullable().catch(null),
  salary: z.string().nullable().catch(null),
  job_type: z
    .enum(["fulltime", "parttime", "contract"])
    .nullable()
    .catch(null),
  about_role: z.string().nullable().catch(null),
  match_score: z.number().int().nullable().catch(null),
  match_reason: z.string().nullable().catch(null),
  matched_skills: z.array(z.string()).nullable().catch(null),
  missing_skills: z.array(z.string()).nullable().catch(null),
  external_apply_url: z.string().nullable().catch(null).transform(httpUrlOrNull),
  found_at: z.string().catch(""),
});

// A uuid the database will accept. Checked before the query, not after, because
// PostgREST answers a malformed uuid with `invalid input syntax for type uuid`
// — an error, not zero rows — so /find-jobs/abc would otherwise render the
// read-failure card and tell the user the system broke when the only problem is
// a bad link. Same class of bug as the 416 an out-of-range page offset returns.
const jobIdSchema = z.uuid();

export async function selectJob(
  userId: string,
  jobId: string,
): Promise<JobReadResult> {
  if (!jobIdSchema.safeParse(jobId).success) {
    return { status: "empty" };
  }

  try {
    const insforge = await createInsforgeServer();

    const { data, error } = await insforge.database
      .from("jobs")
      .select(JOB_DETAIL_COLUMNS)
      // RLS scopes this too, but the explicit filter stays for the same reason
      // it does in fetchPage: RLS is the backstop, not a licence to drop it.
      .eq("id", jobId)
      .eq("user_id", userId)
      // maybeSingle, not single — a job that does not exist is an ordinary
      // outcome the caller handles, not an error to throw over.
      .maybeSingle();

    if (error) {
      console.error("[lib/jobs-query]", error.message);
      return { status: "error" };
    }

    if (!data) {
      return { status: "empty" };
    }

    const parsed = jobDetailSchema.safeParse(data);

    if (!parsed.success) {
      console.error("[lib/jobs-query]", parsed.error.issues);
      return { status: "error" };
    }

    // id comes from the validated parameter rather than from the row, the same
    // way readProfile takes id and email from the session: it is the one field
    // a repaired fallback could quietly corrupt.
    const job: JobDetail = { id: jobId, ...parsed.data };

    return { status: "found", job };
  } catch (error) {
    console.error("[lib/jobs-query]", error);
    return { status: "error" };
  }
}

export async function selectJobs(
  userId: string,
  query: JobQuery,
): Promise<JobsResult> {
  try {
    const insforge = await createInsforgeServer();

    // Two counts, both needed and neither derivable from the other. The
    // unfiltered one answers hasAnyJobs — the filtered total is 0 in both empty
    // cases, so deriving it there would collapse "no jobs yet" into "no jobs
    // match these filters" and lose the Clear filters button exactly when it is
    // wanted.
    const [owned, total] = await Promise.all([
      countJobs(insforge, userId, null),
      countJobs(insforge, userId, query),
    ]);

    if (owned === null || total === null) {
      return { status: "error" };
    }

    const hasAnyJobs = owned > 0;
    const pageCount = Math.max(1, Math.ceil(total / JOBS_PER_PAGE));
    // Clamped before the rows are asked for, not after. PostgREST answers an
    // offset past the end with 416 Range Not Satisfiable rather than an empty
    // page, so ?page=99 would otherwise render the read-failure state — telling
    // the user their jobs could not be loaded when the only problem is a page
    // number they typed.
    const page = Math.min(query.page, pageCount);

    if (total === 0) {
      return {
        status: "ok",
        selection: { jobs: [], total: 0, page, pageCount, hasAnyJobs },
      };
    }

    const rows = await fetchPage(insforge, userId, query, page);
    if (rows.status === "error") {
      return { status: "error" };
    }

    return {
      status: "ok",
      selection: { jobs: rows.jobs, total, page, pageCount, hasAnyJobs },
    };
  } catch (error) {
    console.error("[lib/jobs-query]", error);
    return { status: "error" };
  }
}
