import { ApiError, GoogleGenAI } from "@google/genai";
import { z } from "zod";

// Server-only. GEMINI_API_KEY deliberately has no NEXT_PUBLIC_ prefix, so this
// module is useless in the browser — importing it from a Client Component
// ships a client that can never authenticate. API routes and agent/ only.

// Pinned in one place. Every call site reads this rather than naming a model,
// so switching costs one edit instead of four.
export const GEMINI_MODEL = "gemini-3.6-flash";

export function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  return key;
}

let client: GoogleGenAI | undefined;

// Constructed on first call, not at import. A module-level client would throw
// during `next build` on any machine without the key.
export function getGemini(): GoogleGenAI {
  client ??= new GoogleGenAI({ apiKey: getGeminiApiKey() });
  return client;
}

// ApiError carries `status`, but the interactions path wraps errors more than
// once and the class does not always survive it. The structural check catches
// the wrapped shape without a type assertion.
const httpErrorShape = z.object({ status: z.number() });

// The free tier is rate-limited per minute and per day, so every call site has
// to tell "try again in a moment" apart from a real failure. Lives here rather
// than beside any one caller — it is a property of the API, not of extraction or
// generation, and a second copy would drift.
export function isGeminiRateLimited(error: unknown): boolean {
  if (error instanceof ApiError) return error.status === 429;
  const parsed = httpErrorShape.safeParse(error);
  return parsed.success && parsed.data.status === 429;
}
