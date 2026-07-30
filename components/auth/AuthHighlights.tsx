import { Building2, Search, Target } from "lucide-react";

const POINTS = [
  { icon: Search, label: "Roles pulled from Adzuna, filtered to tech" },
  { icon: Target, label: "Every job scored 0–100 against your profile" },
  { icon: Building2, label: "A company briefing ready before you apply" },
];

export function AuthHighlights() {
  return (
    <ul className="flex flex-col gap-4">
      {POINTS.map(({ icon: Icon, label }) => (
        <li key={label} className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface">
            <Icon className="size-4 text-accent" />
          </span>
          <span className="text-sm leading-5 font-medium text-text-dark">
            {label}
          </span>
        </li>
      ))}
    </ul>
  );
}
