// Query rules for the Find Jobs page. Filter, sort and pagination state lives
// in the URL, so the page is a Server Component that reads searchParams and
// hands them here.
//
// selectJobs() is the seam Feature 11 replaces: its body becomes an InsForge
// .or().order().range() query against the jobs table, and lib/jobs-mock.ts is
// deleted. Nothing else in this file or in components/find-jobs/ changes.

import { MATCH_THRESHOLD } from "@/lib/utils";
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

function matchesText(job: Job, needle: string): boolean {
  if (!needle) {
    return true;
  }
  return (
    job.company.toLowerCase().includes(needle) ||
    job.title.toLowerCase().includes(needle)
  );
}

// An unscored job is not a high match, so it belongs in the low band rather
// than vanishing from every band and becoming unreachable.
function matchesBand(job: Job, match: MatchFilter): boolean {
  if (match === "all") {
    return true;
  }
  const score = job.match_score ?? 0;
  return match === "high" ? score >= MATCH_THRESHOLD : score < MATCH_THRESHOLD;
}

function compareJobs(sort: JobSort): (a: Job, b: Job) => number {
  if (sort === "newest") {
    return (a, b) => Date.parse(b.found_at) - Date.parse(a.found_at);
  }
  if (sort === "oldest") {
    return (a, b) => Date.parse(a.found_at) - Date.parse(b.found_at);
  }
  // -1 rather than 0 so an unscored job sorts below a genuine zero.
  return (a, b) => (b.match_score ?? -1) - (a.match_score ?? -1);
}

export type JobSelection = {
  jobs: Job[];
  total: number;
  page: number;
  pageCount: number;
};

export function selectJobs(jobs: Job[], query: JobQuery): JobSelection {
  const needle = query.q.toLowerCase();
  const filtered = jobs.filter(
    (job) => matchesText(job, needle) && matchesBand(job, query.match),
  );

  const sorted = [...filtered].sort(compareJobs(query.sort));

  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / JOBS_PER_PAGE));
  // A page past the end is clamped rather than rendered empty — it is reachable
  // by editing the URL, and by filtering while deep in a longer result set.
  const page = Math.min(query.page, pageCount);
  const start = (page - 1) * JOBS_PER_PAGE;

  return {
    jobs: sorted.slice(start, start + JOBS_PER_PAGE),
    total,
    page,
    pageCount,
  };
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
