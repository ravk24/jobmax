import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { createInsforgeServer, getCurrentUser } from "@/lib/insforge-server";
import { MAX_RESUME_BYTES } from "@/lib/profile";

const RESUME_FIELD = "resume";
const RESUME_BUCKET = "resumes";

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

    const insforge = await createInsforgeServer();

    // Two arguments only — there is no options object. Uploading to an existing
    // key replaces the object in place, which is the upsert behaviour we want
    // for the one active resume per user.
    const { data, error: uploadError } = await insforge.storage
      .from(RESUME_BUCKET)
      .upload(`${user.id}/resume.pdf`, file);

    if (uploadError || !data) {
      console.error("[api/resume/upload]", uploadError?.message);
      return NextResponse.json(
        { success: false, error: "Could not upload your resume." },
        { status: 500 },
      );
    }

    // upsert, not update: someone can upload before ever saving the form, and
    // an update against a row that does not exist matches nothing and drops the
    // URL silently. getPublicUrl() is wrong here — the bucket is private, so
    // the upload response's own url is the one that resolves.
    const { error: writeError } = await insforge.database
      .from("profiles")
      .upsert(
        { id: user.id, email: user.email, resume_pdf_url: data.url },
        { onConflict: "id" },
      );

    if (writeError) {
      console.error("[api/resume/upload]", writeError.message);
      return NextResponse.json(
        { success: false, error: "Could not save your resume." },
        { status: 500 },
      );
    }

    revalidatePath("/profile");

    return NextResponse.json({ success: true, data: { url: data.url } });
  } catch (error) {
    console.error("[api/resume/upload]", error);
    return NextResponse.json(
      { success: false, error: "Could not upload your resume." },
      { status: 500 },
    );
  }
}
