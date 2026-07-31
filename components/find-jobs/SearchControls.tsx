"use client";

import { useState, type FormEvent } from "react";
import { AlertCircle, Search, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type SearchStatus = { kind: "success" | "error"; message: string };

export function SearchControls() {
  const [jobTitle, setJobTitle] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<SearchStatus | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!jobTitle.trim() || !location.trim()) {
      setStatus({
        kind: "error",
        message: "Enter a job title and a location to search.",
      });
      return;
    }

    // Feature 10 replaces this with POST /api/agent/find and the real counts.
    // The copy is the design's placeholder until that route exists.
    setStatus({
      kind: "success",
      message: "Found 8 jobs and saved 4 strong matches.",
    });
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
            onChange={(event) => setLocation(event.target.value)}
          />
        </div>

        <Button
          type="submit"
          className="h-10 gap-2 px-4 sm:col-span-2 lg:col-span-1"
        >
          <Search className="size-4" />
          Find Jobs
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
