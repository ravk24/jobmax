import { z } from "zod";

import { createInsforgeServer } from "@/lib/insforge-server";

// The dashboard's read layer, server only — lib/jobs-query.ts stays the find-jobs
// list's file (scope, filter, sort, paginate) and Feature 16's agent_runs reads
// join this one. Returns raw numbers, not display strings: labels, "%" formatting
// and the badge math are presentation, and keeping them in app/dashboard/page.tsx
// is what spares this file the lib→components type import that MOCK_STATS needed.

type InsforgeServer = Awaited<ReturnType<typeof createInsforgeServer>>;

export type DashboardStats = {
  totalJobs: number;
  // null when the user has no scored jobs — data, not an error. AVG semantics:
  // unscored jobs are excluded, never counted as zero.
  avgMatchScore: number | null;
  companiesResearched: number;
  jobsThisWeek: number;
  // The 14→7-days-ago window, fetched so the page can compute the Jobs This
  // Week card's week-over-week badge.
  jobsPriorWeek: number;
};

export type DashboardStatsResult =
  | { status: "ok"; stats: DashboardStats }
  | { status: "error" };

const DAY_MS = 24 * 60 * 60 * 1000;

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

// Separate small count functions rather than one helper taking a builder —
// lib/jobs-query.ts documents why: a generic function that takes a
// PostgrestFilterBuilder and gives one back defeats the compiler.

async function countAllJobs(
  insforge: InsforgeServer,
  userId: string,
): Promise<number | null> {
  const { count, error } = await insforge.database
    .from("jobs")
    .select("id", { head: true, count: "exact" })
    .eq("user_id", userId);

  if (error) {
    console.error("[lib/dashboard-query]", error.message);
    return null;
  }
  return count ?? 0;
}

// build-plan.md § 15: a row count, not distinct companies — the same company
// researched on two job rows counts twice.
async function countResearchedJobs(
  insforge: InsforgeServer,
  userId: string,
): Promise<number | null> {
  const { count, error } = await insforge.database
    .from("jobs")
    .select("id", { head: true, count: "exact" })
    .eq("user_id", userId)
    .not("company_research", "is", null);

  if (error) {
    console.error("[lib/dashboard-query]", error.message);
    return null;
  }
  return count ?? 0;
}

// Rolling windows off found_at — the column the agent stamps and the list sorts
// by. Half-open [since, before): the boundary instant lands in exactly one week.
async function countJobsFoundBetween(
  insforge: InsforgeServer,
  userId: string,
  since: string,
  before: string | null,
): Promise<number | null> {
  let builder = insforge.database
    .from("jobs")
    .select("id", { head: true, count: "exact" })
    .eq("user_id", userId)
    .gte("found_at", since);

  if (before !== null) {
    builder = builder.lt("found_at", before);
  }

  const { count, error } = await builder;

  if (error) {
    console.error("[lib/dashboard-query]", error.message);
    return null;
  }
  return count ?? 0;
}

const matchScoreRowSchema = z.object({
  match_score: z.number().int(),
});

type AverageResult = { status: "ok"; value: number | null } | { status: "error" };

// Averaged in JS over one fetched integer column rather than a PostgREST
// aggregate — aggregate functions are opt-in server configuration this backend
// is not known to enable, and at this project's scale the column fetch is
// cheap. Revisit if the jobs table ever grows past what one response holds.
async function averageMatchScore(
  insforge: InsforgeServer,
  userId: string,
): Promise<AverageResult> {
  const { data, error } = await insforge.database
    .from("jobs")
    .select("match_score")
    .eq("user_id", userId)
    .not("match_score", "is", null);

  if (error) {
    console.error("[lib/dashboard-query]", error.message);
    return { status: "error" };
  }

  const parsed = z.array(matchScoreRowSchema).safeParse(data ?? []);

  if (!parsed.success) {
    console.error("[lib/dashboard-query]", parsed.error.issues);
    return { status: "error" };
  }

  if (parsed.data.length === 0) {
    return { status: "ok", value: null };
  }

  const sum = parsed.data.reduce((acc, row) => acc + row.match_score, 0);
  return { status: "ok", value: sum / parsed.data.length };
}

// The two in-scope activity kinds, as data — the page composes the message
// strings and the time-ago captions. `at` drives the merged ordering.
export type ActivityItem =
  | { kind: "search"; id: string; jobTitle: string; jobsFound: number; at: string }
  | { kind: "research"; id: string; company: string; at: string };

export type RecentActivityResult =
  | { status: "ok"; items: ActivityItem[] }
  | { status: "error" };

// The design shows five entries; fetching five per source is enough, because
// the overall top five is always contained in the union of each source's top
// five.
const ACTIVITY_LIMIT = 5;

