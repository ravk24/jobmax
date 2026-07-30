"use server";

import { revalidatePath } from "next/cache";

import { createInsforgeServer, getCurrentUser } from "@/lib/insforge-server";
import { createPostHogServer } from "@/lib/posthog-server";
import { blankProfile, calculateCompletion } from "@/lib/profile";
import {
  describeValidationIssue,
  profileInputSchema,
} from "@/lib/profile-schema";
import type { Profile, ProfileInput } from "@/types";

type SaveResult = { success: boolean; error?: string };

// Fired once, on the save that first completes a profile. Analytics must never
// fail the write it is measuring, so this swallows its own errors — including
// the throw from createPostHogServer() when the key is unset.
async function captureProfileCompleted(userId: string): Promise<void> {
  try {
    const posthog = createPostHogServer();
    posthog.capture({
      distinctId: userId,
      event: "profile_completed",
      properties: { userId },
    });
    await posthog.shutdown();
  } catch (error) {
    console.error("[actions/profile]", error);
  }
}

export async function saveProfile(input: ProfileInput): Promise<SaveResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "You are not signed in." };
    }

    const result = profileInputSchema.safeParse(input);
    if (!result.success) {
      console.error("[actions/profile]", result.error.issues);
      return {
        success: false,
        error: describeValidationIssue(result.error.issues),
      };
    }

    const parsed: ProfileInput = result.data;
    const profile: Profile = { ...blankProfile(user), ...parsed };
    const isComplete = calculateCompletion(profile).missingFields.length === 0;

    const insforge = await createInsforgeServer();

    const { data: existing, error: readError } = await insforge.database
      .from("profiles")
      .select("is_complete")
      .eq("id", user.id)
      .maybeSingle();

    if (readError) {
      console.error("[actions/profile]", readError.message);
      return { success: false, error: "Could not save your profile." };
    }

    // resume_pdf_url is deliberately absent: PostgREST's merge-duplicates only
    // writes the columns present in the payload, so the upload route's write
    // survives every form save. email always comes from the session, never the
    // client. updated_at belongs to the profiles_set_updated_at trigger.
    const { error: writeError } = await insforge.database
      .from("profiles")
      .upsert(
        { id: user.id, email: user.email, ...parsed, is_complete: isComplete },
        { onConflict: "id" },
      );

    if (writeError) {
      console.error("[actions/profile]", writeError.message);
      return { success: false, error: "Could not save your profile." };
    }

    if (isComplete && existing?.is_complete !== true) {
      await captureProfileCompleted(user.id);
    }

    revalidatePath("/profile");

    return { success: true };
  } catch (error) {
    console.error("[actions/profile]", error);
    return { success: false, error: "Could not save your profile." };
  }
}
