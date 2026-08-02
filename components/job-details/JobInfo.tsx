import {
  Briefcase,
  Calendar,
  DollarSign,
  MapPin,
  type LucideIcon,
} from "lucide-react";

import { formatFoundAt, formatJobType, type JobDetail } from "@/lib/jobs";
import { cn } from "@/lib/utils";

// A tighter card than the p-6 content card: these are four small tiles in a row,
// and p-6 leaves them taller than the content they hold.
const TILE =
  "flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]";

type Tile = {
  label: string;
  value: string;
  icon: LucideIcon;
  iconClass: string;
};

type Props = {
  job: JobDetail;
};

export function JobInfo({ job }: Props) {
  // Null columns render a dash rather than disappearing, so the four tiles keep
  // their positions whichever job is open.
  const tiles: Tile[] = [
    {
      label: "Salary Est.",
      value: job.salary ?? "—",
      icon: DollarSign,
      iconClass: "bg-success-lightest text-success",
    },
    {
      label: "Location",
      value: job.location ?? "—",
      icon: MapPin,
      iconClass: "bg-info-lightest text-info-dark",
    },
    {
      label: "Job Type",
      value: formatJobType(job.job_type),
      icon: Briefcase,
      iconClass: "bg-accent-muted text-accent",
    },
    {
      label: "Date Found",
      value: formatFoundAt(job.found_at),
      icon: Calendar,
      iconClass: "bg-surface-secondary text-text-muted",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((tile) => {
        const Icon = tile.icon;

        return (
          <div key={tile.label} className={TILE}>
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg",
                tile.iconClass,
              )}
            >
              <Icon className="size-4" />
            </span>

            <span className="min-w-0">
              {/* Location in particular runs long — "Newark, Essex County…" —
                  so the value truncates and carries its full text as a title. */}
              <span
                title={tile.value}
                className="block truncate text-sm leading-5 font-semibold text-text-primary"
              >
                {tile.value}
              </span>
              <span className="block text-xs leading-4 tracking-wider text-text-muted uppercase">
                {tile.label}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
