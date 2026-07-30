"use client";

import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { captureEvent, resetUser } from "@/lib/posthog-client";

export function LogoutButton() {
  const handleSubmit = () => {
    // The form navigates immediately, so this cannot wait for the batch queue —
    // and resetUser() right after would otherwise race the flush.
    captureEvent({ name: "user_logged_out" }, { sendInstantly: true });
    resetUser();
  };

  return (
    // Native form POST preserves the redirect response from the logout route.
    <form action="/api/auth/logout" method="post" onSubmit={handleSubmit}>
      <Button type="submit" variant="outline" size="cta">
        <LogOut data-icon="inline-start" />
        Log out
      </Button>
    </form>
  );
}
