// Mock rows for Feature 09. The Find Jobs page is built on these until Feature
// 11 replaces selectJobs() with a real InsForge query — DELETE THIS FILE THEN.
//
// Typed as Job[] rather than a hand-rolled shape, per the Feature 05 technique,
// so the mock cannot drift from db/schema.sql.
//
// The set deliberately covers the cases the design does not show: an unscored
// job, a job with no salary, and scores spanning all three match-bar colours.

import type { Job } from "@/types";

type Seed = {
  company: string;
  title: string;
  score: number | null;
  salary: string | null;
  location: string;
  hoursAgo: number;
};

const SEEDS: Seed[] = [
  { company: "Vercel", title: "Senior Frontend Engineer", score: 94, salary: "$160k - $200k", location: "Remote", hoursAgo: 2 },
  { company: "Stripe", title: "Staff UI Engineer", score: 88, salary: "$180k - $240k", location: "New York, US", hoursAgo: 26 },
  { company: "Linear", title: "Product Engineer", score: 96, salary: "$150k - $190k", location: "Remote", hoursAgo: 30 },
  { company: "Notion", title: "Frontend Developer", score: 72, salary: "$130k - $170k", location: "San Francisco, US", hoursAgo: 50 },
  { company: "OpenAI", title: "Design Engineer", score: 91, salary: "$200k - $280k", location: "San Francisco, US", hoursAgo: 74 },
  { company: "Figma", title: "Software Engineer, Editor", score: 85, salary: "$170k - $220k", location: "Remote", hoursAgo: 98 },
  { company: "Shopify", title: "Senior React Developer", score: 81, salary: "$140k - $185k", location: "Remote", hoursAgo: 5 },
  { company: "Airbnb", title: "Frontend Infrastructure Engineer", score: 77, salary: "$165k - $210k", location: "Seattle, US", hoursAgo: 9 },
  { company: "Datadog", title: "UI Platform Engineer", score: 68, salary: "$150k - $195k", location: "New York, US", hoursAgo: 33 },
  { company: "Cloudflare", title: "Full Stack Engineer", score: 74, salary: "$145k - $180k", location: "Austin, US", hoursAgo: 44 },
  { company: "Supabase", title: "Frontend Engineer", score: 89, salary: "$120k - $160k", location: "Remote", hoursAgo: 55 },
  { company: "Ramp", title: "Product Engineer, Growth", score: 63, salary: "$175k - $225k", location: "New York, US", hoursAgo: 62 },
  { company: "Retool", title: "Senior Software Engineer", score: 79, salary: null, location: "Remote", hoursAgo: 80 },
  { company: "Discord", title: "Client Engineer", score: 58, salary: "$160k - $205k", location: "Remote", hoursAgo: 91 },
  { company: "Anthropic", title: "Frontend Engineer, Product", score: 93, salary: "$210k - $290k", location: "San Francisco, US", hoursAgo: 106 },
  { company: "GitLab", title: "Senior Frontend Engineer", score: 84, salary: "$135k - $175k", location: "Remote", hoursAgo: 118 },
  { company: "Twilio", title: "Software Engineer II", score: 51, salary: "$130k - $165k", location: "Denver, US", hoursAgo: 130 },
  { company: "Snowflake", title: "UI Engineer", score: null, salary: "$155k - $200k", location: "Bellevue, US", hoursAgo: 142 },
  { company: "Grammarly", title: "Frontend Engineer", score: 66, salary: "$140k - $180k", location: "Remote", hoursAgo: 156 },
  { company: "Asana", title: "Senior Product Engineer", score: 87, salary: "$170k - $215k", location: "San Francisco, US", hoursAgo: 170 },
  { company: "Miro", title: "Frontend Engineer, Canvas", score: 45, salary: "$125k - $160k", location: "Amsterdam, NL", hoursAgo: 184 },
  { company: "Loom", title: "Web Engineer", score: 71, salary: "$150k - $190k", location: "Remote", hoursAgo: 198 },
  { company: "Netlify", title: "Staff Frontend Engineer", score: 82, salary: "$165k - $210k", location: "Remote", hoursAgo: 212 },
  { company: "Sentry", title: "Frontend Engineer", score: 76, salary: "$145k - $185k", location: "San Francisco, US", hoursAgo: 226 },
];

// found_at is derived from module load so the relative dates in the table stay
// plausible however long the dev server has been running.
const LOADED_AT = Date.now();

function toJob(seed: Seed, index: number): Job {
  return {
    id: `mock-job-${index + 1}`,
    run_id: null,
    user_id: "00000000-0000-0000-0000-000000000000",
    source: "search",
    source_url: null,
    external_apply_url: null,
    title: seed.title,
    company: seed.company,
    location: seed.location,
    salary: seed.salary,
    job_type: "fulltime",
    about_role: null,
    responsibilities: null,
    requirements: null,
    nice_to_have: null,
    benefits: null,
    about_company: null,
    match_score: seed.score,
    match_reason: null,
    matched_skills: null,
    missing_skills: null,
    company_research: null,
    found_at: new Date(LOADED_AT - seed.hoursAgo * 3_600_000).toISOString(),
  };
}

export const MOCK_JOBS: Job[] = SEEDS.map(toJob);
