"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleUser, LayoutGrid, Search, User } from "lucide-react";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { Logo } from "@/components/layout/Logo";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  { label: "Find Jobs", href: "/find-jobs", icon: Search },
  { label: "Profile", href: "/profile", icon: User },
];

export function AppNavbar() {
  const pathname = usePathname();

  return (
    <header className="w-full border-b border-border bg-surface">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-6">
        <Logo href="/dashboard" />

        <nav className="flex items-center gap-2 sm:gap-8">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                // The underline sits on the header's bottom border, so it needs
                // the full 64px height rather than a border on the text alone.
                className={cn(
                  "flex h-16 items-center gap-2 border-b-2 px-1 text-sm leading-5 font-medium transition-colors",
                  isActive
                    ? "border-accent text-accent"
                    : "border-transparent text-text-dark hover:text-accent",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}

          {/* Decorative, matching the design mock — there is no account menu in
              this project, and the three links above are the whole navigation. */}
          <CircleUser className="size-6 shrink-0 text-text-secondary" aria-hidden />

          <LogoutButton />
        </nav>
      </div>
    </header>
  );
}
