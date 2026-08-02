import type {
  Education,
  Profile,
  ProfileExtraction,
  ProfileInput,
  WorkExperience,
} from "@/types";

// architecture.md describes work_experience as "Array of up to 3 roles", and
// build-plan.md Feature 05 repeats it. jsonb cannot enforce this, so the form
// caps it and saveProfile re-checks it — a client-side cap is not a constraint.
export const MAX_WORK_EXPERIENCE = 3;

// The resume card advertises this limit, the upload route enforces it, and the
// browser checks it first for fast feedback. One number so the three cannot
// disagree.
export const MAX_RESUME_BYTES = 5 * 1024 * 1024;

// Three places address the same object: the upload route writes it, the signed
// URL reads it, and extraction downloads it. One definition so they cannot
// drift onto different keys.
export const RESUME_BUCKET = "resumes";

export function resumeObjectKey(userId: string): string {
  return `${userId}/resume.pdf`;
}

// The Degree select's options. Shared rather than private to ProfileForm
// because extraction constrains Gemini to this exact list: a degree string
// outside it leaves the Radix Select with no matching item, so the field
// renders blank while state holds the value — invisible, and saved anyway.
export const DEGREE_OPTIONS = [
  "High School",
  "Associate",
  "Bachelor's",
  "Master's",
  "PhD",
  "Other",
] as const;

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

// A role the user added but never filled in. "Add role" seeds a blank entry, so
// an array of these is not evidence of work history — without this, clicking
// Add role and then Extract is a silent no-op with nothing to explain it.
//
// Exported since Feature 08: generation filters blank roles out before they
// reach either the prompt or the page, so an empty card the user forgot about
// does not print as a nameless job.
export function hasRoleContent(role: WorkExperience): boolean {
  return (
    role.company.trim().length > 0 ||
    role.title.trim().length > 0 ||
    role.startDate.trim().length > 0 ||
    role.responsibilities.trim().length > 0
  );
}

function fillText(current: string | null, extracted: string | null): string | null {
  return isFilled(current) ? current : (extracted ?? current);
}

function fillTags(
  current: string[] | null,
  extracted: string[] | null,
): string[] | null {
  if (isFilled(current)) return current;
  return extracted && extracted.length > 0 ? extracted : current;
}

function hasEducationContent(education: Education): boolean {
  return (
    education.degree.trim().length > 0 ||
    education.field.trim().length > 0 ||
    education.institution.trim().length > 0 ||
    education.graduationYear > 0
  );
}

// Per key, not whole-object. education is four independent scalars sharing a
// jsonb column, not a list of entities — and setEducation backfills all four
// the moment the user touches one, so a whole-object test would see a filled
// object and refuse to fill three genuinely blank fields.
function mergeEducation(
  current: Education | null,
  extracted: Education | null,
): Education | null {
  // An extraction that found no education still arrives as a fully-formed
  // object of empty strings, because that is the shape the form needs. Merging
  // it would turn a null column into {"degree":"","field":"",...} and persist
  // that on the next save — a row that reads as "has education" everywhere
  // downstream while holding nothing.
  if (!extracted || !hasEducationContent(extracted)) return current;

  const base: Education = current ?? {
    degree: "",
    field: "",
    institution: "",
    graduationYear: 0,
  };

  return {
    degree: base.degree.trim().length > 0 ? base.degree : extracted.degree,
    field: base.field.trim().length > 0 ? base.field : extracted.field,
    institution:
      base.institution.trim().length > 0
        ? base.institution
        : extracted.institution,
    // Blank graduation year is 0, not null — blankProfile and setEducation seed
    // it as 0 and the input renders `graduationYear || ""`. So falsy means
    // empty here. That is the opposite of years_experience below, where 0 is a
    // deliberate answer the user typed.
    graduationYear: base.graduationYear
      ? base.graduationYear
      : extracted.graduationYear,
  };
}

