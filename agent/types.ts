// Types shared across agent/. Row shapes live in types/index.ts and mirror
// db/schema.sql — these describe what the agents pass between their own steps.

export type JobScore = {
  score: number;
  reason: string;
  matchedSkills: string[];
  missingSkills: string[];
};

// A union rather than { success, error }: the route maps each outcome to its
// own status code and its own sentence, and user-facing copy belongs to the
// layer that talks to the user. Same shape as ExtractionOutcome in
// lib/resume-extraction.ts.
//
// `scored` being false is a completed search, not a failure. Gemini can be
// rate-limited or return unparseable JSON while Adzuna returned perfectly good
// listings — those are saved unscored and the banner says so, rather than
// throwing away work that already cost a network call.
export type DiscoveryOutcome =
  | {
      status: "completed";
      found: number;
      saved: number;
      strong: number;
      scored: boolean;
      scores: (number | null)[];
    }
  | { status: "no-profile" }
  | { status: "incomplete" }
  | { status: "search-failed" }
  | { status: "error" };

// Company research, same shape discipline. Differences from DiscoveryOutcome
// are deliberate: no `incomplete`, because synthesis works from whatever
// profile exists — there is no canScoreJobs-style gate. No `browse-failed`,
// because a browser failure is never an outcome: it degrades to `completed`
// with browsed false, per the always-return-a-dossier invariant. And
// `rate-limited` is an outcome here where scoring folds it into an unscored
// save — a rate-limited synthesis has nothing to fall back on; the dossier IS
// the product. `company` rides along for the route's PostHog capture.
export type ResearchOutcome =
  | { status: "completed"; browsed: boolean; company: string }
  | { status: "not-found" }
  | { status: "no-profile" }
  | { status: "rate-limited" }
  | { status: "error" };
