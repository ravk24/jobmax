// Row types for the InsForge database. Column names are snake_case because
// PostgREST returns columns verbatim; the jsonb payloads below are app-defined
// JSON and use camelCase. Keep that split — a row property that is camelCase is
// always reading inside a jsonb column, never a table column.
//
// These are authored from the same column list as db/schema.sql. Change one and
// change the other in the same commit.

export type ExperienceLevel = "junior" | "mid" | "senior" | "lead";
export type RemotePreference = "remote" | "onsite" | "hybrid" | "any";
export type CoverLetterTone = "formal" | "casual" | "enthusiastic";
export type WorkAuthorization =
  | "citizen"
  | "permanent_resident"
  | "visa_required";

export type JobSource = "search" | "url";
export type JobType = "fulltime" | "parttime" | "contract";
export type AgentRunStatus = "running" | "completed" | "failed";
export type AgentLogLevel = "info" | "success" | "warning" | "error";

// profiles.work_experience — capped at MAX_WORK_EXPERIENCE by the form, not by
// the database (jsonb holds no constraint).
export type WorkExperience = {
  // Stable identity for React keys and form element ids. jsonb array members
  // have no primary key, and array index is not stable across removals.
  id: string;
  company: string;
  title: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  responsibilities: string;
};

// profiles.education
export type Education = {
  degree: string;
  field: string;
  institution: string;
  graduationYear: number;
};

// jobs.company_research — the dossier shape from build-plan.md Feature 13.
// Always fully populated: if browser research fails, Gemini synthesises from
// the job posting and profile alone rather than returning empty.
export type CompanyResearch = {
  companyOverview: string;
  techStack: string[];
  culture: string[];
  whyThisRole: string;
  yourEdge: string[];
  gapsToAddress: string[];
  smartQuestions: string[];
  interviewPrep: string[];
  sources: string[];
};

export type Profile = {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  location: string | null;
  current_title: string | null;
  experience_level: ExperienceLevel | null;
  years_experience: number | null;
  skills: string[] | null;
  industries: string[] | null;
  work_experience: WorkExperience[] | null;
  education: Education | null;
  job_titles_seeking: string[] | null;
  remote_preference: RemotePreference | null;
  preferred_locations: string[] | null;
  salary_expectation: string | null;
  cover_letter_tone: CoverLetterTone | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  work_authorization: WorkAuthorization | null;
  resume_pdf_url: string | null;
  is_complete: boolean;
  created_at: string;
  updated_at: string;
};

// The editable subset of a profile — everything the form owns, and the only
// shape saveProfile accepts. Derived from Profile with Omit so it cannot drift
// from db/schema.sql. The omitted columns are each owned by something other
// than the form: id and email come from the auth session, is_complete is
// derived by calculateCompletion(), resume_pdf_url is written by the upload
// route, and the timestamps belong to the database. cover_letter_tone is
// omitted because cover letter generation is out of scope — the column stays
// in the schema, unused, and never appears in a write payload.
export type ProfileInput = Omit<
  Profile,
  | "id"
  | "email"
  | "cover_letter_tone"
  | "resume_pdf_url"
  | "is_complete"
  | "created_at"
  | "updated_at"
>;

// What Feature 07 reads off a resume PDF. A Pick from ProfileInput rather than
// a hand-written shape, so field names and types cannot drift from what the
// form holds.
//
// The five job-preference fields — job_titles_seeking, remote_preference,
// preferred_locations, salary_expectation, work_authorization — are absent on
// purpose. They record what the user wants, not what is printed on the page, so
// a schema-constrained model asked for them would fill the slot by inventing.
// Excluding them here makes writing one a compile error rather than a review
// catch, and it keeps the merge away from job_titles_seeking and
// preferred_locations, whose raw-text mirrors in ProfileForm would otherwise go
// stale.
export type ProfileExtraction = Pick<
  ProfileInput,
  | "full_name"
  | "phone"
  | "location"
  | "current_title"
  | "experience_level"
  | "years_experience"
  | "skills"
  | "industries"
  | "work_experience"
  | "education"
  | "linkedin_url"
  | "portfolio_url"
>;

export type AgentRun = {
  id: string;
  user_id: string;
  status: AgentRunStatus;
  job_title_searched: string | null;
  location_searched: string | null;
  jobs_found: number | null;
  started_at: string;
  completed_at: string | null;
};

export type Job = {
  id: string;
  // Null when the job did not come from a search run.
  run_id: string | null;
  user_id: string;
  source: JobSource;
  source_url: string | null;
  external_apply_url: string | null;
  title: string;
  company: string;
  location: string | null;
  salary: string | null;
  job_type: JobType | null;
  about_role: string | null;
  responsibilities: string[] | null;
  requirements: string[] | null;
  nice_to_have: string[] | null;
  benefits: string[] | null;
  about_company: string | null;
  // Null until Gemini has scored the job.
  match_score: number | null;
  match_reason: string | null;
  matched_skills: string[] | null;
  missing_skills: string[] | null;
  // Null until the user runs company research on this job.
  company_research: CompanyResearch | null;
  found_at: string;
};

export type AgentLog = {
  id: string;
  run_id: string | null;
  user_id: string;
  message: string;
  level: AgentLogLevel;
  job_id: string | null;
  created_at: string;
};
