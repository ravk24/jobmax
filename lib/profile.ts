import type { Profile, ProfileInput } from "@/types";

// architecture.md describes work_experience as "Array of up to 3 roles", and
// build-plan.md Feature 05 repeats it. jsonb cannot enforce this, so the form
// caps it and saveProfile re-checks it — a client-side cap is not a constraint.
export const MAX_WORK_EXPERIENCE = 3;

// The resume card advertises this limit, the upload route enforces it, and the
// browser checks it first for fast feedback. One number so the three cannot
// disagree.
export const MAX_RESUME_BYTES = 5 * 1024 * 1024;

// Completion is derived, never stored. `profiles` deliberately has no column for
// the percentage or the missing-field list: everything needed to compute them is
// already in the row, and a stored percentage goes stale the moment a field
// changes. This list is the single source of truth for what "complete" means.
const REQUIRED_FIELDS = [
  { key: "full_name", label: "Full name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "location", label: "Location" },
  { key: "current_title", label: "Current title" },
  { key: "experience_level", label: "Experience level" },
  { key: "years_experience", label: "Years experience" },
  { key: "skills", label: "Skills" },
  { key: "work_experience", label: "Work experience" },
  { key: "education", label: "Education" },
] as const satisfies ReadonlyArray<{ key: keyof Profile; label: string }>;

export type CompletionResult = {
  percentage: number;
  missingFields: string[];
};

function isFilled(value: Profile[keyof Profile]): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

// Education needs more than a degree to be useful for matching — a record with
// no institution is not a complete entry, so it still counts as missing.
function isEducationComplete(profile: Profile): boolean {
  const education = profile.education;
  if (!education) return false;
  return (
    education.degree.trim().length > 0 &&
    education.institution.trim().length > 0
  );
}

// A signed-in user with no profiles row yet — the state every user is in until
// their first save. The row does not exist, so the timestamps describe this
// unsaved draft rather than anything in the database; nothing renders them.
export function blankProfile(user: {
  id: string;
  email: string;
}): Profile {
  const now = new Date().toISOString();

  return {
    id: user.id,
    full_name: null,
    email: user.email,
    phone: null,
    location: null,
    current_title: null,
    experience_level: null,
    years_experience: null,
    skills: [],
    industries: [],
    work_experience: [],
    education: null,
    job_titles_seeking: [],
    remote_preference: null,
    preferred_locations: [],
    salary_expectation: null,
    cover_letter_tone: null,
    linkedin_url: null,
    portfolio_url: null,
    work_authorization: null,
    resume_pdf_url: null,
    is_complete: false,
    created_at: now,
    updated_at: now,
  };
}

// The form holds a whole Profile; saveProfile accepts only the editable subset.
// Listing the keys explicitly rather than deleting the others means a new
// column is a compile error here until someone decides who owns it.
export function toProfileInput(profile: Profile): ProfileInput {
  return {
    full_name: profile.full_name,
    phone: profile.phone,
    location: profile.location,
    current_title: profile.current_title,
    experience_level: profile.experience_level,
    years_experience: profile.years_experience,
    skills: profile.skills,
    industries: profile.industries,
    work_experience: profile.work_experience,
    education: profile.education,
    job_titles_seeking: profile.job_titles_seeking,
    remote_preference: profile.remote_preference,
    preferred_locations: profile.preferred_locations,
    salary_expectation: profile.salary_expectation,
    linkedin_url: profile.linkedin_url,
    portfolio_url: profile.portfolio_url,
    work_authorization: profile.work_authorization,
  };
}

export function calculateCompletion(profile: Profile): CompletionResult {
  const missing = REQUIRED_FIELDS.filter((field) =>
    field.key === "education"
      ? !isEducationComplete(profile)
      : !isFilled(profile[field.key]),
  );

  const filledCount = REQUIRED_FIELDS.length - missing.length;

  return {
    percentage: Math.round((filledCount / REQUIRED_FIELDS.length) * 100),
    missingFields: missing.map((field) => field.label),
  };
}
