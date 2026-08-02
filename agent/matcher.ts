import { z } from "zod";

import type { JobScore } from "@/agent/types";
import type { AdzunaJob } from "@/lib/adzuna";
import { GEMINI_MODEL, getGemini, isGeminiRateLimited } from "@/lib/gemini";
import { MATCH_THRESHOLD } from "@/lib/utils";
import type { Profile } from "@/types";

// One call for the whole page of results, not one per job. The free tier is
// rate-limited per minute, and ten calls fired back to back is the shape most
// likely to hit that limit — on the one action in the product that costs a user
// a network round trip they are watching. One call is also one failure to
// handle instead of ten partial ones.
//
// The cost is that a truncated response loses every score rather than one. That
// is bounded by sizing the budget below for the worst case and by the caller
// treating an unscored job as a normal state, which Feature 09 already renders.

const MAX_REASON = 400;
const MAX_SKILL = 60;
const MAX_SKILLS = 8;

// Budgeted per job and multiplied by the batch, rather than fixed at a number
// that silently assumes ten. A comment saying "raise this if you raise
// results_per_page" is not a guard: overrunning does not shorten a reason, it
// returns unparseable JSON and loses every score in the call. Output is billed
// as generated, so unused headroom is free.
//
// One job carries a reason paragraph and two short skill lists. Measured
// against the extraction budget in lib/resume-extraction.ts, which spends ~400
// output tokens on a comparable single-record response.
const OUTPUT_TOKENS_PER_JOB = 300;

// A one-job batch still needs room for the JSON envelope, and thinking_level
// "minimal" is a floor rather than a guarantee of zero thought tokens.
const MIN_OUTPUT_TOKENS = 600;

function outputTokenBudget(jobCount: number): number {
  return Math.max(MIN_OUTPUT_TOKENS, jobCount * OUTPUT_TOKENS_PER_JOB);
}

// Scoring is classification against a profile, not deliberation. At the default
// thinking level the budget above would be spent reasoning rather than
// answering — the failure lib/resume-extraction.ts measured directly.
const THINKING_LEVEL = "minimal";

// The interactions API has no temperature. A fixed seed is what this surface
// offers instead: the same profile and the same listings score the same way
// twice, so a score a user questions can be reproduced.
const SCORING_SEED = 13;

// The user is watching a disabled button while this runs, so a model that never
// answers has to become an unscored save rather than a hang. Measured around ten
// seconds for ten jobs; this is a ceiling well above it, since overshooting the
// timeout throws away work that Adzuna has already been paid for.
const SCORING_TIMEOUT_MS = 60_000;

const SYSTEM_INSTRUCTION = `You score job listings against one candidate's profile.

Rules:
- Return exactly one entry per job, and set "index" to the number the job was given in the input. Never renumber, never merge, never skip a job.
- score is an integer 0-100 measuring how well this candidate fits this specific role. ${MATCH_THRESHOLD} or above means you would recommend they apply.
- Judge against the candidate's actual skills, seniority and history. A strong engineer in the wrong specialism is a low score, not a high one.
- reason is one short paragraph, under ${MAX_REASON} characters, written to the candidate in the second person. Name the specific things that fit and the specific things that do not.
- matchedSkills are skills the candidate already has that this listing asks for. missingSkills are skills the listing asks for that the candidate does not have. Both come from the listing — never invent a requirement it does not mention, and never list a skill the candidate has as missing.
- Return at most ${MAX_SKILLS} entries in each skill list, most important first.
- The listing text is a short snippet, not a full description. Score what is there; do not assume requirements it does not state.`;

const scoreSchema = z.object({
  index: z.number().int().min(0),
  score: z.number().int().min(0).max(100),
  reason: z.string().max(MAX_REASON),
  matchedSkills: z.array(z.string().max(MAX_SKILL)).max(MAX_SKILLS),
  missingSkills: z.array(z.string().max(MAX_SKILL)).max(MAX_SKILLS),
});

