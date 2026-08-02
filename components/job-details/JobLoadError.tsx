"use client";

import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

// Shown when the read failed, never when the job simply does not exist — that
// case is notFound(). Collapsing the two would tell someone following a stale
// link that the system is broken, and someone hitting a real outage that their
// job is gone. Same failure treatment as ProfileLoadError and global-error.
export function JobLoadError() {
  const router = useRouter();

  return (
    <section className="flex flex-col items-center rounded-2xl border border-border bg-surface px-6 py-12 text-center shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
      <span className="flex size-10 items-center justify-center rounded-full bg-accent-muted">
        <AlertCircle className="size-5 text-error" />
      </span>

      <h2 className="mt-4 text-base leading-6 font-semibold text-text-primary">
        We could not load this job
      </h2>
      <p className="mt-1 max-w-md text-sm leading-5 text-text-secondary">
        The job is still saved — we just could not reach it right now. Nothing
        has been changed.
      </p>

      <div className="mt-5">
        <Button type="button" variant="outline" onClick={() => router.refresh()}>
          Try again
        </Button>
      </div>
    </section>
  );
}
