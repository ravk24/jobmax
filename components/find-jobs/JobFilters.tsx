"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  isJobSort,
  isMatchFilter,
  jobsHref,
  JOB_SORT_OPTIONS,
  MATCH_FILTER_OPTIONS,
  type JobQuery,
} from "@/lib/jobs";

const TEXT_DEBOUNCE_MS = 300;

type Props = {
  query: JobQuery;
};

// The query comes down from the page rather than from useSearchParams(): the
// server has already parsed and defaulted it, and reading it again in the
// client would put a second parser on the same params.
export function JobFilters({ query }: Props) {
  const router = useRouter();
  const [text, setText] = useState(query.q);

  useEffect(() => {
    // Compared trimmed, and navigated trimmed, because parseJobQuery() trims.
    // Sending the raw text instead makes "react " come back as "react", which
    // never equals the input's value — so the effect re-fires every 300ms
    // forever the moment a trailing space is typed.
    const trimmed = text.trim();
    if (trimmed === query.q) {
      return;
    }

    const timer = setTimeout(() => {
      // replace, not push — a debounced keystroke should not add a history
      // entry per character.
      router.replace(jobsHref({ ...query, q: trimmed, page: 1 }), {
        scroll: false,
      });
    }, TEXT_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [text, query, router]);

  // Every filter change returns to page 1. Narrowing the result set while deep
  // in a longer one otherwise lands on a page that no longer exists.
  function go(next: Partial<JobQuery>) {
    router.push(jobsHref({ ...query, ...next, page: 1 }), { scroll: false });
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-3 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted" />
        <Input
          aria-label="Filter by company or role"
          className="border-transparent bg-transparent pl-9"
          value={text}
          placeholder="Filter by company or role..."
          onChange={(event) => setText(event.target.value)}
        />
      </div>

      <span aria-hidden className="hidden h-6 w-px bg-border sm:block" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select
          value={query.match}
          onValueChange={(value) => {
            if (isMatchFilter(value)) {
              go({ match: value });
            }
          }}
        >
          <SelectTrigger
            aria-label="Filter by match score"
            className="w-full bg-surface sm:w-[160px]"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MATCH_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={query.sort}
          onValueChange={(value) => {
            if (isJobSort(value)) {
              go({ sort: value });
            }
          }}
        >
          <SelectTrigger
            aria-label="Sort jobs"
            className="w-full bg-surface sm:w-[160px]"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {JOB_SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
