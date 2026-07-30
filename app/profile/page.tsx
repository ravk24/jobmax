import { redirect } from "next/navigation";

import { AppNavbar } from "@/components/layout/AppNavbar";
import { CompletionIndicator } from "@/components/profile/CompletionIndicator";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { ProfileLoadError } from "@/components/profile/ProfileLoadError";
import { ResumeUpload } from "@/components/profile/ResumeUpload";
import { LOGIN_ROUTE } from "@/lib/auth";
import {
  getCurrentUser,
  getResumeSignedUrl,
  readProfile,
} from "@/lib/insforge-server";
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

  // Only minted when there is something to link to — no round trip otherwise.
  const resumeHref = profile.resume_pdf_url
    ? await getResumeSignedUrl(user.id)
    : null;

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
          <ResumeUpload
            resumeUrl={profile.resume_pdf_url}
            resumeHref={resumeHref}
          />
          <ProfileForm profile={profile} />
        </div>
      </main>
    </>
  );
}
