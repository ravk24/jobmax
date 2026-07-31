import { AlertCircle, CheckCircle2 } from "lucide-react";

type Props = {
  percentage: number;
  missingFields: string[];
};

const SIZE = 96;
const STROKE = 10;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function CompletionIndicator({ percentage, missingFields }: Props) {
  const dashOffset = CIRCUMFERENCE * (1 - percentage / 100);

  // Driven by the missing-field list rather than by percentage === 100. The two
  // agree today because calculateCompletion() derives both from the same array,
  // but a rounded 100 with a field still outstanding would otherwise congratulate
  // someone whose profile is not actually finished — and rounding is exactly
  // what a percentage does.
  const isComplete = missingFields.length === 0;

  return (
    <section className="rounded-2xl border border-border bg-surface p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
      {/* One live region over the whole banner, not just the percentage. The
          heading, the ring colour and the number all change together when a save
          completes the profile, and the meaningful announcement is "Profile
          complete" — the percentage alone used to be the only part a screen
          reader was told about. */}
      <div className="flex items-start justify-between gap-6" aria-live="polite">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base leading-6 font-semibold text-text-primary">
            {isComplete ? (
              <CheckCircle2 className="size-4 shrink-0 text-success-dark" />
            ) : (
              <AlertCircle className="size-4 shrink-0 text-error" />
            )}
            {isComplete ? "Profile complete" : "Profile needs attention"}
          </h2>

          <p className="mt-2 max-w-md text-sm leading-5 text-text-secondary">
            {isComplete
              ? "Every field we use for matching is filled in. You are ready to find jobs and generate a resume from these details."
              : "Complete the missing fields to improve your chance of getting tailored matches and generating quality resumes."}
          </p>

          {missingFields.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-2">
              {missingFields.map((field) => (
                <li
                  key={field}
                  className="rounded-sm bg-error/10 px-2 py-0.5 text-[11px] leading-4 font-medium tracking-wider text-error uppercase"
                >
                  {field}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="relative shrink-0">
          <svg
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="-rotate-90"
            aria-hidden="true"
          >
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              strokeWidth={STROKE}
              className={isComplete ? "stroke-success/15" : "stroke-error/15"}
            />
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              className={isComplete ? "stroke-success" : "stroke-error"}
            />
          </svg>

          {/* No role="status" here — it would be a live region nested inside the
              one above, which announces twice in some screen readers. */}
          <span className="absolute inset-0 flex items-center justify-center text-lg leading-6 font-bold text-text-primary">
            {percentage}%
          </span>
        </div>
      </div>
    </section>
  );
}
