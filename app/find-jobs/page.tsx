import { redirect } from "next/navigation";

import { JobFilters } from "@/components/find-jobs/JobFilters";
import { JobsTable } from "@/components/find-jobs/JobsTable";
import { SearchControls } from "@/components/find-jobs/SearchControls";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { LOGIN_ROUTE } from "@/lib/auth";
import { getCurrentUser } from "@/lib/insforge-server";
import { parseJobQuery, selectJobs } from "@/lib/jobs";
import { MOCK_JOBS } from "@/lib/jobs-mock";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function FindJobsPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(LOGIN_ROUTE);
  }

  // Filter, sort and page all live in the URL, so the view is shareable and
  // survives a reload. Feature 11 swaps MOCK_JOBS and the body of selectJobs()
  // for an InsForge query — nothing below changes.
  const query = parseJobQuery(await searchParams);
  const selection = selectJobs(MOCK_JOBS, query);

  return (
    <>
      <AppNavbar />

      <main className="flex-1 bg-background px-6 py-8">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-6">
          <h1 className="sr-only">Find jobs</h1>

          <SearchControls />
          <JobFilters query={query} />
          <JobsTable
            selection={selection}
            query={query}
            hasAnyJobs={MOCK_JOBS.length > 0}
          />
        </div>
      </main>
    </>
  );
}
