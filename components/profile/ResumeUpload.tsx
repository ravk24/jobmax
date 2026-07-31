"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, UploadCloud } from "lucide-react";

import { MAX_RESUME_BYTES } from "@/lib/profile";
import { Button } from "@/components/ui/button";
import type { ProfileExtraction } from "@/types";

const MAX_RESUME_MB = Math.round(MAX_RESUME_BYTES / (1024 * 1024));

type StatusLine = { kind: "success" | "error"; message: string };

type ExtractResponse = {
  success: boolean;
  data?: ProfileExtraction;
  error?: string;
};

type GenerateResponse = {
  success: boolean;
  data?: { polished: boolean; message: string };
  error?: string;
};

// The bytes only ever come through this route. The resumes bucket is private and
// the session is httpOnly on our own origin, so the browser cannot address
// InsForge storage itself; the route re-reads the session and streams the object
// back. A plain <a> is deliberate — the cookie rides along automatically, and
// code-standards.md forbids a Client Component from fetch()ing a read.
const DOWNLOAD_ROUTE = "/api/resume/download";

type Props = {
  resumeUrl: string | null;
  // Handed up to ProfileEditor, which passes it to the form. This component
  // never sees the fields it fills.
  onExtracted: (extraction: ProfileExtraction) => void;
};

