import Link from "next/link";
import { SearchX } from "lucide-react";

import { AppNavbar } from "@/components/layout/AppNavbar";
import { Button } from "@/components/ui/button";

// Reached when the id matches no job the signed-in user owns — a deleted job, a
// stale link, a mistyped url, or another user's job, which RLS makes
// indistinguishable and which is the correct answer for all four. A failed read
// is a different page: JobLoadError.
export default function JobNotFound() {
  return (
    <>
      <AppNavbar />

      <main className="flex-1 bg-background px-6 py-8">
        <div className="mx-auto max-w-[940px]">
          <section className="flex flex-col items-center rounded-2xl border border-border bg-surface px-6 py-12 text-center shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <span className="flex size-10 items-center justify-center rounded-full bg-accent-muted">
              <SearchX className="size-5 text-accent" />
            </span>

            <h1 className="mt-4 text-base leading-6 font-semibold text-text-primary">
              We could not find that job
            </h1>
            <p className="mt-1 max-w-md text-sm leading-5 text-text-muted">
              This job is not in your list. It may have been removed, or the link
              may be out of date.
            </p>

            <Button asChild variant="outline" size="cta" className="mt-5">
              <Link href="/find-jobs">Back to Jobs</Link>
            </Button>
          </section>
        </div>
      </main>
    </>
  );
}
