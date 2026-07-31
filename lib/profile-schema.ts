import { z } from "zod";

import { MAX_WORK_EXPERIENCE } from "@/lib/profile";
import type { Profile, ProfileInput } from "@/types";

// Server-only. Kept out of lib/profile.ts so zod stays out of the client bundle
// — ProfileForm imports that module.
//
// Two postures, deliberately opposite:
//
// - Writes (profileInputSchema) are STRICT. Input arrives from a public POST
//   endpoint, and a bad enum would otherwise surface as an opaque CHECK
//   constraint error from Postgres.
// - Reads (profileRowSchema) are LENIENT and self-repairing. Every field
//   carries a .catch() fallback so one malformed column can never blank a whole
//   profile — a blank form would be silently overwritten on the next save.

// Text columns are unbounded in Postgres, so these are the only limits. Sized
// to be generous rather than tight: the point is to stop a megabyte of junk
// reaching the database, not to police how someone writes about their job.
//
// Exported because lib/resume-extraction.ts constrains Gemini with the same
// numbers. Duplicating them would drift, and the symptom of drift is a save
// rejected for being "too long" on a field the user never typed.
export const MAX_SHORT_TEXT = 500;
const MAX_RESPONSIBILITIES = 5000;
export const MAX_TAG = 100;
export const MAX_TAGS = 50;
export const MAX_YEARS_EXPERIENCE = 80;

export const FIELD_LABELS: Record<string, string> = {
  full_name: "Full name",
  phone: "Phone number",
  location: "Location",
  current_title: "Current job title",
  experience_level: "Experience level",
  years_experience: "Years of experience",
  skills: "Skills",
  industries: "Industries",
  work_experience: "Work experience",
  education: "Education",
  job_titles_seeking: "Job titles seeking",
  remote_preference: "Remote preference",
  preferred_locations: "Preferred locations",
  salary_expectation: "Salary expectation",
  linkedin_url: "LinkedIn URL",
  portfolio_url: "Portfolio / GitHub",
  work_authorization: "Work authorization",
  company: "company",
  title: "job title",
  startDate: "start date",
  endDate: "end date",
  responsibilities: "responsibilities",
  degree: "degree",
  field: "field of study",
  institution: "institution",
  graduationYear: "graduation year",
};

// --- Write path -------------------------------------------------------------

const nullableText = z
  .string()
  .trim()
  .max(MAX_SHORT_TEXT)
  .nullable()
  .transform((value) => (value && value.length > 0 ? value : null));

const tagList = z
  .array(z.string().trim().max(MAX_TAG))
  .max(MAX_TAGS)
  .nullable()
  .transform((values) => (values ?? []).filter((value) => value.length > 0));

const workExperienceInput = z.object({
  id: z.string().max(100),
  company: z.string().trim().max(MAX_SHORT_TEXT),
  title: z.string().trim().max(MAX_SHORT_TEXT),
  startDate: z.string().trim().max(20),
  endDate: z.string().trim().max(20).nullable(),
  isCurrent: z.boolean(),
  responsibilities: z.string().trim().max(MAX_RESPONSIBILITIES),
});

const educationInput = z.object({
  degree: z.string().trim().max(MAX_TAG),
  field: z.string().trim().max(MAX_SHORT_TEXT),
  institution: z.string().trim().max(MAX_SHORT_TEXT),
  graduationYear: z.number().int().min(0).max(9999),
});

export const profileInputSchema = z.object({
  full_name: nullableText,
  phone: nullableText,
  location: nullableText,
  current_title: nullableText,
  experience_level: z.enum(["junior", "mid", "senior", "lead"]).nullable(),
  years_experience: z
    .number()
    .int()
    .min(0)
    .max(MAX_YEARS_EXPERIENCE)
    .nullable(),
  skills: tagList,
  industries: tagList,
  // The form caps this too, but a client-side cap is not a constraint and jsonb
  // holds none of its own.
  work_experience: z
    .array(workExperienceInput)
    .max(MAX_WORK_EXPERIENCE)
    .nullable(),
  education: educationInput.nullable(),
  job_titles_seeking: tagList,
  remote_preference: z.enum(["remote", "onsite", "hybrid", "any"]).nullable(),
  preferred_locations: tagList,
  salary_expectation: nullableText,
  linkedin_url: nullableText,
  portfolio_url: nullableText,
  work_authorization: z
    .enum(["citizen", "permanent_resident", "visa_required"])
    .nullable(),
});

