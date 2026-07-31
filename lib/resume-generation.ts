import { renderToBuffer } from "@react-pdf/renderer";
import { z } from "zod";

import { GEMINI_MODEL, getGemini, isGeminiRateLimited } from "@/lib/gemini";
import { readProfile } from "@/lib/insforge-server";
import { canGenerateResume, hasRoleContent } from "@/lib/profile";
import { replaceStoredResume } from "@/lib/resume-storage";
import {
  MAX_BULLET_CHARS,
  MAX_BULLETS_PER_ROLE,
  MAX_SUMMARY_CHARS,
  ResumeDocument,
  type ResumeProse,
} from "@/lib/resume-pdf";
import type { Profile, WorkExperience } from "@/types";

// Server-only. Pulls in both the Gemini client and the PDF engine, neither of
// which has any business in a browser bundle.

// The largest response in the project — a summary plus up to three roles of
// bullets — and thinking tokens come out of the same budget. Feature 07 measured
// this model spending 767 thought tokens of an 800 budget and emitting 14, which
// parsed as nothing. library-docs.md used to prescribe 1000 with default
// thinking for this call; that pairing would have failed on the first attempt.
const MAX_OUTPUT_TOKENS = 2000;

// Rewriting the user's own responsibility text into bullets is a language task,
// not a reasoning one — every fact is supplied. Deliberation here buys nothing
// and costs the answer.
const THINKING_LEVEL = "minimal";

// temperature does not exist on the interactions API. A fixed seed makes a
// regeneration from an unchanged profile return the same document, which is the
// right behaviour for a resume: pressing the button twice should not quietly
// produce different wording the user then has to compare.
const GENERATION_SEED = 11;

const SYSTEM_INSTRUCTION = `You are a professional resume writer. You are given a candidate's own profile data and you rewrite it into polished resume copy.

Rules:
- Use only the information given. Never invent an employer, a date, a metric, a technology, or an achievement. You are rewriting, not researching.
- Never quantify anything unless the number appears in the source text. Do not write "increased performance by 40%" unless 40% is there.
- The summary is 2-3 sentences, under ${MAX_SUMMARY_CHARS} characters, describing what this person does and what they are strong at. Write it in the implied first person with no pronoun — "Backend engineer with six years…", never "I am" and never "He is".
- Give each role ${MAX_BULLETS_PER_ROLE - 2} to ${MAX_BULLETS_PER_ROLE} bullets. Each starts with a strong verb, stays under ${MAX_BULLET_CHARS} characters, and describes impact rather than duties.
- Use past tense for finished roles and present tense for a role marked current.
- If a role's responsibilities text is empty, return an empty bullets array for it. Never write bullets from a job title alone — that is invention.
- Echo each role id back exactly as given. Never merge two roles, never invent an id.
- No headings, no markdown, no bullet characters. Return plain sentences.`;

// Slack above the caps the prompt asks for, on purpose. These become maxLength
// in the JSON Schema and constrain decoding, so setting them at the exact
// display limit makes the model stop mid-word. The real caps are applied by
// truncate() in lib/resume-pdf.tsx, where a clean ellipsis is possible.
const proseSchema = z.object({
  summary: z.string().max(MAX_SUMMARY_CHARS * 2).nullish(),
  roles: z
    .array(
      z.object({
        id: z.string().max(100),
        bullets: z.array(z.string().max(MAX_BULLET_CHARS * 2)).nullish(),
      }),
    )
    .nullish(),
});

const PROSE_JSON_SCHEMA = z.toJSONSchema(proseSchema);

const EMPTY_PROSE: ResumeProse = { summary: "", bullets: {} };

function describeRole(role: WorkExperience): string {
  const period = role.isCurrent
    ? `${role.startDate || "unknown"} to present`
    : `${role.startDate || "unknown"} to ${role.endDate || "unknown"}`;

  return [
    `id: ${role.id}`,
    `title: ${role.title || "unknown"}`,
    `company: ${role.company || "unknown"}`,
    `period: ${period}`,
    `responsibilities as the candidate wrote them: ${
      role.responsibilities.trim() || "(none provided)"
    }`,
  ].join("\n");
}

function buildPrompt(profile: Profile, roles: WorkExperience[]): string {
  const facts = [
    `name: ${profile.full_name ?? ""}`,
    `current title: ${profile.current_title ?? "unknown"}`,
    `years of experience: ${profile.years_experience ?? "unknown"}`,
    `experience level: ${profile.experience_level ?? "unknown"}`,
    `location: ${profile.location ?? "unknown"}`,
    `skills: ${(profile.skills ?? []).join(", ") || "none listed"}`,
    `industries: ${(profile.industries ?? []).join(", ") || "none listed"}`,
  ].join("\n");

  const history =
    roles.length > 0
      ? roles.map(describeRole).join("\n\n")
      : "(no work history provided — write the summary from the skills and title above, and return an empty roles array)";

  return `CANDIDATE\n${facts}\n\nROLES\n${history}`;
}

// Keyed by the id the model echoed back, and only for ids that actually exist on
// this profile. A hallucinated id lands nowhere instead of overwriting a real
// role's bullets.
function toProse(
  parsed: z.infer<typeof proseSchema>,
  roles: WorkExperience[],
): ResumeProse {
  const knownIds = new Set(roles.map((role) => role.id));
  const bullets: Record<string, string[]> = {};

  for (const role of parsed.roles ?? []) {
    if (!knownIds.has(role.id)) continue;
    bullets[role.id] = (role.bullets ?? []).slice(0, MAX_BULLETS_PER_ROLE);
  }

  return { summary: parsed.summary ?? "", bullets };
}

