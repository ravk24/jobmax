import { Stagehand } from "@browserbasehq/stagehand";

import { GEMINI_MODEL, getGeminiApiKey } from "@/lib/gemini";

// Server-only, like lib/browserbase.ts. Stagehand v3: the extraction calls are
// positional — stagehand.extract(instruction, schema, options?) — and the
// active page comes from stagehand.context.activePage(), which can return
// undefined. Verified against the installed 3.7.1 types; architecture.md's
// `stagehand.page` accessor does not exist on this version.

// Stagehand names models with a provider prefix. Derived from GEMINI_MODEL so
// lib/gemini.ts stays the single place the model is pinned — its extract()
// calls spend the same GEMINI_API_KEY quota as our own synthesis call.
const STAGEHAND_MODEL = `google/${GEMINI_MODEL}`;

// Attaches to an existing Browserbase session (created by createResearchSession
// in lib/browserbase.ts) rather than letting Stagehand create its own, so the
// session id is known and loggable before the browser does anything. Throws on
// failure — the caller degrades to synthesis-only, same contract as session
// creation.
export async function createStagehand(sessionId: string): Promise<Stagehand> {
  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    apiKey: process.env.BROWSERBASE_API_KEY,
    projectId: process.env.BROWSERBASE_PROJECT_ID,
    browserbaseSessionID: sessionId,
    model: {
      modelName: STAGEHAND_MODEL,
      apiKey: getGeminiApiKey(),
    },
    // Pino's worker-thread transport does not survive the Next.js server
    // runtime; without this the process can hang on close.
    disablePino: true,
  });

  await stagehand.init();
  return stagehand;
}
