// Query rules for the Find Jobs page. Filter, sort and pagination state lives
// in the URL, so the page is a Server Component that reads searchParams and
// hands them here.
//
// Client-safe by design: JobFilters is a Client Component and imports jobsHref()
// and the option lists from here. The query that reads the jobs table lives in
// lib/jobs-query.ts, which is server-only — the same split as lib/profile.ts and
// lib/profile-schema.ts, and for the same reason.

import type { Job } from "@/types";

export const JOBS_PER_PAGE = 20;

export type MatchFilter = "all" | "high" | "low";
export type JobSort = "score" | "newest" | "oldest";

export const MATCH_FILTER_OPTIONS: { value: MatchFilter; label: string }[] = [
  { value: "all", label: "All Matches" },
  { value: "high", label: "High Match" },
  { value: "low", label: "Low Match" },
];

export const JOB_SORT_OPTIONS: { value: JobSort; label: string }[] = [
  { value: "score", label: "Match Score" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
];

export type JobQuery = {
  q: string;
  match: MatchFilter;
  sort: JobSort;
  page: number;
};

// The defaults are also what a param is omitted from the URL for, so a default
// view has a bare /find-jobs address rather than three redundant params.
export const DEFAULT_MATCH: MatchFilter = "all";
export const DEFAULT_SORT: JobSort = "score";

export function isMatchFilter(value: string): value is MatchFilter {
  return MATCH_FILTER_OPTIONS.some((option) => option.value === value);
}

export function isJobSort(value: string): value is JobSort {
  return JOB_SORT_OPTIONS.some((option) => option.value === value);
}

type RawSearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

// Every param is hand-editable, so anything unrecognised falls back rather than
// throwing — ?sort=banana renders the default view, not an error page.
export function parseJobQuery(params: RawSearchParams): JobQuery {
  const match = firstValue(params.match);
  const sort = firstValue(params.sort);
  const page = Number.parseInt(firstValue(params.page), 10);

  return {
    q: firstValue(params.q).trim(),
    match: isMatchFilter(match) ? match : DEFAULT_MATCH,
    sort: isJobSort(sort) ? sort : DEFAULT_SORT,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

// Omits anything sitting at its default so the URL stays readable.
export function jobsHref(query: JobQuery): string {
  const params = new URLSearchParams();

  if (query.q) {
    params.set("q", query.q);
  }
  if (query.match !== DEFAULT_MATCH) {
    params.set("match", query.match);
  }
  if (query.sort !== DEFAULT_SORT) {
    params.set("sort", query.sort);
  }
  if (query.page > 1) {
    params.set("page", String(query.page));
  }

  const search = params.toString();
  return search ? `/find-jobs?${search}` : "/find-jobs";
}

export function isDefaultQuery(query: JobQuery): boolean {
  return (
    query.q === "" && query.match === DEFAULT_MATCH && query.sort === DEFAULT_SORT
  );
}

// The six columns the table renders, and nothing else. Derived from Job rather
// than hand-written, so a column that changes shape in db/schema.sql is a
// compile error here rather than a wrong cell.
export type JobListItem = Pick<
  Job,
  "id" | "company" | "title" | "match_score" | "salary" | "found_at"
>;

export type JobSelection = {
  jobs: JobListItem[];
  total: number;
  page: number;
  pageCount: number;
  // Distinguishes "no jobs yet" from "no jobs match these filters". It cannot be
  // derived from `total`, which is 0 in both cases — see lib/jobs-query.ts.
  hasAnyJobs: boolean;
};

// "The read failed" and "there is nothing here" must never collapse into one
// answer: rendering "No jobs yet" while the database is unreachable tells the
// user their jobs are gone. Same shape as ProfileReadResult, for the same
// reason. Declared here rather than beside the query so JobsTable can name it
// without importing a server-only module.
export type JobsResult =
  | { status: "ok"; selection: JobSelection }
  | { status: "error" };

// What the job details page renders, derived from Job for the same reason
// JobListItem is. company_research joined in Feature 13, in the same change as
// the query column and the dossier branch that renders it — the three always
// travel together.
export type JobDetail = Pick<
  Job,
  | "id"
  | "company"
  | "title"
  | "location"
  | "salary"
  | "job_type"
  | "about_role"
  | "match_score"
  | "match_reason"
  | "matched_skills"
  | "missing_skills"
  | "external_apply_url"
  | "found_at"
  | "company_research"
>;

// Three answers, not two. "empty" covers both a job that does not exist and one
// belonging to another user — indistinguishable by design, since RLS returns no
// row either way — and it must stay separate from "error" so a stale link does
// not report a system failure. Same reasoning as JobsResult above.
export type JobReadResult =
  | { status: "found"; job: JobDetail }
  | { status: "empty" }
  | { status: "error" };

const JOB_TYPE_LABELS: Record<NonNullable<Job["job_type"]>, string> = {
  fulltime: "Full-time",
  parttime: "Part-time",
  contract: "Contract",
};

// Feature 10 defaults job_type to "fulltime", so null does not occur on rows we
// wrote — but the column is nullable and a future import path may leave it so.
export function formatJobType(jobType: Job["job_type"]): string {
  return jobType ? JOB_TYPE_LABELS[jobType] : "—";
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const RELATIVE_TIME = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

// "2 hours ago", "Yesterday", "3 days ago" — the design's DATE FOUND column.
// numeric: "auto" is what turns -1 day into "yesterday" rather than "1 day ago".
export function formatFoundAt(isoDate: string): string {
  const timestamp = Date.parse(isoDate);
  if (Number.isNaN(timestamp)) {
    return "—";
  }

  const elapsed = Date.now() - timestamp;
  let formatted: string;

  if (elapsed < HOUR) {
    formatted = RELATIVE_TIME.format(
      -Math.max(1, Math.round(elapsed / MINUTE)),
      "minute",
    );
  } else if (elapsed < DAY) {
    formatted = RELATIVE_TIME.format(-Math.round(elapsed / HOUR), "hour");
  } else {
    formatted = RELATIVE_TIME.format(-Math.round(elapsed / DAY), "day");
  }

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}
