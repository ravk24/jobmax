"use client";

import { useState } from "react";

import { ProfileForm } from "@/components/profile/ProfileForm";
import { ResumeUpload } from "@/components/profile/ResumeUpload";
import type { Profile, ProfileExtraction } from "@/types";

type Props = {
  profile: Profile;
  resumeUrl: string | null;
};

// The resume card and the form are siblings that need to talk exactly once: an
// extraction read from the PDF has to reach the fields. This holds that one
// value and nothing else.
//
// It deliberately does not own the profile itself. Lifting that would make
// ProfileForm controlled — every setter becomes a prop callback, and the two
// raw-text mirrors it keeps for the comma-separated inputs would either move up
// here, where nothing else knows about comma parsing, or stay behind and go
// stale, which is the bug those mirrors were added to fix.
export function ProfileEditor({ profile, resumeUrl }: Props) {
  const [extraction, setExtraction] = useState<ProfileExtraction | null>(null);

  return (
    // A fragment, not a wrapper element. The page stacks its sections with
    // `flex flex-col gap-6`; an element here would make the resume card and the
    // form one flex child and silently swallow the 24px between them.
    <>
      <ResumeUpload resumeUrl={resumeUrl} onExtracted={setExtraction} />
      <ProfileForm profile={profile} extraction={extraction} />
    </>
  );
}
