import { cn } from "@/lib/utils";

export type ActivityEntry = {
  id: string;
  // The two in-scope activity types (Feature 16 merges agent_runs and
  // researched jobs): dot colours follow the type, not the mock's pixels —
  // the mock's purple rows belong to out-of-scope activity kinds.
  kind: "search" | "research";
  message: string;
  timeAgo: string;
};

type Props = {
  entries: ActivityEntry[];
  // Shown when entries is empty. The page distinguishes "no activity yet"
  // from "the read failed" here — the card itself never hides (the
  // SkillsComparison rule: a section that can be empty shows an empty state).
  emptyMessage?: string;
};

// ui-tokens.md § Activity Dots: 8px inner dot inside a 16px tinted ring.
const DOT: Record<ActivityEntry["kind"], { ring: string; dot: string }> = {
  search: { ring: "bg-success-light", dot: "bg-success-alt" },
  research: { ring: "bg-info-light", dot: "bg-info" },
};

export function RecentActivity({
  entries,
  emptyMessage = "No activity yet.",
}: Props) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
      <div className="border-b border-border p-6">
        <h2 className="text-base leading-6 font-semibold text-text-primary">
          Recent Activity
        </h2>
      </div>

      {entries.length === 0 ? (
        <p className="p-6 text-sm leading-5 text-text-muted">{emptyMessage}</p>
      ) : (
        <ol className="p-6">
          {entries.map((entry, index) => {
            const isLast = index === entries.length - 1;

            return (
              <li key={entry.id} className="flex gap-3">
                <span className="flex flex-col items-center">
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-full",
                      DOT[entry.kind].ring,
                    )}
                  >
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        DOT[entry.kind].dot,
                      )}
                    />
                  </span>
                  {!isLast && <span className="mt-1 w-px flex-1 bg-border" />}
                </span>

                <span className={cn("min-w-0", !isLast && "pb-5")}>
                  <span className="block truncate text-sm leading-5 font-medium text-text-primary">
                    {entry.message}
                  </span>
                  <span className="mt-0.5 block text-xs leading-4 text-text-muted">
                    {entry.timeAgo}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