// "polished" and "plain" are both successes that write a PDF. They are told
// apart so the route can say which one happened: a resume whose wording is the
// user's own, delivered silently under a button labelled Generate, is quietly
// less than what was promised — and this write overwrites whatever they had.
type ProseOutcome =
  | { status: "polished"; prose: ResumeProse }
  | { status: "plain" }
  | { status: "rate-limited" };

async function writeProse(
  profile: Profile,
  roles: WorkExperience[],
): Promise<ProseOutcome> {
  try {
    const interaction = await getGemini().interactions.create({
      model: GEMINI_MODEL,
      system_instruction: SYSTEM_INSTRUCTION,
      input: buildPrompt(profile, roles),
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: PROSE_JSON_SCHEMA,
      },
      generation_config: {
        seed: GENERATION_SEED,
        max_output_tokens: MAX_OUTPUT_TOKENS,
        thinking_level: THINKING_LEVEL,
      },
    });

    // string | undefined — a blocked or truncated interaction returns none, and
    // JSON.parse(undefined) throws.
    if (!interaction.output_text) {
      console.error("[lib/resume-generation]", "interaction returned no text");
      return { status: "plain" };
    }

    const parsed = proseSchema.safeParse(JSON.parse(interaction.output_text));

    if (!parsed.success) {
      console.error("[lib/resume-generation]", parsed.error.issues);
      return { status: "plain" };
    }

    return { status: "polished", prose: toProse(parsed.data, roles) };
  } catch (error) {
    console.error("[lib/resume-generation]", error);

    // A 429 is the one model failure worth refusing over. It is transient, so
    // "try again in a moment" is real advice and a retry returns the polished
    // document. Every other failure is deterministic here — the seed is fixed,
    // so the same profile fails the same way forever — and refusing would leave
    // the user permanently unable to generate anything. Those degrade to the
    // candidate's own wording instead, and the route says so.
    return isGeminiRateLimited(error)
      ? { status: "rate-limited" }
      : { status: "plain" };
  }
}

// Mirrors ExtractionOutcome in lib/resume-extraction.ts: a union rather than
// { success, error }, because each outcome maps to its own status code and its
// own sentence, and user-facing copy belongs to the route.
export type GenerationOutcome =
  | { status: "generated"; polished: boolean }
  | { status: "no-profile" }
  | { status: "incomplete" }
  | { status: "rate-limited" }
  // previousResumeRemoved distinguishes a failure that changed nothing from one
  // that destroyed the resume the user already had. Only the storage step can
  // do the latter, so every other error path reports false.
  | { status: "error"; previousResumeRemoved: boolean };

export async function generateResumeFromProfile(user: {
  id: string;
  email: string;
}): Promise<GenerationOutcome> {
  try {
    // Reuses the reader /profile already goes through, so the PDF is built from
    // exactly the row the page renders — including its repairs to legacy jsonb.
    const result = await readProfile(user);

    if (result.status === "error") {
      return { status: "error", previousResumeRemoved: false };
    }
    if (result.status === "empty") return { status: "no-profile" };

    const profile = result.profile;

    // Before the model call, not after: generating from nothing spends a
    // rate-limited request to produce an empty page and then overwrites a
    // resume the user may actually need with it.
    if (!canGenerateResume(profile)) return { status: "incomplete" };

    const roles = (profile.work_experience ?? []).filter(hasRoleContent);
    const outcome = await writeProse(profile, roles);

    if (outcome.status === "rate-limited") return { status: "rate-limited" };

    const prose = outcome.status === "polished" ? outcome.prose : EMPTY_PROSE;

    // ResumeDocument is called, not written as JSX. renderToBuffer takes a
    // ReactElement<DocumentProps>, which a JSX element built from a custom
    // component does not satisfy without an assertion — and calling it keeps
    // this module a .ts file.
    const buffer = await renderToBuffer(ResumeDocument({ profile, prose }));

    // renderToBuffer returns a Node Buffer; storage.upload takes File | Blob and
    // nothing else. There is no options object and no upsert flag — uploading to
    // an existing key replaces the object in place, which is what the one active
    // resume per user rule wants.
    //
    // The Uint8Array copy is not ceremony. Buffer is Uint8Array<ArrayBufferLike>
    // and BlobPart requires ArrayBufferView<ArrayBuffer>, so a Buffer cannot be
    // passed to the File constructor — SharedArrayBuffer is in ArrayBufferLike
    // and is not a valid backing store. Re-wrapping copies into a plain
    // ArrayBuffer and satisfies it without an assertion.
    const file = new File([new Uint8Array(buffer)], "resume.pdf", {
      type: "application/pdf",
    });

    // Removes the previous object, uploads this one, and writes
    // resume_pdf_url — shared with the upload route so the two writers cannot
    // drift, and so a half-completed replacement is cleaned up identically.
    const written = await replaceStoredResume({
      userId: user.id,
      email: user.email,
      file,
    });

    // The one path that can have destroyed the stored resume — pass the fact
    // through rather than flattening it into a generic failure.
    if (written.status === "error") {
      return {
        status: "error",
        previousResumeRemoved: written.previousResumeRemoved,
      };
    }

    return { status: "generated", polished: outcome.status === "polished" };
  } catch (error) {
    console.error("[lib/resume-generation]", error);
    return { status: "error", previousResumeRemoved: false };
  }
}
