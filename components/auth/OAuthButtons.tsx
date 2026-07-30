"use client";

import { Button } from "@/components/ui/button";
import type { OAuthProvider } from "@/lib/auth";
import { captureEvent } from "@/lib/posthog-client";

// lucide-react v1 dropped brand marks, so the provider logos are inlined here.
// Both use currentColor so they inherit the button's token-driven text colour.
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.35 11.1h-9.18v2.96h5.27c-.23 1.37-1.6 4.02-5.27 4.02-3.17 0-5.76-2.63-5.76-5.87s2.59-5.87 5.76-5.87c1.8 0 3.01.77 3.7 1.43l2.52-2.43C16.78 3.76 14.66 2.8 12.17 2.8 6.98 2.8 2.8 6.98 2.8 12.17s4.18 9.37 9.37 9.37c5.41 0 8.99-3.8 8.99-9.16 0-.62-.07-1.09-.16-1.55z" />
    </svg>
  );
}

function GithubMark() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.49l-.01-1.9c-2.78.62-3.37-1.23-3.37-1.23-.46-1.19-1.11-1.5-1.11-1.5-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.57 2.34 1.12 2.91.85.09-.66.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05a9.3 9.3 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.35 4.8-4.58 5.05.36.32.68.94.68 1.9l-.01 2.82c0 .27.18.6.69.49A10.05 10.05 0 0 0 22 12.23C22 6.58 17.52 2 12 2z" />
    </svg>
  );
}

export function OAuthButtons() {
  const handleOAuthStart = (provider: OAuthProvider) => {
    captureEvent({ name: "oauth_sign_in_started", properties: { provider } });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Plain anchors, not next/link: these hit route handlers that redirect
          out to the OAuth provider, which client-side navigation cannot follow. */}
      {/* eslint-disable @next/next/no-html-link-for-pages */}
      <Button asChild variant="outline" size="cta" className="w-full">
        <a href="/api/auth/google" onClick={() => handleOAuthStart("google")}>
          <GoogleMark />
          Continue with Google
        </a>
      </Button>

      <Button asChild variant="outline" size="cta" className="w-full">
        <a href="/api/auth/github" onClick={() => handleOAuthStart("github")}>
          <GithubMark />
          Continue with GitHub
        </a>
      </Button>
      {/* eslint-enable @next/next/no-html-link-for-pages */}
    </div>
  );
}
