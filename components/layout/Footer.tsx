import Link from "next/link";

import { Logo } from "@/components/layout/Logo";

const FOOTER_LINKS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms & Condition", href: "/terms" },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-6 px-6 py-8 sm:flex-row">
        <Logo />

        <nav className="flex flex-wrap items-center justify-center gap-6">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm leading-5 font-medium text-text-secondary transition-colors hover:text-text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
