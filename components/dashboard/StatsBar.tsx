export type DashboardStat = {
  label: string;
  value: string;
  // Rendered as the green trend badge when present; the caption sits beside it.
  trend?: string;
  caption: string;
};

type Props = {
  stats: DashboardStat[];
};

const CARD =
  "rounded-2xl border border-border bg-surface p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]";

export function StatsBar({ stats }: Props) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className={CARD}>
          <span className="block text-sm leading-5 font-medium text-text-secondary">
            {stat.label}
          </span>
          <span className="mt-1 block text-3xl leading-9 font-semibold text-text-primary">
            {stat.value}
          </span>
          <span className="mt-2 flex items-center gap-2">
            {stat.trend && (
              <span className="rounded-sm bg-success-lightest px-2 py-0.5 text-xs leading-4 font-medium text-success-darker">
                {stat.trend}
              </span>
            )}
            <span className="text-xs leading-4 text-text-muted">
              {stat.caption}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
