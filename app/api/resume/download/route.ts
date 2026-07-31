import { NextResponse } from "next/server";

import { createInsforgeServer, getCurrentUser } from "@/lib/insforge-server";
import { RESUME_BUCKET, resumeObjectKey } from "@/lib/profile";

const DOWNLOAD_FILENAME = "resume.pdf";

// The only way the browser gets the resume bytes.
//
// The `resumes` bucket is private and the session lives in httpOnly cookies on
// our own origin (client_type=server), so the browser holds no InsForge
// credentials and can never address storage itself. This route is the exchange:
// the request arrives with our session cookie, the route proves who is asking,
// and the object is read with a server client that is authorised for it. The
// object key is derived from the session — never from a query parameter — so
// there is no path a caller can supply and no other user's resume to ask for.
//
// GET rather than POST: it is a read with no side effects, and it has to be
// reachable from an <a download> so the browser handles the file rather than
// JavaScript juggling a blob URL.
export async function GET() {
  try {
    // proxy.ts matches /api/resume/:path*, so the access token is refreshed
    // before this runs. The proxy refreshes, it does not authorise.
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "You are not signed in." },
        { status: 401 },
      );
    }

    const insforge = await createInsforgeServer();
    const { data: blob, error } = await insforge.storage
      .from(RESUME_BUCKET)
      .download(resumeObjectKey(user.id));

    if (error || !blob) {
      console.error(
        "[api/resume/download]",
        error?.message ?? "no resume object for this user",
      );
      // Plain text, not the usual JSON envelope. This route is reached by
      // navigation rather than by fetch(), so there is no caller to parse a
      // body — whatever comes back is shown to a person. A sentence reads as an
      // explanation; {"success":false,…} reads as the site being broken.
      return new NextResponse(
        "No resume found to download. Upload or generate one first.",
        { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } },
      );
    }

    // Content-Disposition attachment is what makes this a download rather than a
    // navigation — without it the browser renders the PDF in place and the
    // <a download> attribute alone will not override it for a cross-document
    // response.
    return new NextResponse(blob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${DOWNLOAD_FILENAME}"`,
        "Content-Length": String(blob.size),
        // The object behind this URL changes whenever the user uploads or
        // generates, and the URL never does. A cached copy would hand them the
        // resume they just replaced.
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[api/resume/download]", error);
    return NextResponse.json(
      { success: false, error: "Could not download your resume." },
      { status: 500 },
    );
  }
}
