import { FileText } from "lucide-react";

import type { JobDetail } from "@/lib/jobs";

const CARD =
  "rounded-2xl border border-border bg-surface p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]";

type Props = {
  aboutRole: JobDetail["about_role"];
};

// about_role holds Adzuna's snippet, not the full posting — it arrives already
// truncated with its own ellipsis, which is the "..." the design mock shows.
// Nothing is clamped here; the text is rendered as stored.
export function JobDescription({ aboutRole }: Props) {
  return (
    <section className={CARD}>
      <h2 className="flex items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-secondary">
          <FileText className="size-4 text-text-muted" />
        </span>
        <span className="text-base leading-6 font-semibold text-text-primary">
          Job Description
        </span>
      </h2>

      {aboutRole ? (
        <p className="mt-4 text-sm leading-6 whitespace-pre-line text-text-primary">
          {aboutRole}
        </p>
      ) : (
        <p className="mt-4 text-sm leading-5 text-text-muted">
          No description was provided for this role. Use View Job Post to read it
          on the original listing.
        </p>
      )}
    </section>
  );
}