const searchRunRowSchema = z.object({
  id: z.string(),
  job_title_searched: z.string(),
  jobs_found: z.number().int().nullable(),
  completed_at: z.string(),
});

// § Feature 13 review's carry-forward: research runs share agent_runs, and are
// recognisable by null search columns — a run only counts as a search when
// job_title_searched is set. Completed runs only ("agent_run completed",
// build-plan § 16); the completed_at not-null filter is defensive belt to
// status's braces, and spares the schema a nullable it would trip over.
async function selectSearchActivity(
  insforge: InsforgeServer,
  userId: string,
): Promise<ActivityItem[] | null> {
  const { data, error } = await insforge.database
    .from("agent_runs")
    .select("id,job_title_searched,jobs_found,completed_at")
    .eq("user_id", userId)
    .eq("status", "completed")
    .not("job_title_searched", "is", null)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(ACTIVITY_LIMIT);

  if (error) {
    console.error("[lib/dashboard-query]", error.message);
    return null;
  }

  const parsed = z.array(searchRunRowSchema).safeParse(data ?? []);

  if (!parsed.success) {
    console.error("[lib/dashboard-query]", parsed.error.issues);
    return null;
  }

  return parsed.data.map((row) => ({
    kind: "search",
    id: row.id,
    jobTitle: row.job_title_searched,
    // finishRun always writes jobs_found on a completed search run; 0 is the
    // honest degrade if a row ever arrives without it.
    jobsFound: row.jobs_found ?? 0,
    at: row.completed_at,
  }));
}

const researchedJobRowSchema = z.object({
  id: z.string(),
  company: z.string(),
  researched_at: z.string(),
});

// researched_at was added for exactly this read — the dossier save stamps it,
// and it is the only record of when research happened. The not-null filter
// keeps the read robust against any dossier row that predates the column.
async function selectResearchActivity(
  insforge: InsforgeServer,
  userId: string,
): Promise<ActivityItem[] | null> {
  const { data, error } = await insforge.database
    .from("jobs")
    .select("id,company,researched_at")
    .eq("user_id", userId)
    .not("company_research", "is", null)
    .not("researched_at", "is", null)
    .order("researched_at", { ascending: false })
    .limit(ACTIVITY_LIMIT);

  if (error) {
    console.error("[lib/dashboard-query]", error.message);
    return null;
  }

  const parsed = z.array(researchedJobRowSchema).safeParse(data ?? []);

  if (!parsed.success) {
    console.error("[lib/dashboard-query]", parsed.error.issues);
    return null;
  }

  return parsed.data.map((row) => ({
    kind: "research",
    id: row.id,
    company: row.company,
    at: row.researched_at,
  }));
}

export async function selectRecentActivity(
  userId: string,
): Promise<RecentActivityResult> {
  try {
    const insforge = await createInsforgeServer();

    const [searches, research] = await Promise.all([
      selectSearchActivity(insforge, userId),
      selectResearchActivity(insforge, userId),
    ]);

    // Either source failing fails the read — a feed silently missing one kind
    // of activity looks complete and is not, the selectDashboardStats posture.
    if (searches === null || research === null) {
      return { status: "error" };
    }

    const items = [...searches, ...research]
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
      .slice(0, ACTIVITY_LIMIT);

    return { status: "ok", items };
  } catch (error) {
    console.error("[lib/dashboard-query]", error);
    return { status: "error" };
  }
}

export async function selectDashboardStats(
  userId: string,
): Promise<DashboardStatsResult> {
  try {
    const insforge = await createInsforgeServer();
    const weekAgo = isoDaysAgo(7);
    const twoWeeksAgo = isoDaysAgo(14);

    // Any single failure fails the whole read — the selectJobs precedent. Three
    // real numbers next to one dash reads as data corruption, not a hiccup.
    const [totalJobs, companiesResearched, jobsThisWeek, jobsPriorWeek, average] =
      await Promise.all([
        countAllJobs(insforge, userId),
        countResearchedJobs(insforge, userId),
        countJobsFoundBetween(insforge, userId, weekAgo, null),
        countJobsFoundBetween(insforge, userId, twoWeeksAgo, weekAgo),
        averageMatchScore(insforge, userId),
      ]);

    if (
      totalJobs === null ||
      companiesResearched === null ||
      jobsThisWeek === null ||
      jobsPriorWeek === null ||
      average.status === "error"
    ) {
      return { status: "error" };
    }

    return {
      status: "ok",
      stats: {
        totalJobs,
        avgMatchScore: average.value,
        companiesResearched,
        jobsThisWeek,
        jobsPriorWeek,
      },
    };
  } catch (error) {
    console.error("[lib/dashboard-query]", error);
    return { status: "error" };
  }
}
