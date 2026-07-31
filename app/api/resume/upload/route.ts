import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/insforge-server";
import { MAX_RESUME_BYTES } from "@/lib/profile";
import { replaceStoredResume } from "@/lib/resume-storage";

const RESUME_FIELD = "resume";

// The file rides an API route rather than the Server Action that saves the
// form: Server Action request bodies are capped at 1MB by default and the
// resume card advertises 5MB. Route handlers carry no such cap.
export async function POST(req: NextRequest) {
  try {
    // proxy.ts matches only /dashboard, /profile and /find-jobs, so this route
    // is reachable without a session unless it checks for itself.
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "You are not signed in." },
        { status: 401 },
      );
    }

    const formData = await req.formData();
    const file = formData.get(RESUME_FIELD);

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { success: false, error: "No resume file was received." },
        { status: 400 },
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { success: false, error: "Only PDF files can be uploaded." },
        { status: 400 },
      );
    }

    if (file.size > MAX_RESUME_BYTES) {
      return NextResponse.json(
        { success: false, error: "That file is larger than 5MB." },
        { status: 400 },
      );
    }

    // Removes the previous object, uploads this one, and writes
    // resume_pdf_url — shared with generation so the two writers cannot drift.
    const result = await replaceStoredResume({
      userId: user.id,
      email: user.email,
      file,
    });

    if (result.status === "error") {
      return NextResponse.json(
        {
          success: false,
          // "Could not upload" alone reads as "nothing happened", which is a lie
          // when the previous object was already removed — the user may have
          // just lost a file they cannot replace, and needs to know now rather
          // than the next time they look for it.
          error: result.previousResumeRemoved
            ? "Could not upload your resume, and your previous one has been removed. Please upload a file again."
            : "Could not upload your resume.",
        },
        { status: 500 },
      );
    }

    revalidatePath("/profile");

    return NextResponse.json({ success: true, data: { url: result.url } });
  } catch (error) {
    console.error("[api/resume/upload]", error);
    return NextResponse.json(
      { success: false, error: "Could not upload your resume." },
      { status: 500 },
    );
  }
}
