import { redirect } from "next/navigation";

import { AppNavbar } from "@/components/layout/AppNavbar";
import { CompletionIndicator } from "@/components/profile/CompletionIndicator";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { ProfileLoadError } from "@/components/profile/ProfileLoadError";
import { LOGIN_ROUTE } from "@/lib/auth";
import { getCurrentUser, readProfile } from "@/lib/insforge-server";
import { blankProfile, calculateCompletion } from "@/lib/profile";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect(LOGIN_ROUTE);
  }

  const result = await readProfile(user);

  if (result.status === "error") {
    return (
      <>
        <AppNavbar />
        <main className="flex-1 bg-background px-6 py-8">
          <div className="mx-auto max-w-[940px]">
            <ProfileLoadError />
          </div>
        </main>
      </>
    );
  }

  // No row until the first save, which is where every user starts — Feature 02
  // deliberately writes none at sign-in.
  const profile =
    result.status === "found" ? result.profile : blankProfile(user);

  const { percentage, missingFields } = calculateCompletion(profile);

  return (
    <>
      <AppNavbar />

      <main className="flex-1 bg-background px-6 py-8">
        <div className="mx-auto flex max-w-[940px] flex-col gap-6">
          <CompletionIndicator
            percentage={percentage}
            missingFields={missingFields}
          />
          {/* CompletionIndicator stays out here: it is presentational and has
              no part in extraction, so it should not join the client bundle. */}
          <ProfileEditor profile={profile} resumeUrl={profile.resume_pdf_url} />
        </div>
      </main>
    </>
  );
}
