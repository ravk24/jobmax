import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { IncompleteProfileBanner } from "@/components/dashboard/IncompleteProfileBanner";
import { JobsFoundChart } from "@/components/dashboard/JobsFoundChart";
import { MatchScoreChart } from "@/components/dashboard/MatchScoreChart";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { ResearchActivityChart } from "@/components/dashboard/ResearchActivityChart";
import { StatsBar } from "@/components/dashboard/StatsBar";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { LOGIN_ROUTE } from "@/lib/auth";
import {
  MOCK_ACTIVITY,
  MOCK_JOBS_FOUND,
  MOCK_MATCH_DISTRIBUTION,
  MOCK_RESEARCH_ACTIVITY,
  MOCK_STATS,
} from "@/lib/dashboard-mock";
import { getCurrentUser, readProfile } from "@/lib/insforge-server";
import { blankProfile, calculateCompletion } from "@/lib/profile";

export const metadata: Metadata = {
  title: "Dashboard — JobMax",
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect(LOGIN_ROUTE);
  }

  // The banner is the page's one real read. A failed profile read renders the
  // dashboard without it — /profile owns that failure state, and a dashboard
  // must not block on a row it only decorates from.
  const result = await readProfile(user);
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

          <StatsBar stats={MOCK_STATS} />

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
