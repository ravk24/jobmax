import { Building2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";

const CARD =
  "overflow-hidden rounded-2xl border border-border bg-surface shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]";

type Props = {
  company: string;
};

export function CompanyResearch({ company }: Props) {
  return (
    <section className={CARD}>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-6">
        <h2 className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-muted">
            <Building2 className="size-4 text-accent" />
          </span>
          <span className="text-base leading-6 font-semibold text-text-primary">
            Company Research
          </span>
        </h2>

        {/* Feature 13 owns the behaviour behind this button: it posts to
            /api/agent/research, which drives the Browserbase + Stagehand run and
            writes jobs.company_research. Disabled until that route exists —
            an enabled button that does nothing is worse than one that admits it.
            Feature 13 also adds the column to JOB_DETAIL_COLUMNS and the branch
            that renders the dossier in place of the empty state below. */}
        <Button type="button" variant="default" size="cta" disabled>
          <Search data-icon="inline-start" />
          Research Company
        </Button>
      </div>

      <div className="flex flex-col items-center px-6 py-12 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-accent-muted">
          <Building2 className="size-5 text-accent" />
        </span>

        <h3 className="mt-4 text-base leading-6 font-semibold text-text-primary">
          No research yet
        </h3>

        <p className="mt-1 max-w-md text-sm leading-5 text-text-muted">
          Research Company will let the AI browse {company}&apos;s public pages
          and build a dossier — company overview, tech stack, culture and
          interview prep.
        </p>
      </div>
    </section>
  );
}
