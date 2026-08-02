import { Sparkles } from "lucide-react";

import type { JobDetail } from "@/lib/jobs";

const CARD =
  "rounded-2xl border border-border bg-surface p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]";

type Props = {
  reason: JobDetail["match_reason"];
};

export function MatchReasoning({ reason }: Props) {
  return (
    <section className={CARD}>
      <h2 className="flex items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-success-lightest">
          <Sparkles className="size-4 text-success" />
        </span>
        <span className="text-xs leading-4 font-semibold tracking-wider text-text-secondary uppercase">
          AI Match Reasoning
        </span>
      </h2>

      {/* The section keeps its place when the job was never scored — 10 of the
          rows in the database are exactly that, from the broken-Gemini test —
          rather than vanishing and changing the page's shape between jobs. */}
      {reason ? (
        <p className="mt-4 text-sm leading-6 text-text-primary">{reason}</p>
      ) : (
        <p className="mt-4 text-sm leading-5 text-text-muted">
          This job has not been scored against your profile yet.
        </p>
      )}
    </section>
  );
}
