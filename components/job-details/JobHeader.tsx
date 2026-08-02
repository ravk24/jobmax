import { Building2, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { JobDetail } from "@/lib/jobs";
import { cn, matchScoreBadgeClass } from "@/lib/utils";

const CARD =
  "rounded-2xl border border-border bg-surface p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]";

const BADGE = "rounded-full px-2 py-0.5 text-[10px] leading-4 font-medium";

type Props = {
  job: JobDetail;
};

export function JobHeader({ job }: Props) {
  return (
    <section
      className={cn(CARD, "flex flex-wrap items-start justify-between gap-4")}
    >
      <div className="flex min-w-0 items-center gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-secondary">
          <Building2 className="size-5 text-text-muted" />
        </span>

        <div className="min-w-0">
          <h1 className="text-2xl leading-tight font-bold tracking-tight text-text-primary">
            {job.title}
          </h1>

          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm leading-5 text-text-secondary">
            <span>{job.company}</span>
            <span aria-hidden className="text-text-muted">
              •
            </span>
            {/* An unscored job says so rather than dropping the pill: the row it
                was reached from also reads "Not scored", and a missing badge
                would read as a page that failed to finish loading. */}
            {job.match_score === null ? (
              <span
                className={cn(BADGE, "bg-surface-secondary text-text-secondary")}
              >
                Not scored
              </span>
            ) : (
              <span className={cn(BADGE, matchScoreBadgeClass(job.match_score))}>
                {job.match_score}% Match Score
              </span>
            )}
          </p>
        </div>
      </div>

      {/* A real disabled button, never a styled dead anchor — and both this and
          Apply Now point at external_apply_url, the tracked link. source_url is
          the dedupe identity and is not a click target. */}
      {job.external_apply_url ? (
        <Button asChild variant="outline" size="cta">
          <a
            href={job.external_apply_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink data-icon="inline-start" />
            View Job Post
          </a>
        </Button>
      ) : (
        <Button type="button" variant="outline" size="cta" disabled>
          <ExternalLink data-icon="inline-start" />
          No job post link
        </Button>
      )}
    </section>
  );
}
