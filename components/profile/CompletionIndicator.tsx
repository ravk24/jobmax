import { AlertCircle } from "lucide-react";

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

  return (
    <section className="rounded-2xl border border-border bg-surface p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base leading-6 font-semibold text-text-primary">
            <AlertCircle className="size-4 shrink-0 text-error" />
            Profile needs attention
          </h2>

          <p className="mt-2 max-w-md text-sm leading-5 text-text-secondary">
            Complete the missing fields to improve your chance of getting
            tailored matches and generating quality resumes.
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
              className="stroke-error/15"
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
              className="stroke-error"
            />
          </svg>

          <span
            className="absolute inset-0 flex items-center justify-center text-lg leading-6 font-bold text-text-primary"
            role="status"
          >
            {percentage}%
          </span>
        </div>
      </div>
    </section>
  );
}
