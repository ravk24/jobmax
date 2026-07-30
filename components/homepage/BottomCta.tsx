import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  ctaHref: string;
};

export function BottomCta({ ctaHref }: Props) {
  return (
    <section className="aurora border-b border-border">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center px-6 py-20 text-center sm:py-24">
        <h2 className="max-w-2xl text-2xl leading-tight font-bold tracking-tight text-text-primary sm:text-4xl sm:leading-[1.2]">
          Your next job search can feel a lot less overwhelming
        </h2>

        <p className="mt-6 max-w-xl text-sm leading-6 text-text-dark">
          Set up your profile, upload your resume, and start finding matches in
          minutes.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="cta" size="cta">
            <Link href={ctaHref}>
              Get Started
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="cta">
            <Link href="/find-jobs">Find Your First Match</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
