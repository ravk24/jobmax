import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { PostHog } from "posthog-node";

import { discoverJobs } from "@/agent/adzuna";
import { getCurrentUser } from "@/lib/insforge-server";
import { createPostHogServer } from "@/lib/posthog-server";

// The one route that triggers job discovery. architecture.md: Server Actions
// never call agent functions — agent functions are only called from API routes.

// Long enough for a real search phrase, short enough that nobody is posting a
// document into the `what` parameter.
const MAX_SEARCH_TEXT = 120;

const searchRequestSchema = z.object({
  jobTitle: z.string().min(1).max(MAX_SEARCH_TEXT),
  // Optional by design: library-docs.md says never send an empty `where` to
  // Adzuna, so a blank location means a country-wide search rather than an
  // error. The client no longer requires it either.
  location: z.string().max(MAX_SEARCH_TEXT).nullish(),
});

type SearchAnalytics = {
  capture(event: string, properties: Record<string, unknown>): void;
  shutdown(): Promise<void>;
};

// Analytics must never fail the search it is measuring — including the throw
// from createPostHogServer() when the key is unset — so every entry point
// swallows its own errors, as captureProfileCompleted in actions/profile.ts
// does. A missing client degrades to a no-op rather than to a 500.
//
// One client spanning the whole request rather than one per event: with
// flushAt: 1 each capture is sent as it happens, so job_search_started leaves
// before the work starts and still shares a single shutdown with the job_found
// events that follow it.
function openSearchAnalytics(userId: string): SearchAnalytics {
  let client: PostHog | null = null;

  try {
    client = createPostHogServer();
  } catch (error) {
    console.error("[api/agent/find]", error);
  }

  return {
    capture(event, properties) {
      if (!client) return;
      try {
        client.capture({ distinctId: userId, event, properties });
      } catch (error) {
        console.error("[api/agent/find]", error);
      }
    },
    async shutdown() {
      if (!client) return;
      try {
        await client.shutdown();
      } catch (error) {
        console.error("[api/agent/find]", error);
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

    const body = searchRequestSchema.safeParse(await req.json());

    if (!body.success) {
      return NextResponse.json(
        { success: false, error: "Enter a job title to search." },
        { status: 400 },
      );
    }

    const jobTitle = body.data.jobTitle.trim();
    const location = (body.data.location ?? "").trim();

    if (!jobTitle) {
      return NextResponse.json(
        { success: false, error: "Enter a job title to search." },
        { status: 400 },
      );
    }

    const analytics = openSearchAnalytics(user.id);

    // Fired before the work, not after it. The event is the denominator of the
    // search funnel: firing it only on success makes the failure rate
    // unmeasurable, and it is the one signal that would show an expired Adzuna
    // key as a cliff rather than as silence. Firing it after a 4-14 second
    // round trip would also stamp it at completion, so any duration derived
    // from it would be wrong.
    analytics.capture("job_search_started", {
      userId: user.id,
      jobTitle,
      location,
    });

    try {
      const result = await discoverJobs(user, jobTitle, location);

      switch (result.status) {
        case "completed":
          // After the work, so these carry the scores actually saved rather
          // than the ones we hoped for.
          for (const matchScore of result.scores) {
            analytics.capture("job_found", {
              userId: user.id,
              source: "search",
              matchScore,
            });
          }
          revalidatePath("/find-jobs");
          return NextResponse.json({
            success: true,
            data: {
              found: result.found,
              saved: result.saved,
              strong: result.strong,
              scored: result.scored,
            },
          });

        case "no-profile":
          return NextResponse.json(
            {
              success: false,
              error: "Save your profile before searching for jobs.",
            },
            { status: 404 },
          );

        // 422 rather than 400: the request was well formed, the profile behind
        // it was not usable. Worth telling apart in the logs.
        case "incomplete":
          return NextResponse.json(
            {
              success: false,
              error:
                "Add your skills or a role to your profile before searching — scores are worked out against it.",
            },
            { status: 422 },
          );

        // 502 rather than 500: the failure is upstream at Adzuna, and
        // separating it is what tells a bad key apart from a bug in this route.
        case "search-failed":
          return NextResponse.json(
            {
              success: false,
              error:
                "Job search is unavailable right now. Try again in a moment.",
            },
            { status: 502 },
          );

        case "error":
          return NextResponse.json(
            { success: false, error: "Could not search for jobs." },
            { status: 500 },
          );
      }
    } finally {
      // Required on every path, including the failures — posthog-node drops
      // anything still queued when the function ends without it.
      await analytics.shutdown();
    }
  } catch (error) {
    console.error("[api/agent/find]", error);
    return NextResponse.json(
      { success: false, error: "Could not search for jobs." },
      { status: 500 },
    );
  }
}
