"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ResearchStatus = { kind: "error" | "notice"; message: string };

type ResearchResponse = {
  success: boolean;
  data?: { browsed: boolean };
  error?: string;
};

type Props = {
  jobId: string;
  hasResearch: boolean;
};

// The trigger for /api/agent/research. A client fetch rather than a Server
// Action because architecture.md forbids Server Actions from calling agent
// functions — the same sanctioned-mutation path SearchControls uses. The route
// holds the connection for the whole run, so this request is the one place in
// the app a fetch legitimately takes a minute or two; the pending line says so,
// because a silent 90-second spinner reads as a hang.
export function ResearchButton({ jobId, hasResearch }: Props) {
  const router = useRouter();
  const [isResearching, setIsResearching] = useState(false);
  const [status, setStatus] = useState<ResearchStatus | null>(null);
  // A ref, not the state: disabling via state commits only after a re-render,
  // and a double-click's second event arrives first — verified live, where one
  // click started two full runs 100ms apart. The ref flips synchronously.
  const inFlight = useRef(false);

  async function handleClick() {
    if (inFlight.current) {
      return;
    }
    inFlight.current = true;
    setStatus(null);
    setIsResearching(true);

    try {
      const response = await fetch("/api/agent/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });

      const result: ResearchResponse = await response.json();

      // Never trusts the status alone — same rule as SearchControls.
      if (!response.ok || !result.success || !result.data) {
        setStatus({
          kind: "error",
          message: result.error ?? "Could not research this company.",
        });
        return;
      }

      // A dossier written without the company's site is still a dossier, but
      // saying so beats delivering less than the button promised — the same
      // degrade-and-admit rule the resume card follows.
      if (!result.data.browsed) {
        setStatus({
          kind: "notice",
          message:
            "The company's site could not be read — this dossier is written from the job posting and your profile.",
        });
      }
    } catch (caught) {
      console.error("[components/job-details/ResearchButton]", caught);
      setStatus({ kind: "error", message: "Could not research this company." });
    } finally {
      inFlight.current = false;
      setIsResearching(false);
      // Unconditional: revalidatePath() in the route invalidates the cache but
      // does not re-render a page that is already open, and the dossier this
      // run just saved is rendered by the card this button sits in.
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        type="button"
        variant="default"
        size="cta"
        disabled={isResearching}
        onClick={handleClick}
      >
        <Search data-icon="inline-start" />
        {isResearching
          ? "Researching…"
          : hasResearch
            ? "Research Again"
            : "Research Company"}
      </Button>

      {isResearching ? (
        <p role="status" className="text-xs leading-4 text-text-muted">
          Takes a minute or two.
        </p>
      ) : status ? (
        <p
          role="status"
          className={cn(
            "flex max-w-xs items-start justify-end gap-1.5 text-right text-xs leading-4",
            status.kind === "error" ? "text-error" : "text-text-secondary",
          )}
        >
          {status.kind === "error" ? (
            <AlertCircle aria-hidden className="mt-0.5 size-3 shrink-0" />
          ) : null}
          {status.message}
        </p>
      ) : null}
    </div>
  );
}
