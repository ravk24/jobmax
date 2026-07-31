import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/insforge-server";
import { extractProfileFromResume } from "@/lib/resume-extraction";

// No request body: the resume is addressed by the session's user id, so there
// is nothing to parameterise. POST rather than GET because the call is
// expensive and not something a prefetch should ever trigger.
//
// No database write and no revalidatePath. Extraction populates client state
// only — the user reviews it and presses Save Profile, which stays the single
// write path. That is the whole point of the feature.
export async function POST() {
  try {
    // proxy.ts matches /api/resume/:path*, so this route inherits token
    // refresh. That is not an authorisation check — the proxy refreshes, it
    // does not authorise, so the route still asks who is calling.
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "You are not signed in." },
        { status: 401 },
      );
    }

    const result = await extractProfileFromResume(user.id);

    switch (result.status) {
      case "extracted":
        return NextResponse.json({ success: true, data: result.extraction });

      case "no-resume":
        return NextResponse.json(
          { success: false, error: "Upload a resume before extracting." },
          { status: 404 },
        );

      // 422 rather than 400: the request was well formed, the document was not
      // usable. Worth telling apart in the logs.
      case "empty":
        return NextResponse.json(
          {
            success: false,
            error:
              "Could not extract anything from this PDF. Please try a different file.",
          },
          { status: 422 },
        );

      case "rate-limited":
        return NextResponse.json(
          {
            success: false,
            error: "Extraction is busy right now. Try again in a moment.",
          },
          { status: 429 },
        );

      case "error":
        return NextResponse.json(
          { success: false, error: "Could not read your resume." },
          { status: 500 },
        );
    }
  } catch (error) {
    console.error("[api/resume/extract]", error);
    return NextResponse.json(
      { success: false, error: "Could not read your resume." },
      { status: 500 },
    );
  }
}
