import { AlertCircle } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

type Props = {
  missingFields: string[];
};

export function IncompleteProfileBanner({ missingFields }: Props) {
  if (missingFields.length === 0) {
    return null;
  }

  const count = missingFields.length;

  return (
    <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-surface p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
      {/* The project's failure medallion: accent-muted circle, error icon. */}
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-muted">
        <AlertCircle className="size-5 text-error" aria-hidden />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm leading-5 font-semibold text-text-primary">
          Your profile is incomplete
        </span>
        <span className="mt-0.5 block text-sm leading-5 text-text-secondary">
          {count === 1 ? "1 required field is" : `${count} required fields are`}{" "}
          still empty — job matching and company research work from your
          profile.
        </span>
      </span>

      <Button asChild variant="outline" size="cta">
        <Link href="/profile">Complete profile</Link>
      </Button>
    </section>
  );
}
