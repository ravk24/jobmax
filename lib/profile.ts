import type { Profile } from "@/types";

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
