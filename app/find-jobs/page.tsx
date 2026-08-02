import { redirect } from "next/navigation";

import { JobFilters } from "@/components/find-jobs/JobFilters";
import { JobsTable } from "@/components/find-jobs/JobsTable";
import { SearchControls } from "@/components/find-jobs/SearchControls";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { LOGIN_ROUTE } from "@/lib/auth";
import { getCurrentUser } from "@/lib/insforge-server";
import { parseJobQuery } from "@/lib/jobs";
import { selectJobs } from "@/lib/jobs-query";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function FindJobsPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(LOGIN_ROUTE);
  }

  // Filter, sort and page all live in the URL, so the view is shareable and
  // survives a reload. selectJobs() turns them into one scoped, ordered,
  // ranged query against the jobs table.
  const query = parseJobQuery(await searchParams);
  const result = await selectJobs(user.id, query);

  return (
    <>
      <AppNavbar />

      <main className="flex-1 bg-background px-6 py-8">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-6">
          <h1 className="sr-only">Find jobs</h1>

          <SearchControls />
          <JobFilters query={query} />
          <JobsTable result={result} query={query} />
        </div>
      </main>
    </>
  );
}
