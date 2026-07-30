import { cookies } from "next/headers";
import { createServerClient } from "@insforge/sdk/ssr";

import { getInsforgeUrl } from "@/lib/auth";

export async function createInsforgeServer() {
  const cookieStore = await cookies();
  return createServerClient({
    baseUrl: getInsforgeUrl(),
    cookies: cookieStore,
  });
}

export async function getCurrentUser() {
  const insforge = await createInsforgeServer();
  const { data, error } = await insforge.auth.getCurrentUser();
  if (error) {
    console.error("[lib/insforge-server]", error.message);
    return null;
  }
  return data.user;
}
