import Link from "next/link";
import { Building2, Search, SearchX } from "lucide-react";

import { JobsPagination } from "@/components/find-jobs/JobsPagination";
import { Button } from "@/components/ui/button";
import { formatFoundAt, type JobQuery, type JobSelection } from "@/lib/jobs";
import { cn, matchScoreBarClass } from "@/lib/utils";

const CARD =
  "overflow-hidden rounded-2xl border border-border bg-surface shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]";

// One definition for the header and every row, so a column cannot drift out of
// alignment with its own label.
const COLUMNS =
  "grid grid-cols-[1.4fr_1.9fr_1.1fr_1.1fr_1fr] items-center gap-4 px-6 py-4";

const HEADINGS = [
  "Company",
  "Role",
  "Match Score",
  "Salary Est.",
  "Date Found",
];

type Props = {
  selection: JobSelection;
  query: JobQuery;
  // Distinguishes "no jobs yet" from "no jobs match these filters" — the two
  // empty states say completely different things to the user.
  hasAnyJobs: boolean;
};

export function JobsTable({ selection, query, hasAnyJobs }: Props) {
  if (selection.total === 0) {
    return (
      <section className={cn(CARD, "px-6 py-12 text-center")}>
        <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-accent-muted">
          {hasAnyJobs ? (
            <SearchX className="size-5 text-accent" />
          ) : (
            <Search className="size-5 text-accent" />
          )}
        </span>

        <h2 className="mt-4 text-base leading-6 font-semibold text-text-primary">
          {hasAnyJobs ? "No jobs match these filters" : "No jobs yet"}
        </h2>

        <p className="mx-auto mt-1 max-w-md text-sm leading-5 text-text-muted">
          {hasAnyJobs
            ? "Nothing here matches what you are filtering for. Widen the match band or clear the search text."
            : "Search a job title and location above. JobMax scores every result against your profile and saves the strong matches here."}
        </p>

        {hasAnyJobs ? (
          <Button asChild variant="outline" size="cta" className="mt-5">
            <Link href="/find-jobs">Clear filters</Link>
          </Button>
        ) : null}
      </section>
    );
  }

  return (
    <section className={CARD}>
      <div className="overflow-x-auto">
        <div className="min-w-[840px]">
          <div
            className={cn(
              COLUMNS,
              "border-b border-border bg-surface-secondary py-3",
            )}
          >
            {HEADINGS.map((heading) => (
              <span
                key={heading}
                className="text-xs leading-4 font-medium tracking-wider text-text-secondary uppercase"
              >
                {heading}
              </span>
            ))}
          </div>

          {selection.jobs.map((job) => (
            <Link
              key={job.id}
              href={`/find-jobs/${job.id}`}
              className={cn(
                COLUMNS,
                "border-b border-border transition-colors last:border-b-0 hover:bg-surface-secondary",
              )}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface-secondary">
                  <Building2 className="size-4 text-text-muted" />
                </span>
                <span className="truncate text-sm leading-5 font-semibold text-text-primary">
                  {job.company}
                </span>
              </span>

              <span className="truncate text-sm leading-5 text-text-primary">
                {job.title}
              </span>

              {job.match_score === null ? (
                <span className="text-sm leading-5 text-text-muted">
                  Not scored
                </span>
              ) : (
                <span className="flex items-center gap-3">
                  <span className="h-1 w-full max-w-[120px] overflow-hidden rounded-full bg-border-light">
                    {/* The one sanctioned inline style in the project: a runtime
                        percentage cannot be a static Tailwind class. */}
                    <span
                      className={cn(
                        "block h-full rounded-full",
                        matchScoreBarClass(job.match_score),
                      )}
                      style={{ width: `${job.match_score}%` }}
                    />
                  </span>
                  <span className="shrink-0 text-sm leading-5 font-medium text-text-primary">
                    {job.match_score}%
                  </span>
                </span>
              )}

              <span className="text-sm leading-5 text-text-secondary">
                {job.salary ?? "—"}
              </span>

              <span className="text-sm leading-5 text-text-secondary">
                {formatFoundAt(job.found_at)}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <JobsPagination
        query={query}
        total={selection.total}
        page={selection.page}
        pageCount={selection.pageCount}
      />
    </section>
  );
}
