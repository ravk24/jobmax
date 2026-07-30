import { cookies } from "next/headers";
import { createServerClient } from "@insforge/sdk/ssr";

import { getInsforgeUrl } from "@/lib/auth";
import { parseProfileRow } from "@/lib/profile-schema";
import type { Profile } from "@/types";

// Minted fresh on every /profile render, so it only has to outlive the visit
// rather than the session.
const RESUME_LINK_TTL_SECONDS = 60 * 60;

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

// The resumes bucket is private, so resume_pdf_url cannot be opened in a tab —
// the browser holds no InsForge credentials, by design: client_type=server keeps
// the session on our own origin. A signed URL is credential-free and carries its
// own authorisation, minted only for a caller allowed to read the object.
export async function getResumeSignedUrl(
  userId: string,
): Promise<string | null> {
  const insforge = await createInsforgeServer();
  const { data, error } = await insforge.storage
    .from("resumes")
    .createSignedUrl(`${userId}/resume.pdf`, RESUME_LINK_TTL_SECONDS);

  if (error || !data) {
    console.error("[lib/insforge-server]", error?.message);
    return null;
  }

  return data.signedUrl;
}

// "No row yet" and "the read failed" must never collapse into one answer. They
// look identical to a caller returning null, and the caller's natural response
// — render an empty form — turns a transient database blip into silent data
// loss the moment the user hits Save over their own profile.
export type ProfileReadResult =
  | { status: "found"; profile: Profile }
  | { status: "empty" }
  | { status: "error" };

// maybeSingle() rather than single(): a user with no row yet is the ordinary
// first-visit case, not an error. The query builder hangs off .database — not
// off the client itself.
//
// from() is typed PostgrestQueryBuilder<any, …>, so the row arrives as `any`.
// Annotating the return type would be an unchecked cast over data the database
// does not constrain — the jsonb columns in particular, whose shape changed in
// Feature 05. parseProfileRow validates and repairs instead.
export async function readProfile(user: {
  id: string;
  email: string;
}): Promise<ProfileReadResult> {
  const insforge = await createInsforgeServer();
  const { data, error } = await insforge.database
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[lib/insforge-server]", error.message);
    return { status: "error" };
  }

  if (!data) return { status: "empty" };

  const profile = parseProfileRow(data, user);

  // A row exists but could not be read as a profile. Treated as an error, not
  // as an empty profile, for the same reason.
  return profile ? { status: "found", profile } : { status: "error" };
}
