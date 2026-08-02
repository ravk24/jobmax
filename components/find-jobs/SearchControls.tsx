"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Search, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type SearchStatus = { kind: "success" | "error"; message: string };

type SearchData = {
  found: number;
  saved: number;
  strong: number;
  scored: boolean;
};

type FindResponse = {
  success: boolean;
  data?: SearchData;
  error?: string;
};

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

// The design's sentence is the ordinary case. The other three exist because
// each is a genuinely different outcome the user needs to tell apart: nothing
// came back, nothing was new, or the jobs arrived without scores.
function describeSearch(data: SearchData): SearchStatus {
  if (data.found === 0) {
    return {
      kind: "error",
      message:
        "No jobs found for that search. Try a different title, or leave the location blank.",
    };
  }

  if (data.saved === 0) {
    return {
      kind: "success",
      message: `No new jobs — all ${plural(data.found, "result is", "results are")} already in your list.`,
    };
  }

  if (!data.scored) {
    return {
      kind: "success",
      message: `Saved ${plural(data.saved, "job", "jobs")}, but scoring is busy right now — they are unscored. Try again in a moment.`,
    };
  }

  const matches = plural(data.strong, "strong match", "strong matches");

  return {
    kind: "success",
    message:
      data.saved < data.found
        ? `Found ${plural(data.found, "job", "jobs")}, ${data.saved} new — ${matches}.`
        : `Found ${plural(data.found, "job", "jobs")} and saved ${matches}.`,
  };
}

export function SearchControls() {
  const router = useRouter();
  const [jobTitle, setJobTitle] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<SearchStatus | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Location is optional: Adzuna must never be sent an empty `where`, so a
    // blank one becomes a country-wide search rather than a refusal.
    if (!jobTitle.trim()) {
      setStatus({
        kind: "error",
        message: "Enter a job title to search.",
      });
      return;
    }

    setStatus(null);
    setIsSearching(true);

    try {
      const response = await fetch("/api/agent/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: jobTitle.trim(),
          location: location.trim(),
        }),
      });

      const result: FindResponse = await response.json();

      // Never trusts the status alone: a 200 carrying success: false, or a
      // success with no payload, is still a failure to report.
      if (!response.ok || !result.success || !result.data) {
        setStatus({
          kind: "error",
          message: result.error ?? "Could not search for jobs.",
        });
        return;
      }

      setStatus(describeSearch(result.data));
    } catch (caught) {
      console.error("[components/find-jobs/SearchControls]", caught);
      setStatus({ kind: "error", message: "Could not search for jobs." });
    } finally {
      setIsSearching(false);
      // Unconditional: revalidatePath() in the route invalidates the cache but
      // does not re-render a page that is already open, and the jobs the search
      // just saved are rendered by the table below this card.
      router.refresh();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-2xl border border-border bg-surface p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <div>
          <Label htmlFor="search-job-title" className="field-label">
            Job title
          </Label>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted" />
            <Input
              id="search-job-title"
              className="pl-9"
              value={jobTitle}
              placeholder="Frontend Engineer"
              disabled={isSearching}
              onChange={(event) => setJobTitle(event.target.value)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="search-location" className="field-label">
            Location
          </Label>
          <Input
            id="search-location"
            className="mt-2"
            value={location}
            placeholder="Remote, New York..."
            disabled={isSearching}
            onChange={(event) => setLocation(event.target.value)}
          />
        </div>

        <Button
          type="submit"
          disabled={isSearching}
          className="h-10 gap-2 px-4 sm:col-span-2 lg:col-span-1"
        >
          <Search className="size-4" />
          {isSearching ? "Searching…" : "Find Jobs"}
        </Button>
      </div>

      {status ? (
        <p
          role="status"
          className={cn(
            "mt-4 flex items-center gap-2 rounded-md px-4 py-3 text-sm leading-5",
            status.kind === "success"
              ? "bg-success-lightest text-success-dark"
              : "bg-accent-muted text-text-dark",
          )}
        >
          {status.kind === "success" ? (
            <Sparkles className="size-4 shrink-0" />
          ) : (
            <AlertCircle className="size-4 shrink-0 text-error" />
          )}
          {status.message}
        </p>
      ) : null}
    </form>
  );
}
