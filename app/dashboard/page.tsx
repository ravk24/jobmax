import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { IncompleteProfileBanner } from "@/components/dashboard/IncompleteProfileBanner";
import { JobsFoundChart } from "@/components/dashboard/JobsFoundChart";
import { MatchScoreChart } from "@/components/dashboard/MatchScoreChart";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { ResearchActivityChart } from "@/components/dashboard/ResearchActivityChart";
import { StatsBar, type DashboardStat } from "@/components/dashboard/StatsBar";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { LOGIN_ROUTE } from "@/lib/auth";
import {
  MOCK_ACTIVITY,
  MOCK_JOBS_FOUND,
  MOCK_MATCH_DISTRIBUTION,
  MOCK_RESEARCH_ACTIVITY,
} from "@/lib/dashboard-mock";
import {
  selectDashboardStats,
  type DashboardStatsResult,
} from "@/lib/dashboard-query";
import { getCurrentUser, readProfile } from "@/lib/insforge-server";
import { blankProfile, calculateCompletion } from "@/lib/profile";

export const metadata: Metadata = {
  title: "Dashboard — JobMax",
};

// The success-green badge is the only badge StatsBar has, so it appears only
// for genuine positive movement: prior period 0 would divide to nonsense for a
// new user, a negative week has no red variant to wear, and a sub-1% change
// rounds to "+0%".
function trendBadge(current: number, prior: number): string | null {
  if (prior <= 0 || current <= prior) {
    return null;
  }

  const pct = Math.round(((current - prior) / prior) * 100);
  return pct > 0 ? `+${pct}%` : null;
}

// Presentation lives here, not in lib/dashboard-query.ts — the same split as
// the banner, where the lib returns data and the page decides what it says.
function buildStats(result: DashboardStatsResult): DashboardStat[] {
  // A failed read renders dashes, not a missing section: the layout holds, and
  // "—" says "couldn't load" where a hidden bar would say "you have nothing".
  if (result.status === "error") {
    return [
      { label: "Total Jobs Found", value: "—", caption: "All time" },
      { label: "Avg. Match Rate", value: "—", caption: "Across scored jobs" },
      { label: "Companies Researched", value: "—", caption: "Total researched" },
      { label: "Jobs This Week", value: "—", caption: "New this week" },
    ];
  }

  const {
    totalJobs,
    avgMatchScore,
    companiesResearched,
    jobsThisWeek,
    jobsPriorWeek,
  } = result.stats;

  // Total's week-over-week compares against where the total stood a week ago,
  // which is derivable as total minus the last seven days' arrivals.
  const totalTrend = trendBadge(totalJobs, totalJobs - jobsThisWeek);
  const weekTrend = trendBadge(jobsThisWeek, jobsPriorWeek);

  return [
    {
      label: "Total Jobs Found",
      value: String(totalJobs),
      trend: totalTrend ?? undefined,
      caption: totalTrend ? "vs last week" : "All time",
    },
    {
      label: "Avg. Match Rate",
      // null means no scored jobs yet — a dash, while the counts show real
      // zeros. Unscored jobs are excluded from the average, not counted as 0.
      value: avgMatchScore === null ? "—" : `${Math.round(avgMatchScore)}%`,
      caption: "Across scored jobs",
    },
    {
      label: "Companies Researched",
      value: String(companiesResearched),
      caption: "Total researched",
    },
    {
      label: "Jobs This Week",
      value: String(jobsThisWeek),
      trend: weekTrend ?? undefined,
      caption: weekTrend ? "vs last week" : "New this week",
    },
  ];
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect(LOGIN_ROUTE);
  }

  // Independent reads, so they run together. Each degrades on its own: a failed
  // profile read renders the dashboard without the banner — /profile owns that
  // failure state — and a failed stats read renders dashes via buildStats.
  const [result, statsResult] = await Promise.all([
    readProfile(user),
    selectDashboardStats(user.id),
  ]);
  const missingFields =
    result.status === "error"
      ? []
      : calculateCompletion(
          result.status === "found" ? result.profile : blankProfile(user),
        ).missingFields;

  return (
    <>
      <AppNavbar />

      <main className="flex-1 bg-background px-6 py-8">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-6">
          {/* The design shows no page title; the sr-only h1 keeps the document
              outline honest — the find-jobs precedent. */}
          <h1 className="sr-only">Dashboard</h1>

          <IncompleteProfileBanner missingFields={missingFields} />

          <StatsBar stats={buildStats(statsResult)} />

          <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
            <RecentActivity entries={MOCK_ACTIVITY} />
            <ResearchActivityChart data={MOCK_RESEARCH_ACTIVITY} />
          </div>

          <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
            <JobsFoundChart data={MOCK_JOBS_FOUND} />
            <MatchScoreChart data={MOCK_MATCH_DISTRIBUTION} />
          </div>
        </div>
      </main>
    </>
  );
}
