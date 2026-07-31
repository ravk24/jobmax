import { z } from "zod";

import { GEMINI_MODEL, getGemini, isGeminiRateLimited } from "@/lib/gemini";
import { createInsforgeServer } from "@/lib/insforge-server";
import {
  DEGREE_OPTIONS,
  isExtractionEmpty,
  MAX_RESUME_BYTES,
  MAX_WORK_EXPERIENCE,
  RESUME_BUCKET,
  resumeObjectKey,
} from "@/lib/profile";
import {
  MAX_SHORT_TEXT,
  MAX_TAG,
  MAX_TAGS,
  MAX_YEARS_EXPERIENCE,
} from "@/lib/profile-schema";
import type { ProfileExtraction, WorkExperience } from "@/types";

// Server-only. Imports the Gemini client, so a Client Component that reached
// this module would ship a key it cannot have.

// Not MAX_RESPONSIBILITIES (5000), which governs what a user may type. The
// whole response has to fit inside the output budget below, and three roles at
// 5000 characters cannot. A truncated response is invalid JSON, which loses the
// entire extraction rather than one long field.
const MAX_EXTRACTED_RESPONSIBILITIES = 600;

// Asked for in the prompt and enforced in normalize(). Not put in the schema:
// a hard maxItems there would fail the whole parse over a long skills list and
// lose an otherwise good reading.
const MAX_EXTRACTED_SKILLS = 20;

// library-docs.md fixes this at 800. Raised after measuring: a two-role resume
// spends 399 output tokens, so a full three roles with twenty skills lands near
// the old ceiling, and overrunning it does not truncate a field — it returns
// unparseable JSON and loses the whole extraction. Output is billed as
// generated, so the headroom costs nothing when it is not used.
const MAX_OUTPUT_TOKENS = 1200;

// gemini-3.6-flash reasons before answering, and thought tokens are drawn from
// the same budget as the answer: at the documented 800 it spent 767 of them and
// emitted 14 tokens of JSON, which parsed as nothing. Reading fields off a
// resume is transcription, not reasoning. Measured at "minimal": 0 thought
// tokens, a complete answer, and identical output across runs.
const THINKING_LEVEL = "minimal";

// The interactions API dropped `temperature` — GenerationConfig_2 in
// @google/genai v2.15.0 declares max_output_tokens and seed but no temperature,
// which survives only on the legacy models.generateContent config. A fixed seed
// is what this surface offers instead: the same resume yields the same reading
// twice, which is what the documented "0.3 for extraction" rule was for.
const EXTRACTION_SEED = 7;

// A resume is not a form. Anything the model cannot see on the page has to come
// back null, because a schema-constrained decoder will otherwise fill the slot
// with something plausible.
const SYSTEM_INSTRUCTION = `You extract structured data from a candidate's resume.

Rules:
- Extract only what is printed on the page. Never infer, never invent, never fill a field with a plausible guess. If something is absent, return null for it.
- Dates must be formatted YYYY-MM, for example 2021-03. Never "Jan 2021", never a bare year. If a date is unreadable or absent, return null.
- Return at most the ${MAX_WORK_EXPERIENCE} most recent roles, most recent first.
- For each role, summarise responsibilities in 2-3 short lines, under 400 characters total.
- Return at most the ${MAX_EXTRACTED_SKILLS} most relevant skills. Prefer concrete technologies and tools over soft skills.
- experience_level must be consistent with years_experience: 0-2 junior, 3-5 mid, 6-9 senior, 10 or more lead.
- URLs must be absolute and include an https:// scheme.
- Set isCurrent true only when the resume says the role is ongoing, and then leave endDate null.`;

const USER_PROMPT =
  "Extract this candidate's profile from the attached resume.";

const extractedText = z.string().max(MAX_SHORT_TEXT).nullish();

// No id. The model cannot mint stable identities — it would either collide or
// omit — and React keys plus every element id in WorkExperienceCard hang off
// it. The server assigns one per role after validation.
const extractedRole = z.object({
  company: extractedText.describe("Employer name as printed"),
  title: extractedText.describe("The candidate's job title in this role"),
  startDate: z.string().max(20).nullish().describe("YYYY-MM"),
  endDate: z.string().max(20).nullish().describe("YYYY-MM, or null if ongoing"),
  isCurrent: z.boolean().nullish(),
  responsibilities: z
    .string()
    .max(MAX_EXTRACTED_RESPONSIBILITIES)
    .nullish()
    .describe("2-3 short lines"),
});

