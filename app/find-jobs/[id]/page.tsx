import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { CompanyResearch } from "@/components/job-details/CompanyResearch";
import { JobActions } from "@/components/job-details/JobActions";
import { JobDescription } from "@/components/job-details/JobDescription";
import { JobHeader } from "@/components/job-details/JobHeader";
import { JobInfo } from "@/components/job-details/JobInfo";
import { JobLoadError } from "@/components/job-details/JobLoadError";
import { MatchReasoning } from "@/components/job-details/MatchReasoning";
import { SkillsComparison } from "@/components/job-details/SkillsComparison";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { LOGIN_ROUTE } from "@/lib/auth";
import { getCurrentUser } from "@/lib/insforge-server";
import type { JobReadResult } from "@/lib/jobs";
import { selectJob } from "@/lib/jobs-query";

type Props = {
  params: Promise<{ id: string }>;
};

type LoadResult = JobReadResult | { status: "unauthenticated" };

// generateMetadata and the page body both need the job, and Next calls them
// separately. cache() makes the pair share one auth call and one query for the
// duration of a single request.
const loadJob = cache(async (id: string): Promise<LoadResult> => {
  const user = await getCurrentUser();

  if (!user) {
    return { status: "unauthenticated" };
  }

  return selectJob(user.id, id);
});

// The first page in the app to override the root layout's single shared title,
// so this route is distinguishable in a tab, in history and in a bookmark.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const result = await loadJob(id);

  if (result.status !== "found") {
    return { title: "JobMax" };
  }

  return { title: `${result.job.title} at ${result.job.company} — JobMax` };
}

export default async function JobDetailsPage({ params }: Props) {
  const { id } = await params;
  const result = await loadJob(id);

  if (result.status === "unauthenticated") {
    redirect(LOGIN_ROUTE);
  }

  // A job that does not exist and one belonging to someone else are the same
  // answer here, because RLS returns no row for either — and neither is an error.
  if (result.status === "empty") {
    notFound();
  }

  return (
    <>
      <AppNavbar />

      <main className="flex-1 bg-background px-6 py-8">
        <div className="mx-auto flex max-w-[940px] flex-col gap-6">
          <Link
            href="/find-jobs"
            className="inline-flex w-fit items-center gap-1 text-sm leading-5 font-medium text-text-secondary transition-colors hover:text-text-primary"
          >
            <ChevronLeft className="size-4" aria-hidden />
            Back to Jobs
          </Link>

          {result.status === "error" ? (
            <JobLoadError />
          ) : (
            <>
              <JobHeader job={result.job} />
              <JobInfo job={result.job} />
              <MatchReasoning reason={result.job.match_reason} />
              <SkillsComparison
                matched={result.job.matched_skills}
                missing={result.job.missing_skills}
              />
              <JobDescription aboutRole={result.job.about_role} />
              <CompanyResearch company={result.job.company} />
              <JobActions
                company={result.job.company}
                applyUrl={result.job.external_apply_url}
              />
            </>
          )}
        </div>
      </main>
    </>
  );
}