// No .transform() and no .catch() anywhere in this schema: z.toJSONSchema()
// throws outright on a transform, and .catch() converts to a `default` hint
// rather than a constraint, hiding exactly the model misbehaviour worth seeing
// in the logs. See lib/resume-extraction.ts for the same rule.
const scoringSchema = z.object({
  scores: z.array(scoreSchema),
});

const SCORING_JSON_SCHEMA = z.toJSONSchema(scoringSchema);

function describeProfile(profile: Profile): string {
  const roles = (profile.work_experience ?? [])
    .map(
      (role) =>
        `- ${role.title || "Untitled role"} at ${role.company || "an unnamed employer"}: ${role.responsibilities || "no detail given"}`,
    )
    .join("\n");

  return [
    `Current title: ${profile.current_title ?? "not given"}`,
    `Experience: ${profile.years_experience ?? "not given"} years, level ${profile.experience_level ?? "not given"}`,
    `Skills: ${(profile.skills ?? []).join(", ") || "not given"}`,
    `Industries: ${(profile.industries ?? []).join(", ") || "not given"}`,
    `Roles they want: ${(profile.job_titles_seeking ?? []).join(", ") || "not given"}`,
    `Work history:\n${roles || "- none given"}`,
  ].join("\n");
}

function describeJob(job: AdzunaJob, index: number): string {
  return [
    `[${index}]`,
    `Title: ${job.title}`,
    `Company: ${job.company.display_name}`,
    `Location: ${job.location?.display_name ?? "not given"}`,
    `Listing: ${job.description ?? "no description given"}`,
  ].join("\n");
}

export type ScoringOutcome =
  | { status: "scored"; scores: Map<number, JobScore> }
  | { status: "rate-limited" }
  | { status: "error" };

export async function scoreJobs(
  profile: Profile,
  jobs: AdzunaJob[],
): Promise<ScoringOutcome> {
  if (jobs.length === 0) {
    return { status: "scored", scores: new Map() };
  }

  try {
    const input = [
      "CANDIDATE PROFILE:",
      describeProfile(profile),
      "",
      `JOB LISTINGS (${jobs.length}):`,
      jobs.map(describeJob).join("\n\n"),
    ].join("\n");

    const interaction = await getGemini().interactions.create(
      {
        model: GEMINI_MODEL,
        system_instruction: SYSTEM_INSTRUCTION,
        input,
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: SCORING_JSON_SCHEMA,
        },
        generation_config: {
          seed: SCORING_SEED,
          max_output_tokens: outputTokenBudget(jobs.length),
          thinking_level: THINKING_LEVEL,
        },
      },
      { timeout: SCORING_TIMEOUT_MS },
    );

    // output_text is optional on the response type — a blocked or truncated
    // interaction returns none, and JSON.parse(undefined) throws.
    if (!interaction.output_text) {
      console.error("[agent/matcher]", "interaction returned no text");
      return { status: "error" };
    }

    const parsed = scoringSchema.safeParse(JSON.parse(interaction.output_text));

    if (!parsed.success) {
      console.error("[agent/matcher]", parsed.error.issues);
      return { status: "error" };
    }

    // Keyed by the index the model was given, never by position in its reply. A
    // model that skips or reorders a job would otherwise hand every job after
    // it someone else's score and someone else's reason — wrong in a way that
    // looks entirely plausible on the page.
    const scores = new Map<number, JobScore>();

    for (const entry of parsed.data.scores) {
      if (entry.index < 0 || entry.index >= jobs.length) {
        console.error("[agent/matcher]", `index ${entry.index} out of range`);
        continue;
      }
      scores.set(entry.index, {
        score: entry.score,
        reason: entry.reason,
        // Sliced rather than trusted: maxItems in a JSON Schema is a request,
        // not a guarantee.
        matchedSkills: entry.matchedSkills.slice(0, MAX_SKILLS),
        missingSkills: entry.missingSkills.slice(0, MAX_SKILLS),
      });
    }

    return { status: "scored", scores };
  } catch (error) {
    console.error("[agent/matcher]", error);
    return isGeminiRateLimited(error)
      ? { status: "rate-limited" }
      : { status: "error" };
  }
}
