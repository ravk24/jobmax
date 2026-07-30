"use client";

import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

// Shown instead of the form when the profile cannot be read. Never alongside
// it: an empty form here would invite the user to save blanks over a profile
// that exists and is merely unreachable.
export function ProfileLoadError() {
  const router = useRouter();

  return (
    <section className="flex flex-col items-center rounded-2xl border border-border bg-surface px-6 py-12 text-center shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
      {/* Matches app/global-error.tsx exactly — the project's failure-state
          medallion is an accent-muted circle with the error colour in the icon,
          not an error-tinted circle. */}
      <span className="flex size-10 items-center justify-center rounded-full bg-accent-muted">
        <AlertCircle className="size-5 text-error" />
      </span>

      <h2 className="mt-4 text-base leading-6 font-semibold text-text-primary">
        We could not load your profile
      </h2>
      <p className="mt-1 max-w-md text-sm leading-5 text-text-secondary">
        Your details are safe — we just could not reach them right now. Nothing
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
