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

// profiles.work_experience — capped at 3 roles by the Feature 05 form, not by
// the database.
export type WorkExperience = {
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
// Always fully populated: if browser research fails, GPT-4o synthesises from
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
  // Null until GPT-4o has scored the job.
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
