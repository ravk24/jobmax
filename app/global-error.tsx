"use client";

import { useEffect } from "react";
import { Inter } from "next/font/google";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { captureError } from "@/lib/posthog-client";
import "./globals.css";

// This boundary replaces the root layout's <html>, so the font variable has to
// be re-declared here — nothing from layout.tsx applies once it renders.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    captureError(error);
  }, [error]);

  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background font-sans text-text-primary">
        <main className="flex flex-1 items-center justify-center px-6 py-10">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 text-center shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-accent-muted">
              <AlertCircle className="size-5 text-error" />
            </div>

            <h1 className="mt-4 text-2xl leading-tight font-bold tracking-tight text-text-primary">
              Something went wrong
            </h1>

            <p className="mt-3 text-sm leading-6 text-text-secondary">
              An unexpected error stopped this page from loading. The problem has
              been logged — try again, and it may resolve on its own.
            </p>

            {error.digest ? (
              <p className="mt-4 text-xs leading-4 text-text-muted">
                Reference: {error.digest}
              </p>
            ) : null}

            <div className="mt-6">
              <Button type="button" variant="cta" size="cta" onClick={reset}>
                Try again
              </Button>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