// Extraction never overwrites what the user typed. Their own data outranks a
// model's reading, and the only undo in this UI is reloading the page, which is
// not discoverable.
//
// Written field by field rather than as a loop over keys: two of the rules
// below are asymmetric, and a generic loop applies the wrong one.
export function mergeExtraction(
  profile: Profile,
  extraction: ProfileExtraction,
): Profile {
  const roles = profile.work_experience ?? [];
  const extractedRoles = extraction.work_experience ?? [];

  return {
    ...profile,
    full_name: fillText(profile.full_name, extraction.full_name),
    phone: fillText(profile.phone, extraction.phone),
    location: fillText(profile.location, extraction.location),
    current_title: fillText(profile.current_title, extraction.current_title),
    linkedin_url: fillText(profile.linkedin_url, extraction.linkedin_url),
    portfolio_url: fillText(profile.portfolio_url, extraction.portfolio_url),
    experience_level: profile.experience_level ?? extraction.experience_level,
    // isFilled(0) is true, and that is correct — "0 years" is an answer, not a
    // blank. Compare with graduationYear above.
    years_experience: isFilled(profile.years_experience)
      ? profile.years_experience
      : extraction.years_experience,
    // All or nothing. Merging into a curated list means guessing at dedupe and
    // casing, and a user who listed three skills should not silently gain forty.
    skills: fillTags(profile.skills, extraction.skills),
    industries: fillTags(profile.industries, extraction.industries),
    // All or nothing at the array level. Per-role merge would need fuzzy
    // matching on company and title, and appending can overflow
    // MAX_WORK_EXPERIENCE — which surfaces later as a save rejection about
    // roles the user never entered.
    //
    // Both sides are tested for content. An extraction that found no work
    // history still arrives as an array, so replacing unconditionally would
    // delete the blank card of someone who pressed Add role and then Extract —
    // their row vanishing with nothing to explain it.
    work_experience:
      !roles.some(hasRoleContent) && extractedRoles.some(hasRoleContent)
        ? extractedRoles
        : profile.work_experience,
    education: mergeEducation(profile.education, extraction.education),
  };
}

// Gemini returned well-formed JSON that says nothing — an image-only PDF, or a
// document that is not a resume. Checked after normalisation, so a response
// whose only content was three unparseable dates reads as empty here.
export function isExtractionEmpty(extraction: ProfileExtraction): boolean {
  const education = extraction.education;

  return !(
    isFilled(extraction.full_name) ||
    isFilled(extraction.phone) ||
    isFilled(extraction.location) ||
    isFilled(extraction.current_title) ||
    isFilled(extraction.linkedin_url) ||
    isFilled(extraction.portfolio_url) ||
    isFilled(extraction.experience_level) ||
    // Deliberately > 0 rather than isFilled, unlike the merge rule above: a
    // lone 0 is what a model returns when it found nothing, not evidence that
    // it read the page.
    (extraction.years_experience ?? 0) > 0 ||
    isFilled(extraction.skills) ||
    isFilled(extraction.industries) ||
    (extraction.work_experience ?? []).some(hasRoleContent) ||
    (education !== null && hasEducationContent(education))
  );
}

// The floor for generating a resume PDF, and deliberately looser than
// calculateCompletion(). A resume needs a name at the top and something to put
// under it; someone with a name and a skills list has a document worth
// producing even while the completion banner still shows four gaps. Tying
// generation to is_complete would refuse a perfectly usable partial profile.
//
// Checked server-side before the model call: generating from nothing spends a
// rate-limited free-tier request to produce an empty page, and then overwrites
// the resume the user already had with it.
export function canGenerateResume(profile: Profile): boolean {
  if (!isFilled(profile.full_name)) return false;

  return (
    (profile.work_experience ?? []).some(hasRoleContent) ||
    (profile.skills ?? []).length > 0
  );
}

// The floor for scoring jobs against a profile, and looser again than
// canGenerateResume(): a resume needs a name to print at the top, a match score
// does not. What it needs is something to match against.
//
// Checked server-side before the Adzuna call, so an empty profile costs neither
// a search nor a rate-limited model request to produce ten scores derived from
// nothing — which would look like real numbers on the page.
export function canScoreJobs(profile: Profile): boolean {
  return (
    (profile.skills ?? []).length > 0 ||
    (profile.work_experience ?? []).some(hasRoleContent) ||
    isFilled(profile.current_title)
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