// Deliberately not built from profileInputSchema. Its nullableText and tagList
// helpers end in .transform(), and z.toJSONSchema() throws outright on a
// transform. .catch() is avoided too: it converts to a `default` hint rather
// than a constraint, and it would swallow exactly the model misbehaviour worth
// seeing in the logs. Tolerance comes from .nullish(), which drops each key
// from `required` so an absent field is valid rather than fatal.
//
// The caps are imported rather than restated so extraction cannot produce a
// value that profileInputSchema later rejects at save time.
const geminiExtractionSchema = z.object({
  full_name: extractedText,
  phone: extractedText,
  location: extractedText.describe("City and country or state"),
  current_title: extractedText.describe("Most recent job title"),
  experience_level: z.enum(["junior", "mid", "senior", "lead"]).nullish(),
  years_experience: z.number().int().min(0).max(MAX_YEARS_EXPERIENCE).nullish(),
  skills: z.array(z.string().max(MAX_TAG)).max(MAX_TAGS).nullish(),
  industries: z.array(z.string().max(MAX_TAG)).max(MAX_TAGS).nullish(),
  work_experience: z.array(extractedRole).max(MAX_WORK_EXPERIENCE).nullish(),
  education: z
    .object({
      // Constrained to the form's Select options. A free string outside this
      // list leaves the Select with no matching item, so the field renders
      // blank while state holds the value — invisible, and saved anyway.
      degree: z.enum(DEGREE_OPTIONS).nullish(),
      field: extractedText,
      institution: extractedText,
      graduationYear: z.number().int().min(1900).max(2100).nullish(),
    })
    .nullish(),
  linkedin_url: extractedText,
  portfolio_url: extractedText,
});

type GeminiExtraction = z.infer<typeof geminiExtractionSchema>;
type ExtractedRole = z.infer<typeof extractedRole>;

const EXTRACTION_JSON_SCHEMA = z.toJSONSchema(geminiExtractionSchema);

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

// <input type="month"> renders blank for anything that is not YYYY-MM, so a
// stray "Jan 2021" would be invisible in the form yet still present in state
// and still written on save. Dropped here rather than constrained in the schema
// — a regex there would fail the parse and discard an otherwise good reading
// over one bad date.
function monthOrEmpty(value: string | null | undefined): string {
  return value && MONTH_PATTERN.test(value) ? value : "";
}

function monthOrNull(value: string | null | undefined): string | null {
  return value && MONTH_PATTERN.test(value) ? value : null;
}

function normalizeRole(role: ExtractedRole): WorkExperience {
  const endDate = monthOrNull(role.endDate);

  // A role cannot be both current and ended. WorkExperienceCard disables the
  // end-date input while isCurrent is set, so an end date surviving alongside
  // it is one the user cannot clear.
  const isCurrent = endDate === null ? (role.isCurrent ?? false) : false;

  return {
    // Generated here, not in the browser: this runs in a route handler
    // answering a click, so the value never exists during SSR and cannot cause
    // a hydration mismatch.
    id: crypto.randomUUID(),
    company: role.company ?? "",
    title: role.title ?? "",
    startDate: monthOrEmpty(role.startDate),
    endDate,
    isCurrent,
    responsibilities: role.responsibilities ?? "",
  };
}