// "Some fields are not valid" tells someone nothing when the only way to hit it
// is a length cap they cannot see. Name the field and say what is wrong with it.
export function describeValidationIssue(issues: z.core.$ZodIssue[]): string {
  const issue = issues[0];
  if (!issue) return "Some fields are not valid.";

  const [head, ...rest] = issue.path;

  if (head === "work_experience" && rest.length === 0) {
    return `You can add at most ${MAX_WORK_EXPERIENCE} roles.`;
  }

  const leaf = issue.path.at(-1);
  const label =
    FIELD_LABELS[String(leaf)] ?? FIELD_LABELS[String(head)] ?? "A field";

  // Role 2's "company" reads as nonsense without saying which role it is.
  const scope =
    head === "work_experience" && typeof rest[0] === "number"
      ? `Role ${rest[0] + 1} ${label}`
      : head === "education" && rest.length > 0
        ? `Education ${label}`
        : label;

  switch (issue.code) {
    case "too_big":
      return `${scope} is too long.`;
    case "too_small":
      return `${scope} is too short.`;
    case "invalid_value":
      return `${scope} is not one of the allowed options.`;
    default:
      return `${scope} is not valid.`;
  }
}

// --- Read path --------------------------------------------------------------

const workExperienceRow = z.object({
  id: z.string().min(1).nullish(),
  company: z.string().nullish(),
  title: z.string().nullish(),
  startDate: z.string().nullish(),
  endDate: z.string().nullish(),
  isCurrent: z.boolean().nullish(),
  responsibilities: z.string().nullish(),
});

const profileRowSchema = z.object({
  id: z.string().catch(""),
  full_name: z.string().nullish().catch(null),
  email: z.string().catch(""),
  phone: z.string().nullish().catch(null),
  location: z.string().nullish().catch(null),
  current_title: z.string().nullish().catch(null),
  experience_level: z
    .enum(["junior", "mid", "senior", "lead"])
    .nullish()
    .catch(null),
  years_experience: z.number().nullish().catch(null),
  skills: z.array(z.string()).nullish().catch(null),
  industries: z.array(z.string()).nullish().catch(null),
  // Roles predating Feature 05 carry no id, and React keys plus every element
  // id in WorkExperienceCard derive from it. Backfilled positionally so the
  // value is stable across renders — crypto.randomUUID() here would differ on
  // every render and break hydration.
  work_experience: z
    .array(workExperienceRow)
    .nullish()
    .catch(null)
    .transform((roles) =>
      (roles ?? []).map((role, index) => ({
        id: role.id ?? `legacy-role-${index}`,
        company: role.company ?? "",
        title: role.title ?? "",
        startDate: role.startDate ?? "",
        endDate: role.endDate ?? null,
        isCurrent: role.isCurrent ?? false,
        responsibilities: role.responsibilities ?? "",
      })),
    ),
  education: z
    .object({
      degree: z.string().nullish(),
      field: z.string().nullish(),
      institution: z.string().nullish(),
      graduationYear: z.number().nullish(),
    })
    .nullish()
    .catch(null)
    .transform((value) =>
      value
        ? {
            degree: value.degree ?? "",
            field: value.field ?? "",
            institution: value.institution ?? "",
            graduationYear: value.graduationYear ?? 0,
          }
        : null,
    ),
  job_titles_seeking: z.array(z.string()).nullish().catch(null),
  remote_preference: z
    .enum(["remote", "onsite", "hybrid", "any"])
    .nullish()
    .catch(null),
  preferred_locations: z.array(z.string()).nullish().catch(null),
  salary_expectation: z.string().nullish().catch(null),
  cover_letter_tone: z
    .enum(["formal", "casual", "enthusiastic"])
    .nullish()
    .catch(null),
  linkedin_url: z.string().nullish().catch(null),
  portfolio_url: z.string().nullish().catch(null),
  work_authorization: z
    .enum(["citizen", "permanent_resident", "visa_required"])
    .nullish()
    .catch(null),
  resume_pdf_url: z.string().nullish().catch(null),
  is_complete: z.boolean().catch(false),
  created_at: z.string().catch(""),
  updated_at: z.string().catch(""),
});

// Every field has a .catch(), so this only fails when the row is not an object
// at all. id and email are overwritten from the session rather than trusted:
// they are the two values a blank fallback would corrupt on the next save.
export function parseProfileRow(
  data: unknown,
  user: { id: string; email: string },
): Profile | null {
  const result = profileRowSchema.safeParse(data);

  if (!result.success) {
    console.error("[lib/profile-schema]", result.error.issues);
    return null;
  }

  return {
    ...result.data,
    full_name: result.data.full_name ?? null,
    phone: result.data.phone ?? null,
    location: result.data.location ?? null,
    current_title: result.data.current_title ?? null,
    experience_level: result.data.experience_level ?? null,
    years_experience: result.data.years_experience ?? null,
    skills: result.data.skills ?? null,
    industries: result.data.industries ?? null,
    job_titles_seeking: result.data.job_titles_seeking ?? null,
    remote_preference: result.data.remote_preference ?? null,
    preferred_locations: result.data.preferred_locations ?? null,
    salary_expectation: result.data.salary_expectation ?? null,
    cover_letter_tone: result.data.cover_letter_tone ?? null,
    linkedin_url: result.data.linkedin_url ?? null,
    portfolio_url: result.data.portfolio_url ?? null,
    work_authorization: result.data.work_authorization ?? null,
    resume_pdf_url: result.data.resume_pdf_url ?? null,
    id: user.id,
    email: user.email,
  };
}

export type { ProfileInput };