export function ResumeUpload({ resumeUrl, onExtracted }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedName, setUploadedName] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractStatus, setExtractStatus] = useState<StatusLine | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConfirmingGenerate, setIsConfirmingGenerate] = useState(false);
  const [generateStatus, setGenerateStatus] = useState<StatusLine | null>(null);

  // The route re-checks both of these. Doing it here as well means the common
  // mistakes never spend 5MB of upload before being rejected.
  const upload = async (file: File) => {
    setError(null);
    // An armed Generate is a promise about a specific stored file. Swapping that
    // file out from under it would leave the warning describing something that
    // is no longer true.
    setIsConfirmingGenerate(false);

    if (file.type !== "application/pdf") {
      setError("Only PDF files can be uploaded.");
      return;
    }

    if (file.size > MAX_RESUME_BYTES) {
      setError(`That file is larger than ${MAX_RESUME_MB}MB.`);
      return;
    }

    setIsUploading(true);

    try {
      const body = new FormData();
      body.append("resume", file);

      const response = await fetch("/api/resume/upload", {
        method: "POST",
        body,
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error ?? "Could not upload your resume.");
        // The name in state describes a file that is either replaced or gone.
        // Either way it is no longer what storage holds.
        setUploadedName(null);
        return;
      }

      setUploadedName(file.name);
    } catch (caught) {
      console.error("[components/profile/ResumeUpload]", caught);
      setError("Could not upload your resume.");
    } finally {
      setIsUploading(false);
      // Unconditionally, including on failure. revalidatePath() in the route
      // invalidates the cache but does not re-render a page that is already
      // open, so without this the card keeps rendering whatever it was handed
      // at mount. That matters most on the failure path: a replacement that
      // deleted the old object and then failed leaves resume_pdf_url null on
      // the server, and a stale prop would keep offering Download and Extract
      // for a file that no longer exists.
      router.refresh();
    }
  };

  // No body: the route reads the resume already stored for this session's user.
  const extract = async () => {
    setExtractStatus(null);
    setIsConfirmingGenerate(false);
    setIsExtracting(true);

    try {
      const response = await fetch("/api/resume/extract", { method: "POST" });
      const result: ExtractResponse = await response.json();

      if (!response.ok || !result.success || !result.data) {
        setExtractStatus({
          kind: "error",
          message: result.error ?? "Could not read your resume.",
        });
        return;
      }

      // A fresh object every time, which is what lets the form tell a second
      // extraction apart from the first.
      onExtracted(result.data);
      setExtractStatus({
        kind: "success",
        message: "Resume read. Review the fields below, then save.",
      });
    } catch (caught) {
      console.error("[components/profile/ResumeUpload]", caught);
      setExtractStatus({ kind: "error", message: "Could not read your resume." });
    } finally {
      setIsExtracting(false);
    }
  };

  // Generation replaces the stored object at {user_id}/resume.pdf — the same key
  // an uploaded resume occupies — so the first click only arms the button. The
  // project has no dialog component and this does not warrant introducing one:
  // a destructive action that announces itself in place is as clear as a modal
  // and costs no dependency.
  const generate = async () => {
    if (!isConfirmingGenerate) {
      setGenerateStatus(null);
      setIsConfirmingGenerate(true);
      return;
    }

    setIsConfirmingGenerate(false);
    setGenerateStatus(null);
    setIsGenerating(true);

    try {
      const response = await fetch("/api/resume/generate", { method: "POST" });
      const result: GenerateResponse = await response.json();

      if (!response.ok || !result.success || !result.data) {
        setGenerateStatus({
          kind: "error",
          message: result.error ?? "Could not generate your resume.",
        });
        return;
      }

      // "plain" is a success that delivered less than the button promised, so it
      // is not dressed as one.
      setGenerateStatus({
        kind: result.data.polished ? "success" : "error",
        message: result.data.message,
      });
      // The generated PDF is now the stored resume, so the uploaded filename in
      // client state describes a file that has been replaced.
      setUploadedName(null);
    } catch (caught) {
      console.error("[components/profile/ResumeUpload]", caught);
      setGenerateStatus({
        kind: "error",
        message: "Could not generate your resume.",
      });
    } finally {
      setIsGenerating(false);
      // Unconditionally — same reasoning as upload(). A generation that removed
      // the old object and then failed has already nulled resume_pdf_url on the
      // server, and the card must stop advertising a file that is gone.
      router.refresh();
    }
  };

  // resumeUrl is the server's answer and the only thing that decides whether a
  // resume exists; uploadedName only makes the label nicer than the storage key.
  // The order used to be reversed, which meant a stale filename from an earlier
  // successful upload kept Extract and Download on screen after a later upload
  // deleted the object and failed to replace it — a refresh could not correct it
  // because client state was outranking the server.
  const currentResume = resumeUrl ? (uploadedName ?? "resume.pdf") : null;
  const isBusy = isUploading || isExtracting || isGenerating;

  return (
    <section className="rounded-2xl border border-border bg-surface p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
      <h2 className="text-base leading-6 font-semibold text-text-primary">
        Resume
      </h2>
      <p className="mt-1 text-sm leading-5 text-text-secondary">
        Upload an existing resume to auto-fill the profile, or generate a new
        tailored one from your details below.
      </p>

      {/* The whole surface opens the picker, because the copy inside promises
          it does. No role or tabIndex: the Select Resume button below is the
          real control and already serves keyboard and screen reader users —
          making this a second focusable button would nest one inside the
          other. This is a mouse affordance only. */}
      <div
        onClick={() => {
          if (!isBusy) inputRef.current?.click();
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDraggingOver(false);
          // Also blocked while extracting — a drop mid-read would replace the
          // very file the model is looking at.
          if (isBusy) return;
          const file = event.dataTransfer.files[0];
          if (file) void upload(file);
        }}
        className={`mt-5 flex flex-col items-center rounded-xl border border-dashed px-6 py-10 text-center transition-colors ${
          isBusy ? "cursor-default" : "cursor-pointer"
        } ${
          isDraggingOver
            ? "border-accent bg-accent-muted"
            : "border-border-muted bg-surface"
        }`}
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-accent-muted">
          <UploadCloud className="size-5 text-accent" />
        </span>

        <p className="mt-4 text-sm leading-5 font-semibold text-text-primary">
          Click to upload or drag and drop
        </p>
        <p className="mt-1 text-xs leading-4 text-text-muted">
          PDF formatting only. Maximum file size {MAX_RESUME_MB}MB.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
            // Lets the same file be chosen twice in a row after a failure.
            event.target.value = "";
          }}
        />

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={isBusy}
            // The surrounding surface opens the picker as well; without this the
            // click reaches both handlers.
            onClick={(event) => {
              event.stopPropagation();
              inputRef.current?.click();
            }}
          >
            {isUploading ? "Uploading…" : "Select Resume"}
          </Button>

          {/* Both keyed off the resume itself. There is nothing to extract from
              and nothing to download until one exists. */}
          {currentResume ? (
            <>
              <Button
                type="button"
                // Outline, not accent. The card's one primary is Generate Resume
                // from Profile, which comes from the design mock; this button
                // does not, so it sits beside Select Resume rather than
                // out-ranking a decision the mock already made.
                variant="outline"
                disabled={isBusy}
                onClick={(event) => {
                  event.stopPropagation();
                  void extract();
                }}
              >
                {isExtracting ? "Extracting…" : "Extract from Resume"}
              </Button>

              {/* An anchor, not a fetch. The session cookie rides along on a
                  same-origin navigation, so the request is authenticated
                  without a line of JavaScript — and code-standards.md reserves
                  client-side fetch() for mutations, which a download is not.
                  asChild keeps it visually identical to the buttons beside it
                  while staying a real link.

                  Swapped for a genuinely disabled <button> while busy rather
                  than a link dressed to look disabled. Uploading and generating
                  both remove the stored object before writing the new one, so
                  for the length of either there is nothing at the other end of
                  this href — and an anchor has no disabled attribute to lean
                  on. Two elements is more honest than pointer-events-none. */}
              {isBusy ? (
                <Button type="button" variant="outline" disabled>
                  <Download className="size-4" />
                  Download
                </Button>
              ) : (
                <Button asChild variant="outline">
                  <a
                    href={DOWNLOAD_ROUTE}
                    download
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Download className="size-4" />
                    Download
                  </a>
                </Button>
              )}
            </>
          ) : null}
        </div>

        {error ? (
          <p role="status" className="mt-3 text-sm leading-5 text-error">
            {error}
          </p>
        ) : currentResume ? (
          <p
            role="status"
            className="mt-3 flex items-center gap-1.5 text-sm leading-5 text-text-secondary"
          >
            <FileText className="size-4 shrink-0 text-success-dark" />
            {/* Plain text since the Download button landed. It used to be an
                accent link to a freshly minted signed URL, which was a second
                way to reach the same bytes, styled as the more prominent one
                while reading as a filename rather than an action. */}
            {currentResume}
          </p>
        ) : null}
      </div>

      {/* Outside the dropzone, and separate from the upload status above. Two
          independent controls need two independent lines — folded together, an
          upload error would hide the extraction result, and the message would
          sit inside a surface that opens the file picker when clicked. */}
      {extractStatus ? (
        <p
          role="status"
          className={`mt-3 text-sm leading-5 ${
            extractStatus.kind === "success" ? "text-success-dark" : "text-error"
          }`}
        >
          {extractStatus.message}
        </p>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        {/* The copy carries the warning, not the button. Two things the user
            cannot otherwise know: this overwrites the resume already in
            storage, and it builds from the last saved profile rather than
            whatever is typed in the form below. */}
        <p className="text-sm leading-5 text-text-secondary">
          {isConfirmingGenerate
            ? "This replaces your current resume, and uses your last saved profile — not unsaved edits below."
            : "Need a fresh document based on the fields below?"}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          {isConfirmingGenerate ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConfirmingGenerate(false)}
            >
              Cancel
            </Button>
          ) : null}

          <Button type="button" disabled={isBusy} onClick={() => void generate()}>
            {/* No icon in the confirm state — the label is the whole message
                there, and a document icon beside "Replace my resume" reads as
                reassurance the action does not deserve. */}
            {isConfirmingGenerate ? null : <FileText className="size-4" />}
            {isGenerating
              ? "Generating…"
              : isConfirmingGenerate
                ? "Replace my resume"
                : "Generate Resume from Profile"}
          </Button>
        </div>
      </div>

      {/* Third status line on this card, and the third control with one. Folding
          it into either of the others would let an upload error hide a
          generation result. */}
      {generateStatus ? (
        <p
          role="status"
          className={`mt-3 text-sm leading-5 ${
            generateStatus.kind === "success" ? "text-success-dark" : "text-error"
          }`}
        >
          {generateStatus.message}
        </p>
      ) : null}
    </section>
  );
}
