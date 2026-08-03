import { Check, X } from "lucide-react";

import type { JobDetail } from "@/lib/jobs";
import { cn } from "@/lib/utils";

const CARD =
  "rounded-2xl border border-border bg-surface p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]";

const CHIP =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs leading-4 font-medium";

type Props = {
  matched: JobDetail["matched_skills"];
  missing: JobDetail["missing_skills"];
};

export function SkillsComparison({ matched, missing }: Props) {
  // Deduped because agent/matcher.ts does not — Gemini can list a skill twice,
  // and the skill is the React key, which must be unique.
  const have = Array.from(new Set(matched ?? []));
  const gaps = Array.from(new Set(missing ?? []));

  return (
    <section className={CARD}>
      <h2 className="text-xs leading-4 font-semibold tracking-wider text-text-secondary uppercase">
        Required Skills vs Your Profile
      </h2>

      {have.length === 0 && gaps.length === 0 ? (
        <p className="mt-4 text-sm leading-5 text-text-muted">
          No skill comparison yet — this job has not been scored against your
          profile.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {/* Each group hides on its own. A perfect match has no gap skills, and
              an empty "Gap skills" heading over nothing reads as a bug. */}
          {have.length > 0 ? (
            <div>
              <p className="text-sm leading-5 text-text-secondary">You have</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {have.map((skill) => (
                  <li
                    key={skill}
                    className={cn(
                      CHIP,
                      "bg-success-lightest text-success-foreground",
                    )}
                  >
                    <Check className="size-3" aria-hidden />
                    {skill}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {gaps.length > 0 ? (
            <div>
              <p className="text-sm leading-5 text-text-secondary">Gap skills</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {gaps.map((skill) => (
                  <li
                    key={skill}
                    className={cn(CHIP, "bg-accent-muted text-accent")}
                  >
                    <X className="size-3" aria-hidden />
                    {skill}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
