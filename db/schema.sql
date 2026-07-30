-- JobMax — Feature 04 database schema
-- Source of truth for the InsForge Postgres schema. Applied with the MCP
-- run-raw-sql tool. Re-running is safe: every statement is idempotent.
--
-- SECURITY NOTE — read before changing anything below.
-- InsForge sets a default ACL on `public` granting arwd (INSERT/SELECT/UPDATE/
-- DELETE) to BOTH `anon` and `authenticated` on every table project_admin
-- creates, and both roles already hold USAGE on the schema. That means a table
-- without RLS is world-readable and world-writable by unauthenticated callers.
-- RLS is therefore not defence in depth here — it is the only access control.
-- Never add a table to this file without enabling RLS and adding a policy.
--
-- Roles: anon and authenticated both have rolbypassrls = false, so policies do
-- apply to them. project_admin (the MCP/admin connection) has rolbypassrls =
-- true, which is why admin tooling still sees everything.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id                  uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name           text,
  email               text NOT NULL,
  phone               text,
  location            text,
  current_title       text,
  experience_level    text CHECK (experience_level IN ('junior', 'mid', 'senior', 'lead')),
  years_experience    integer CHECK (years_experience >= 0),
  skills              text[],
  industries          text[],
  work_experience     jsonb,
  education           jsonb,
  job_titles_seeking  text[],
  remote_preference   text CHECK (remote_preference IN ('remote', 'onsite', 'hybrid', 'any')),
  preferred_locations text[],
  salary_expectation  text,
  cover_letter_tone   text CHECK (cover_letter_tone IN ('formal', 'casual', 'enthusiastic')),
  linkedin_url        text,
  portfolio_url       text,
  work_authorization  text CHECK (work_authorization IN ('citizen', 'permanent_resident', 'visa_required')),
  resume_pdf_url      text,
  is_complete         boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- agent_runs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_runs (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  status             text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  job_title_searched text,
  location_searched  text,
  jobs_found         integer CHECK (jobs_found >= 0),
  started_at         timestamptz NOT NULL DEFAULT now(),
  completed_at       timestamptz
);

-- ---------------------------------------------------------------------------
-- jobs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.jobs (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Null when the job did not come from a search run.
  run_id             uuid REFERENCES public.agent_runs (id) ON DELETE SET NULL,
  user_id            uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  source             text NOT NULL CHECK (source IN ('search', 'url')),
  source_url         text,
  external_apply_url text,
  title              text NOT NULL,
  company            text NOT NULL,
  location           text,
  salary             text,
  job_type           text CHECK (job_type IN ('fulltime', 'parttime', 'contract')),
  about_role         text,
  responsibilities   text[],
  requirements       text[],
  nice_to_have       text[],
  benefits           text[],
  about_company      text,
  -- Null until GPT-4o has scored the job.
  match_score        integer CHECK (match_score BETWEEN 0 AND 100),
  match_reason       text,
  matched_skills     text[],
  missing_skills     text[],
  -- Null until the user runs company research on this job.
  company_research   jsonb,
  found_at           timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- agent_logs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id     uuid REFERENCES public.agent_runs (id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  message    text NOT NULL,
  level      text NOT NULL CHECK (level IN ('info', 'success', 'warning', 'error')),
  job_id     uuid REFERENCES public.jobs (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Indexes — chosen for the queries Features 11, 15 and 16 actually run.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS jobs_user_found_at_idx    ON public.jobs (user_id, found_at DESC);
CREATE INDEX IF NOT EXISTS jobs_user_match_score_idx ON public.jobs (user_id, match_score DESC);
CREATE INDEX IF NOT EXISTS jobs_run_id_idx           ON public.jobs (run_id);
CREATE INDEX IF NOT EXISTS agent_runs_user_started_idx ON public.agent_runs (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS agent_logs_run_id_idx     ON public.agent_logs (run_id);
CREATE INDEX IF NOT EXISTS agent_logs_user_created_idx ON public.agent_logs (user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- profiles.updated_at is kept by the database so no caller can forget it.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- auth.uid() is SELECT nullif(auth.jwt() ->> 'sub', '')::uuid — it returns the
-- signed-in user's id, or NULL for an anonymous request. Every policy below
-- compares against it, so an anonymous caller matches no rows.
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_own_rows ON public.profiles;
CREATE POLICY profiles_own_rows ON public.profiles
  FOR ALL TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS agent_runs_own_rows ON public.agent_runs;
CREATE POLICY agent_runs_own_rows ON public.agent_runs
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS jobs_own_rows ON public.jobs;
CREATE POLICY jobs_own_rows ON public.jobs
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS agent_logs_own_rows ON public.agent_logs;
CREATE POLICY agent_logs_own_rows ON public.agent_logs
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Revoke the inherited anon grants. Every row in this schema belongs to exactly
-- one signed-in user, so anon should be refused outright rather than allowed to
-- connect and match zero rows. This undoes the default ACL described at the top.
-- ---------------------------------------------------------------------------
REVOKE ALL ON public.profiles   FROM anon;
REVOKE ALL ON public.agent_runs FROM anon;
REVOKE ALL ON public.jobs       FROM anon;
REVOKE ALL ON public.agent_logs FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_logs TO authenticated;
