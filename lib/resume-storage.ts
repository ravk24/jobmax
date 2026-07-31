import { createInsforgeServer } from "@/lib/insforge-server";
import { RESUME_BUCKET, resumeObjectKey } from "@/lib/profile";

// Server-only. The single write path for the one active resume per user.
//
// Both callers — POST /api/resume/upload and lib/resume-generation.ts — used to
// carry their own copy of remove/upload/upsert. They are the same three steps
// against the same object and the same column, and the failure handling below is
// the part that is easy to get subtly wrong in one copy and not the other.

type InsforgeServer = Awaited<ReturnType<typeof createInsforgeServer>>;

export type ResumeWriteResult =
  | { status: "written"; url: string }
  // previousResumeRemoved is the difference between "nothing happened, try
  // again" and "your old resume is gone". The caller has to say which, because
  // the second one may mean the user has just lost a file they cannot replace.
  | { status: "error"; previousResumeRemoved: boolean };

// Deleting before uploading is not what makes the replacement work — the SDK
// documents standard PUT semantics, so writing to an existing key replaces the
// object in place. It is done so the stored object never outlives the row that
// points at it.
//
// The cost is real and is the reason for everything below: an atomic overwrite
// becomes two steps, and a failure between them leaves the user with no resume
// at all. Three things close that window rather than pretending it is not there
// — the delete is best-effort, a failed upload afterwards clears
// resume_pdf_url, and the caller is told the old file is gone so it can say so.
export async function replaceStoredResume({
  userId,
  email,
  file,
}: {
  userId: string;
  email: string;
  file: File | Blob;
}): Promise<ResumeWriteResult> {
  // One client for all three calls. Each createInsforgeServer() re-reads cookies
  // and builds a fresh SDK instance.
  const insforge = await createInsforgeServer();
  const key = resumeObjectKey(userId);
  const bucket = insforge.storage.from(RESUME_BUCKET);

  const { error: removeError } = await bucket.remove(key);

  // Not fatal, and deliberately not treated as one. There is nothing to remove
  // on a first upload, and that is the ordinary case rather than a problem — the
  // upload that follows replaces the key either way.
  const previousResumeRemoved = !removeError;

  if (removeError) {
    console.error("[lib/resume-storage]", removeError.message);
  }

  const { data, error: uploadError } = await bucket.upload(key, file);

  if (uploadError || !data) {
    console.error("[lib/resume-storage]", uploadError?.message);

    // The old object really is gone and the new one never arrived, so the URL in
    // the row resolves to nothing. Leaving it would render a resume link that
    // 404s and let extraction and generation read a file that is not there.
    if (previousResumeRemoved) {
      await clearResumeUrl(insforge, userId);
    }

    return { status: "error", previousResumeRemoved };
  }

  const saved = await saveResumeUrl(insforge, userId, email, data.url);

  return saved
    ? { status: "written", url: data.url }
    : // The object is stored but the row does not point at it. Reported as a
      // failure because that is what the user experiences, and *not* as a lost
      // resume: the bytes are there, and the next successful write fixes the row.
      { status: "error", previousResumeRemoved: false };
}

// upsert, not update: someone can upload before ever saving the form, and an
// update against a row that does not exist matches zero rows and drops the URL
// silently. Only these three columns are sent — PostgREST's merge-duplicates
// emits ON CONFLICT DO UPDATE SET for the supplied keys alone, so everything the
// profile form owns survives untouched.
async function saveResumeUrl(
  insforge: InsforgeServer,
  userId: string,
  email: string,
  url: string,
): Promise<boolean> {
  const { error } = await insforge.database
    .from("profiles")
    .upsert({ id: userId, email, resume_pdf_url: url }, { onConflict: "id" });

  if (error) {
    console.error("[lib/resume-storage]", error.message);
    return false;
  }

  return true;
}

// update, not upsert — the exact opposite of the write above, and for the same
// reasoning read backwards. Clearing is only meaningful for a row that already
// holds a URL; matching zero rows is the correct outcome when there is no row,
// not a case to repair. An upsert here would create a profile row for a user who
// has never saved one, purely because their first upload failed.
async function clearResumeUrl(
  insforge: InsforgeServer,
  userId: string,
): Promise<void> {
  const { error } = await insforge.database
    .from("profiles")
    .update({ resume_pdf_url: null })
    .eq("id", userId);

  if (error) {
    console.error("[lib/resume-storage]", error.message);
  }
}
