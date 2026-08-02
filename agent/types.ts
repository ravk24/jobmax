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
