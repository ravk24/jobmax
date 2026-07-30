import { cn } from "@/lib/utils";

type LogLine = {
  tag?: string;
  tagClass?: string;
  text: string;
};

const LOG_LINES: LogLine[] = [
  {
    tag: "[SYSTEM]",
    tagClass: "text-accent",
    text: "Initializing JobMax Agent...",
  },
  {
    tag: "[SCAN]",
    tagClass: "text-info-dark",
    text: "Found 14 matching roles",
  },
  { text: "↳ Filtered out 3 roles (below match threshold)" },
  {
    tag: "[ACTION]",
    tagClass: "text-accent",
    text: "Researching Stripe — about, blog, engineering",
  },
  { text: "... Building company dossier" },
];

export function AgentLogPreview() {
  return (
    <div
      aria-hidden
      className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]"
    >
      <div className="flex items-center gap-3 bg-overlay-dark px-4 py-3">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-error" />
          <span className="size-2.5 rounded-full bg-warning" />
          <span className="size-2.5 rounded-full bg-success" />
        </div>
        <span className="font-mono text-xs leading-4 text-text-muted">
          agent_log.ts
        </span>
      </div>

      <ol className="flex flex-col gap-3 px-4 py-5">
        {LOG_LINES.map((line, index) => (
          <li key={line.text} className="flex gap-4">
            <span className="w-3 shrink-0 text-right font-mono text-xs leading-5 text-text-muted">
              {index + 1}
            </span>
            <span className="font-mono text-xs leading-5 text-text-dark">
              {line.tag ? (
                <span className={cn("font-medium", line.tagClass)}>
                  {line.tag}{" "}
                </span>
              ) : null}
              {line.text}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
