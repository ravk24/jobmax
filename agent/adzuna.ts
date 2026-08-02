import { logAgent, logAgentError } from "@/agent/logs";
import { scoreJobs } from "@/agent/matcher";
import type { DiscoveryOutcome, JobScore } from "@/agent/types";
import {
  canonicalJobUrl,
  formatAdzunaSalary,
  searchAdzuna,
  toJobType,
  type AdzunaCountry,
  type AdzunaJob,
} from "@/lib/adzuna";
import { createInsforgeServer, readProfile } from "@/lib/insforge-server";
import { canScoreJobs } from "@/lib/profile";
import { MATCH_THRESHOLD } from "@/lib/utils";
import type { Profile } from "@/types";

// Job discovery, end to end: Adzuna search, dedupe against what this user
// already has, one batched Gemini scoring call, one insert.
//
// This function owns the agent_runs record rather than receiving a runId, which
// is a deliberate departure from the sketch in code-standards.md. Only the code
// that can fail knows when to mark a run `failed`, and a route handler writing
// agent_runs is a route holding business logic.

type RunContext = { runId: string; userId: string };

async function startRun(
  userId: string,
  jobTitle: string,
  location: string,
): Promise<string | null> {
  const insforge = await createInsforgeServer();
  const { data, error } = await insforge.database
    .from("agent_runs")
    .insert({
      user_id: userId,
      status: "running",
      job_title_searched: jobTitle,
      location_searched: location || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[agent/adzuna]", error?.message ?? "run insert returned no row");
    return null;
  }

  return String(data.id);
}

async function finishRun(
  runId: string,
  status: "completed" | "failed",
  jobsFound: number,
): Promise<void> {
  try {
    const insforge = await createInsforgeServer();
    const { error } = await insforge.database
      .from("agent_runs")
      .update({
        status,
        jobs_found: jobsFound,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);

    if (error) {
      console.error("[agent/adzuna]", error.message);
    }
  } catch (error) {
    // A run stuck on `running` is a reporting problem, not a reason to lose
    // jobs that are already saved.
    console.error("[agent/adzuna]", error);
  }
}

// Keyed on the canonical URL, never the tracked one — see canonicalJobUrl().
// Scoped to this user: two people searching the same title should each get
// their own rows, scored against their own profiles.
async function findAlreadySaved(
  userId: string,
  urls: string[],
): Promise<Set<string>> {
  if (urls.length === 0) {
    return new Set();
  }

  const insforge = await createInsforgeServer();
  const { data, error } = await insforge.database
    .from("jobs")
    .select("source_url")
    .eq("user_id", userId)
    .in("source_url", urls);

  if (error) {
    // Better to risk a duplicate row than to lose the search. The user can see
    // and ignore a duplicate; they cannot recover a search that refused to run.
    console.error("[agent/adzuna]", error.message);
    return new Set();
  }

  return new Set(
    (data ?? [])
      .map((row: { source_url: string | null }) => row.source_url)
      .filter((url: string | null): url is string => url !== null),
  );
}

// Mirrors the insertable columns of `jobs` in db/schema.sql. Written out rather
// than inferred so a column renamed there is a compile error here, not a row
// that silently stops carrying a field.
type JobInsert = {
  user_id: string;
  run_id: string;
  source: "search";
  source_url: string;
  external_apply_url: string;
  title: string;
  company: string;
  location: string | null;
  salary: string | null;
  job_type: "fulltime" | "parttime" | "contract";
  about_role: string | null;
  match_score: number | null;
  match_reason: string | null;
  matched_skills: string[] | null;
  missing_skills: string[] | null;
  found_at: string;
};

function toJobRow(
  job: AdzunaJob,
  score: JobScore | undefined,
  country: AdzunaCountry,
  context: RunContext,
  foundAt: string,
): JobInsert {
  return {
    user_id: context.userId,
    run_id: context.runId,
    source: "search",
    // The stable identity, which is what the dedupe reads back.
    source_url: canonicalJobUrl(job),
    // The tracked link the user actually clicks.
    external_apply_url: job.redirect_url,
    title: job.title,
    company: job.company.display_name,
    location: job.location?.display_name ?? null,
    salary: formatAdzunaSalary(job, country),
    job_type: toJobType(job),
    // Adzuna returns a snippet, not a full description. It is what Gemini
    // scored from, so it is what the job details page will show.
    about_role: job.description ?? null,
    match_score: score?.score ?? null,
    match_reason: score?.reason ?? null,
    matched_skills: score?.matchedSkills ?? null,
    missing_skills: score?.missingSkills ?? null,
    found_at: foundAt,
  };
}

export async function discoverJobs(
  user: { id: string; email: string },
  jobTitle: string,
  location: string,
): Promise<DiscoveryOutcome> {
  // Declared outside the try so the catch can tell "failed before a run
  // existed" from "failed during one", and mark the run in the second case.
  let runId: string | null = null;

  // The try opens before the profile read, not after the run is created.
  // readProfile() and createInsforgeServer() both throw rather than returning an
  // error, and code-standards.md § Agent Code requires that an agent function
  // never let a failure escape.
  try {
    // The profile is read before the run is opened: refusing a search costs no
    // Adzuna call, no Gemini call, and leaves no run behind to explain.
    const profileResult = await readProfile(user);

    if (profileResult.status === "error") {
      return { status: "error" };
    }
    if (profileResult.status === "empty") {
      return { status: "no-profile" };
    }
    if (!canScoreJobs(profileResult.profile)) {
      return { status: "incomplete" };
    }

    const profile: Profile = profileResult.profile;

    runId = await startRun(user.id, jobTitle, location);
    if (!runId) {
      return { status: "error" };
    }

    const context: RunContext = { runId, userId: user.id };

    await logAgent({
      runId,
      userId: user.id,
      level: "info",
      message: `Searching Adzuna for "${jobTitle}"${location ? ` in ${location}` : ""}.`,
    });

    const search = await searchAdzuna(jobTitle, location);

    if (search.status === "error") {
      await logAgent({
        runId,
        userId: user.id,
        level: "error",
        message: "Adzuna search failed.",
      });
      await finishRun(runId, "failed", 0);
      return { status: "search-failed" };
    }

    const found = search.jobs.length;

    if (found === 0) {
      await logAgent({
        runId,
        userId: user.id,
        level: "warning",
        message: "Adzuna returned no listings for this search.",
      });
      await finishRun(runId, "completed", 0);
      return {
        status: "completed",
        found: 0,
        saved: 0,
        strong: 0,
        scored: true,
        scores: [],
      };
    }

    const alreadySaved = await findAlreadySaved(
      user.id,
      search.jobs.map(canonicalJobUrl),
    );
    // `seen` also catches a listing Adzuna returned twice in one response —
    // otherwise a single search could insert its own duplicate, which the next
    // search would then be unable to tell apart.
    const seen = new Set<string>();
    const fresh = search.jobs.filter((job) => {
      const url = canonicalJobUrl(job);
      if (alreadySaved.has(url) || seen.has(url)) {
        return false;
      }
      seen.add(url);
      return true;
    });

    if (fresh.length === 0) {
      await logAgent({
        runId,
        userId: user.id,
        level: "info",
        message: `All ${found} listings were already saved. Nothing new.`,
      });
      await finishRun(runId, "completed", 0);
      return {
        status: "completed",
        found,
        saved: 0,
        strong: 0,
        scored: true,
        scores: [],
      };
    }

    const scoring = await scoreJobs(profile, fresh);

    // A scoring failure is not a search failure. The listings are real and
    // already cost a network call; they are saved with a null match_score,
    // which the Find Jobs page already renders as "Not scored" and files under
    // Low Match. The banner tells the user scoring did not run.
    if (scoring.status !== "scored") {
      await logAgent({
        runId,
        userId: user.id,
        level: "warning",
        message:
          scoring.status === "rate-limited"
            ? "Gemini is rate-limited — saving these jobs unscored."
            : "Scoring failed — saving these jobs unscored.",
      });
    }

    // Explicitly parameterised: a bare `new Map()` here has no contextual type,
    // infers Map<any, any>, and the `any` flows unchecked into toJobRow().
    const scores: Map<number, JobScore> =
      scoring.status === "scored" ? scoring.scores : new Map();

    // One timestamp for the whole batch, so a page of results found together
    // sorts together rather than by the order they happened to be mapped in.
    const foundAt = new Date().toISOString();
    const rows = fresh.map((job, index) =>
      toJobRow(job, scores.get(index), search.country, context, foundAt),
    );

    const insforge = await createInsforgeServer();
    const { error: insertError } = await insforge.database
      .from("jobs")
      .insert(rows);

    if (insertError) {
      await logAgentError(
        runId,
        user.id,
        "Saving jobs failed",
        insertError.message,
      );
      await finishRun(runId, "failed", 0);
      return { status: "error" };
    }

    const savedScores = rows.map((row) => row.match_score);
    const strong = savedScores.filter(
      (score): score is number => score !== null && score >= MATCH_THRESHOLD,
    ).length;

    await logAgent({
      runId,
      userId: user.id,
      level: "success",
      message: `Saved ${rows.length} of ${found} listings, ${strong} strong ${strong === 1 ? "match" : "matches"}.`,
    });
    await finishRun(runId, "completed", rows.length);

    return {
      status: "completed",
      found,
      saved: rows.length,
      strong,
      scored: scoring.status === "scored",
      scores: savedScores,
    };
  } catch (error) {
    if (runId) {
      await logAgentError(runId, user.id, "Job discovery failed", error);
      // Marked before returning, so no run is left reading `running` forever.
      await finishRun(runId, "failed", 0);
    } else {
      // No run to attach it to — the failure landed on the profile read or on
      // opening the run itself, so the console is the only place it can go.
      console.error("[agent/adzuna]", error);
    }
    return { status: "error" };
  }
}