// The wire shape is tolerant and partial; ProfileExtraction is not. Everything
// the form cannot represent is resolved here, once, before the value leaves
// this module.
function normalize(parsed: GeminiExtraction): ProfileExtraction {
  const education = parsed.education;

  return {
    full_name: parsed.full_name ?? null,
    phone: parsed.phone ?? null,
    location: parsed.location ?? null,
    current_title: parsed.current_title ?? null,
    experience_level: parsed.experience_level ?? null,
    years_experience: parsed.years_experience ?? null,
    // Sliced rather than trusted. maxItems in a JSON Schema is a request, and
    // an over-long list surfaces later as a save rejected for roles or skills
    // the user never entered.
    //
    // Skills are cut to what the prompt asked for, not to what the save
    // tolerates. A resume can print sixty; the prompt asks for the twenty most
    // relevant, and a model that ignores it must not be allowed to hand the
    // user a list that TagInput can only prune one chip at a time. Industries
    // keep the wider cap — a resume implies a handful at most, so there is no
    // flood to guard against.
    skills: (parsed.skills ?? []).slice(0, MAX_EXTRACTED_SKILLS),
    industries: (parsed.industries ?? []).slice(0, MAX_TAGS),
    work_experience: (parsed.work_experience ?? [])
      .slice(0, MAX_WORK_EXPERIENCE)
      .map(normalizeRole),
    education: education
      ? {
          degree: education.degree ?? "",
          field: education.field ?? "",
          institution: education.institution ?? "",
          graduationYear: education.graduationYear ?? 0,
        }
      : null,
    linkedin_url: parsed.linkedin_url ?? null,
    portfolio_url: parsed.portfolio_url ?? null,
  };
}

// A union rather than { success, error }: the route maps each outcome to its
// own status code and its own sentence, and user-facing copy belongs to the
// layer that talks to the user. ProfileReadResult in lib/insforge-server.ts is
// the same shape for the same reason.
export type ExtractionOutcome =
  | { status: "extracted"; extraction: ProfileExtraction }
  | { status: "empty" }
  | { status: "no-resume" }
  | { status: "rate-limited" }
  | { status: "error" };

export async function extractProfileFromResume(
  userId: string,
): Promise<ExtractionOutcome> {
  try {
    const insforge = await createInsforgeServer();
    const { data: blob, error: downloadError } = await insforge.storage
      .from(RESUME_BUCKET)
      .download(resumeObjectKey(userId));

    if (downloadError || !blob) {
      console.error(
        "[lib/resume-extraction]",
        downloadError?.message ?? "no resume object for this user",
      );
      return { status: "no-resume" };
    }

    const bytes = Buffer.from(await blob.arrayBuffer());

    if (bytes.byteLength === 0) {
      console.error("[lib/resume-extraction]", "stored resume is empty");
      return { status: "no-resume" };
    }

    // The upload route already caps this. Repeated because the object could
    // predate the cap, and base64ing an oversized PDF into a request body is a
    // worse failure than refusing it.
    if (bytes.byteLength > MAX_RESUME_BYTES) {
      console.error(
        "[lib/resume-extraction]",
        "stored resume exceeds the size cap",
      );
      return { status: "error" };
    }

    const interaction = await getGemini().interactions.create({
      model: GEMINI_MODEL,
      system_instruction: SYSTEM_INSTRUCTION,
      input: [
        { type: "text", text: USER_PROMPT },
        {
          type: "document",
          data: bytes.toString("base64"),
          mime_type: "application/pdf",
        },
      ],
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: EXTRACTION_JSON_SCHEMA,
      },
      generation_config: {
        seed: EXTRACTION_SEED,
        max_output_tokens: MAX_OUTPUT_TOKENS,
        thinking_level: THINKING_LEVEL,
      },
    });

    // output_text is optional on the response type — a blocked or truncated
    // interaction returns none, and JSON.parse(undefined) throws.
    if (!interaction.output_text) {
      console.error("[lib/resume-extraction]", "interaction returned no text");
      return { status: "error" };
    }

    const parsed = geminiExtractionSchema.safeParse(
      JSON.parse(interaction.output_text),
    );

    if (!parsed.success) {
      console.error("[lib/resume-extraction]", parsed.error.issues);
      return { status: "error" };
    }

    const extraction = normalize(parsed.data);

    // Checked after normalising, so a reading whose only content was three
    // unparseable dates is correctly reported as empty rather than as success
    // that changes nothing.
    return isExtractionEmpty(extraction)
      ? { status: "empty" }
      : { status: "extracted", extraction };
  } catch (error) {
    console.error("[lib/resume-extraction]", error);
    return isGeminiRateLimited(error)
      ? { status: "rate-limited" }
      : { status: "error" };
  }
}
