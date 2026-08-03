import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { PostHog } from "posthog-node";

import { researchCompany } from "@/agent/research";
import { getCurrentUser } from "@/lib/insforge-server";
import { createPostHogServer } from "@/lib/posthog-server";

// The one route that triggers company research. architecture.md: Server
// Actions never call agent functions — agent functions are only called from
// API routes. This route holds its connection for the whole run (browser plus
// synthesis, roughly one to three minutes): only the browser itself runs on
// Browserbase's infrastructure; every extraction and the synthesis are awaited
// here.

const researchRequestSchema = z.object({
  jobId: z.uuid(),
});

type ResearchAnalytics = {
  capture(event: string, properties: Record<string, unknown>): void;
  shutdown(): Promise<void>;
};

// Same posture as openSearchAnalytics in app/api/agent/find/route.ts:
// analytics must never fail the research it is measuring, so every entry point
// swallows its own errors and a missing key degrades to a no-op.
function openResearchAnalytics(userId: string): ResearchAnalytics {
  let client: PostHog | null = null;

  try {
    client = createPostHogServer();
  } catch (error) {
    console.error("[api/agent/research]", error);
  }

  return {
    capture(event, properties) {
      if (!client) return;
      try {
        client.capture({ distinctId: userId, event, properties });
      } catch (error) {
        console.error("[api/agent/research]", error);
      }
    },
    async shutdown() {
      if (!client) return;
      try {
        await client.shutdown();
      } catch (error) {
        console.error("[api/agent/research]", error);
      }
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    // proxy.ts matches /api/agent/:path*, so this route inherits token refresh.
    // The proxy refreshes, it does not authorise — the route still asks who is
    // calling.
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "You are not signed in." },
        { status: 401 },
      );
    }

    const body = researchRequestSchema.safeParse(await req.json());

    if (!body.success) {
      return NextResponse.json(
        { success: false, error: "Could not tell which job to research." },
        { status: 400 },
      );
    }

    const analytics = openResearchAnalytics(user.id);

    try {
      const result = await researchCompany(user, body.data.jobId);

      switch (result.status) {
        case "completed":
          // After the work, unlike job_search_started: this event means "a
          // dossier was generated", per the table in code-standards.md, and it
          // powers the dashboard's research-activity chart.
          analytics.capture("company_researched", {
            userId: user.id,
            jobId: body.data.jobId,
            company: result.company,
          });
          revalidatePath(`/find-jobs/${body.data.jobId}`);
          return NextResponse.json({
            success: true,
            data: { browsed: result.browsed },
          });

        case "not-found":
          return NextResponse.json(
            { success: false, error: "That job is no longer in your list." },
            { status: 404 },
          );

        case "no-profile":
          return NextResponse.json(
            {
              success: false,
              error:
                "Save your profile first — the dossier is written for you.",
            },
            { status: 404 },
          );

        case "rate-limited":
          return NextResponse.json(
            {
              success: false,
              error: "Research is busy right now. Try again in a moment.",
            },
            { status: 429 },
          );

        case "error":
          return NextResponse.json(
            { success: false, error: "Could not research this company." },
            { status: 500 },
          );
      }
    } finally {
      // Required on every path — posthog-node drops anything still queued when
      // the function ends without it.
      await analytics.shutdown();
    }
  } catch (error) {
    console.error("[api/agent/research]", error);
    return NextResponse.json(
      { success: false, error: "Could not research this company." },
      { status: 500 },
    );
  }
}
