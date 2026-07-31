import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/insforge-server";
import { generateResumeFromProfile } from "@/lib/resume-generation";

// No request body: the resume is built from the saved profile row belonging to
// this session's user, so there is nothing to parameterise. Unsaved edits in the
// open form are deliberately not in it — the confirm copy in ResumeUpload says
// so, since a page cannot read what a client is holding.
//
// Unlike /api/resume/extract this one writes: it replaces the stored resume
// object and updates resume_pdf_url, so it revalidates.
export async function POST() {
  try {
    // proxy.ts matches /api/resume/:path*, so this route inherits token refresh.
    // The proxy refreshes, it does not authorise — the route still asks who is
    // calling.
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "You are not signed in." },
        { status: 401 },
      );
    }

    const result = await generateResumeFromProfile(user);

    switch (result.status) {
      case "generated":
        revalidatePath("/profile");
        return NextResponse.json({
          success: true,
          data: {
            polished: result.polished,
            // Two successes, told apart. A resume carrying the user's own
            // wording is still a real document worth delivering, but it is less
            // than the button promised and it has already overwritten what they
            // had — so it says which one they got rather than letting them find
            // out by reading it.
            message: result.polished
              ? "Resume generated. Open it from the link above to review it."
              : "Resume generated, but the AI polish was unavailable — the wording is your own. Try again in a moment for a rewritten version.",
          },
        });

      case "no-profile":
        return NextResponse.json(
          { success: false, error: "Save your profile before generating a resume." },
          { status: 404 },
        );

      // 422 rather than 400: the request was well formed, the profile behind it
      // was not usable. Worth telling apart in the logs.
      case "incomplete":
        return NextResponse.json(
          {
            success: false,
            error:
              "Add your name and at least one role or your skills before generating.",
          },
          { status: 422 },
        );

      case "rate-limited":
        return NextResponse.json(
          {
            success: false,
            error: "Generation is busy right now. Try again in a moment.",
          },
          { status: 429 },
        );

      case "error":
        return NextResponse.json(
          {
            success: false,
            // "Could not generate" alone reads as "nothing happened", which is
            // a lie when the previous object was already removed. Generation
            // replaces a file the user may have no other copy of.
            error: result.previousResumeRemoved
              ? "Could not generate your resume, and your previous one has been removed. Upload a file or try generating again."
              : "Could not generate your resume.",
          },
          { status: 500 },
        );
    }
  } catch (error) {
    console.error("[api/resume/generate]", error);
    return NextResponse.json(
      { success: false, error: "Could not generate your resume." },
      { status: 500 },
    );
  }
}
