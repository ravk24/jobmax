"use client";

import { useEffect } from "react";

import { identifyUser } from "@/lib/posthog-client";

type Props = {
  userId: string;
  email?: string;
  name?: string;
};

export function PostHogIdentity({ userId, email, name }: Props) {
  useEffect(() => {
    identifyUser(userId, {
      ...(email ? { email } : {}),
      ...(name ? { name } : {}),
    });
  }, [userId, email, name]);

  return null;
}
