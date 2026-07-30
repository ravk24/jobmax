import { Building2 } from "lucide-react";

import { cn, matchScoreBarClass } from "@/lib/utils";

type PreviewJob = {
  company: string;
  matchScore: number;
  salary: string;
  source: "Search" | "URL";
};

const COLUMNS = "grid grid-cols-[1.2fr_1fr_1fr_0.8fr] gap-3 px-4 py-3";

const PREVIEW_JOBS: PreviewJob[] = [
  { company: "Vercel", matchScore: 94, salary: "$160k - $200k", source: "Search" },
  { company: "Stripe", matchScore: 88, salary: "$180k - $240k", source: "URL" },
  { company: "Linear", matchScore: 96, salary: "$150k - $190k", source: "Search" },
  { company: "Notion", matchScore: 72, salary: "$130k - $170k", source: "Search" },
  { company: "OpenAI", matchScore: 91, salary: "$200k - $280k", source: "Search" },
  { company: "Figma", matchScore: 85, salary: "$170k - $220k", source: "URL" },
];

export function JobsTablePreview() {
  return (
    <div
      aria-hidden
      className="w-full max-w-md overflow-x-auto rounded-2xl border border-border bg-surface shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]"
    >
      <div className="min-w-[360px]">
        <div className={cn(COLUMNS, "border-b border-border")}>
          {["Company", "Match Score", "Salary Est.", "Source"].map((label) => (
            <span
              key={label}
              className="text-[10px] leading-4 font-medium tracking-wide text-text-secondary uppercase"
            >
              {label}
            </span>
          ))}
        </div>

        {PREVIEW_JOBS.map((job) => (
          <div
            key={job.company}
            className={cn(
              COLUMNS,
              "items-center border-b border-border last:border-b-0",
            )}
          >
            <div className="flex items-center gap-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-border bg-surface-secondary">
                <Building2 className="size-3 text-text-muted" />
              </span>
              <span className="text-xs leading-4 font-medium text-text-primary">
                {job.company}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="h-1 w-10 shrink-0 overflow-hidden rounded-full bg-border-light">
                <span
                  className={cn(
                    "block h-full rounded-full",
                    matchScoreBarClass(job.matchScore),
                  )}
                  style={{ width: `${job.matchScore}%` }}
                />
              </span>
              <span className="text-xs leading-4 font-medium text-text-primary">
                {job.matchScore}%
              </span>
            </div>

            <span className="text-xs leading-4 text-text-secondary">
              {job.salary}
            </span>

            <span
              className={cn(
                "justify-self-start rounded-full px-2 py-0.5 text-[10px] leading-4 font-medium",
                job.source === "Search"
                  ? "bg-linkedin-light text-linkedin"
                  : "bg-surface-secondary text-text-secondary",
              )}
            >
              {job.source}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
