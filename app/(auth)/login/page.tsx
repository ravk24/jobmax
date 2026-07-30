import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, ShieldCheck } from "lucide-react";

import { LoginPageTracker } from "@/components/analytics/LoginPageTracker";
import { AuthHighlights } from "@/components/auth/AuthHighlights";
import { AuthShowcase } from "@/components/auth/AuthShowcase";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { Logo } from "@/components/layout/Logo";
import { POST_LOGIN_ROUTE } from "@/lib/auth";
import { getCurrentUser } from "@/lib/insforge-server";

const ERROR_MESSAGES: Record<string, string> = {
  unsupported_provider: "That sign-in method isn’t available.",
  oauth_start_failed: "We couldn’t start sign-in. Please try again.",
  oauth_denied: "Sign-in was cancelled.",
  session_expired: "That sign-in attempt expired. Please try again.",
  oauth_exchange_failed: "We couldn’t complete sign-in. Please try again.",
};

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (user) {
    redirect(POST_LOGIN_ROUTE);
  }

  const { error } = await searchParams;
  const message = error ? ERROR_MESSAGES[error] : undefined;

  return (
    <main className="flex flex-1 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <LoginPageTracker error={error} />

      <div className="flex flex-1 flex-col bg-surface px-6 py-10 sm:px-10">
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col">
          <Logo />

          <div className="flex flex-1 items-center py-12">
            <div className="w-full">
              <p className="text-xs leading-4 font-semibold tracking-widest text-accent uppercase">
                Welcome back
              </p>

              <h1 className="mt-3 text-2xl leading-tight font-bold tracking-tight text-text-primary sm:text-3xl sm:leading-[1.2]">
                Sign in to JobMax
              </h1>

              <p className="mt-3 text-sm leading-6 text-text-secondary">
                Pick a provider to continue. New here? The same button creates
                your account.
              </p>

              {message ? (
                <p
                  role="alert"
                  className="mt-6 flex items-start gap-2 rounded-md bg-accent-muted px-3 py-2 text-xs leading-5 text-text-dark"
                >
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-error" />
                  {message}
                </p>
              ) : null}

              <div className="mt-8">
                <OAuthButtons />
              </div>

              <p className="mt-4 flex items-center gap-1.5 text-xs leading-5 text-text-muted">
                <ShieldCheck className="size-3.5 shrink-0" />
                Secure OAuth sign-in — no password to remember.
              </p>

              <div className="mt-10 border-t border-border pt-8 lg:hidden">
                <AuthHighlights />
              </div>
            </div>
          </div>

          <p className="text-xs leading-5 text-text-muted">
            By continuing you agree to our{" "}
            <Link
              href="/terms"
              className="text-text-secondary hover:text-accent"
            >
              Terms
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="text-text-secondary hover:text-accent"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>

      <AuthShowcase />
    </main>
  );
}
