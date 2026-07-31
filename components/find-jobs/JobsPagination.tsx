import Link from "next/link";

import { Button } from "@/components/ui/button";
import { JOBS_PER_PAGE, jobsHref, type JobQuery } from "@/lib/jobs";
import { cn } from "@/lib/utils";

// size="lg" is the h-9 outline button; px-3 widens it from the primitive's
// px-2.5 to the design's step width. Everything else comes from the variant.
const STEP = "px-3";

type Props = {
  query: JobQuery;
  total: number;
  page: number;
  pageCount: number;
};

// Always the first and last page, plus a window around the current one, with a
// gap marker wherever a run is skipped: 1 2 3 … 8.
function pageItems(page: number, pageCount: number): (number | "gap")[] {
  const shown = new Set<number>([1, pageCount]);

  for (let candidate = page - 1; candidate <= page + 1; candidate += 1) {
    shown.add(candidate);
  }
  if (page <= 2) {
    shown.add(2);
    shown.add(3);
  }
  if (page >= pageCount - 1) {
    shown.add(pageCount - 1);
    shown.add(pageCount - 2);
  }

  const pages = [...shown]
    .filter((candidate) => candidate >= 1 && candidate <= pageCount)
    .sort((a, b) => a - b);

  const items: (number | "gap")[] = [];
  let previous = 0;

  for (const candidate of pages) {
    if (previous && candidate - previous > 1) {
      items.push("gap");
    }
    items.push(candidate);
    previous = candidate;
  }

  return items;
}

export function JobsPagination({ query, total, page, pageCount }: Props) {
  const from = (page - 1) * JOBS_PER_PAGE + 1;
  const to = Math.min(page * JOBS_PER_PAGE, total);

  return (
    <div className="flex flex-col gap-4 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm leading-5 text-text-secondary">
        Showing <span className="font-medium text-text-primary">{from}</span> to{" "}
        <span className="font-medium text-text-primary">{to}</span> of{" "}
        <span className="font-medium text-text-primary">{total}</span> results
        <span className="text-text-muted"> &middot; Jobs by Adzuna</span>
      </p>

      {pageCount > 1 ? (
        <nav
          aria-label="Pagination"
          className="flex flex-wrap items-center gap-2"
        >
          <PageStep
            query={query}
            page={page - 1}
            disabled={page === 1}
            label="Previous"
          />

          {pageItems(page, pageCount).map((item, index) =>
            item === "gap" ? (
              <span
                key={`gap-${index}`}
                aria-hidden
                className="px-1 text-sm leading-5 text-text-muted"
              >
                &hellip;
              </span>
            ) : (
              <Button
                key={item}
                asChild
                variant="outline"
                size="lg"
                className={cn(
                  STEP,
                  item === page && "border-accent bg-accent-muted text-accent",
                )}
              >
                <Link
                  href={jobsHref({ ...query, page: item })}
                  aria-label={`Page ${item}`}
                  aria-current={item === page ? "page" : undefined}
                >
                  {item}
                </Link>
              </Button>
            ),
          )}

          <PageStep
            query={query}
            page={page + 1}
            disabled={page === pageCount}
            label="Next"
          />
        </nav>
      ) : null}
    </div>
  );
}

// A private sub-element of the pager, not a component in its own right — it is
// never exported and has no meaning outside this file, so it does not break the
// one-component-per-file rule in code-standards.md.
//
// A link with no destination is a button, not an anchor wearing
// pointer-events-none — see ui-registry.md § Download button.
function PageStep({
  query,
  page,
  disabled,
  label,
}: {
  query: JobQuery;
  page: number;
  disabled: boolean;
  label: string;
}) {
  if (disabled) {
    return (
      <Button
        type="button"
        variant="outline"
        size="lg"
        disabled
        className={STEP}
      >
        {label}
      </Button>
    );
  }

  return (
    <Button asChild variant="outline" size="lg" className={STEP}>
      <Link href={jobsHref({ ...query, page })}>{label}</Link>
    </Button>
  );
}
