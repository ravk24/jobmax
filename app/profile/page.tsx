import { redirect } from "next/navigation";

import { AppNavbar } from "@/components/layout/AppNavbar";
import { CompletionIndicator } from "@/components/profile/CompletionIndicator";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { ResumeUpload } from "@/components/profile/ResumeUpload";
import { LOGIN_ROUTE } from "@/lib/auth";
import { getCurrentUser } from "@/lib/insforge-server";
import { calculateCompletion } from "@/lib/profile";
import type { Profile } from "@/types";

// Feature 05 is UI only — build-plan.md specifies mock data and no save logic.
// Feature 06 replaces this with a real read and a Server Action. Typed as
// Profile so it cannot drift from db/schema.sql.
// phone, location and education are deliberately null: they are the three
// missing fields the design shows, and they produce the 70% in the banner.
const MOCK_PROFILE: Profile = {
  id: "00000000-0000-0000-0000-000000000000",
  full_name: "Faizan Ali",
  // Overwritten below with the signed-in user's address — see the note there.
  email: "",
  phone: null,
  location: null,
  current_title: "Frontend Engineer",
  experience_level: "junior",
  years_experience: 4,
  skills: ["React", "TypeScript", "Next.js", "Tailwind CSS"],
  industries: [],
  work_experience: [
    {
      id: "seed-role-vercel",
      company: "Vercel",
      title: "Frontend Engineer",
      startDate: "2022-01",
      endDate: null,
      isCurrent: true,
      responsibilities:
        "Built Next.js features and optimized web vitals. Led a team of 3 developers.",
    },
  ],
  // Partially filled, exactly as the design shows: degree and field present,
  // institution and year blank — so EDUCATION still reads as missing.
  education: {
    degree: "High School",
    field: "Computer Science",
    institution: "",
    graduationYear: 0,
  },
  job_titles_seeking: ["Frontend Engineer", "React Developer"],
  remote_preference: "any",
  preferred_locations: [],
  salary_expectation: null,
  cover_letter_tone: null,
  linkedin_url: "https://linkedin.com/in/faizan",
  portfolio_url: "https://github.com/jsmastery",
  work_authorization: "citizen",
  resume_pdf_url: null,
  is_complete: false,
  created_at: "2026-07-30T00:00:00.000Z",
  updated_at: "2026-07-30T00:00:00.000Z",
};

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect(LOGIN_ROUTE);
  }

  // The rest of the form is mock data until Feature 06, but email is the one
  // field that is already known and authoritative: it comes from the session
  // and is rendered disabled, so showing a fabricated address would be wrong.
  const profile: Profile = { ...MOCK_PROFILE, email: user.email };

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
          <ResumeUpload />
          <ProfileForm profile={profile} />
        </div>
      </main>
    </>
  );
}
