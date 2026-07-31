import { GoogleGenAI } from "@google/genai";

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
