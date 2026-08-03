import Browserbase from "@browserbasehq/sdk";

// Server-only. BROWSERBASE_API_KEY has no NEXT_PUBLIC_ prefix, so this module
// is useless in the browser — agent/ and API routes only.

function getBrowserbaseApiKey(): string {
  const key = process.env.BROWSERBASE_API_KEY;
  if (!key) {
    throw new Error("BROWSERBASE_API_KEY is not set");
  }
  return key;
}

function getBrowserbaseProjectId(): string {
  const id = process.env.BROWSERBASE_PROJECT_ID;
  if (!id) {
    throw new Error("BROWSERBASE_PROJECT_ID is not set");
  }
  return id;
}

let client: Browserbase | undefined;

// Constructed on first call, not at import — same reasoning as getGemini():
// a module-level client would throw during `next build` without the key.
function getBrowserbase(): Browserbase {
  client ??= new Browserbase({ apiKey: getBrowserbaseApiKey() });
  return client;
}

// One session per research run, sequential page visits — the free plan allows a
// single concurrent session, and 120 seconds covers a homepage plus three
// sub-pages. Throws rather than returning an error: the caller in
// agent/research.ts treats any throw as "no browser" and degrades to
// synthesis-only, which is the one response every browser failure maps to.
export async function createResearchSession(): Promise<{ id: string }> {
  const session = await getBrowserbase().sessions.create({
    projectId: getBrowserbaseProjectId(),
    timeout: 120,
  });

  return { id: session.id };
}
