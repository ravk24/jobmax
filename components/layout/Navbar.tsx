import Link from "next/link";

import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Find Jobs", href: "/find-jobs" },
  { label: "Profile", href: "/profile" },
];

type Props = {
  ctaHref: string;
  ctaLabel: string;
};

export function Navbar({ ctaHref, ctaLabel }: Props) {
  return (
    <header className="w-full border-b border-border bg-surface">
      <div className="mx-auto grid h-16 max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center px-6">
        <Logo />

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm leading-5 font-medium text-text-dark transition-colors hover:text-accent"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex justify-end">
          <Button asChild variant="cta" size="cta">
            <Link href={ctaHref}>{ctaLabel}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
