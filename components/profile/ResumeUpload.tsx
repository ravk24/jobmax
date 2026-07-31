"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, UploadCloud } from "lucide-react";

import { MAX_RESUME_BYTES } from "@/lib/profile";
import { Button } from "@/components/ui/button";
import type { ProfileExtraction } from "@/types";

const MAX_RESUME_MB = Math.round(MAX_RESUME_BYTES / (1024 * 1024));

type ExtractStatus = { kind: "success" | "error"; message: string };

type ExtractResponse = {
  success: boolean;
  data?: ProfileExtraction;
  error?: string;
};

type Props = {
  resumeUrl: string | null;
  // Signed, time-limited and credential-free — the private-bucket object URL in
  // resumeUrl cannot be opened in a tab. Minted per render by the page.
  resumeHref: string | null;
  // Handed up to ProfileEditor, which passes it to the form. This component
  // never sees the fields it fills.
  onExtracted: (extraction: ProfileExtraction) => void;
};

export function ResumeUpload({ resumeUrl, resumeHref, onExtracted }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedName, setUploadedName] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractStatus, setExtractStatus] = useState<ExtractStatus | null>(null);

  // The route re-checks both of these. Doing it here as well means the common
  // mistakes never spend 5MB of upload before being rejected.
  const upload = async (file: File) => {
    setError(null);

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
        return;
      }

      setUploadedName(file.name);
      // revalidatePath in the route invalidates the cache but does not re-render
      // the page that is already open — without this the new resume has no
      // signed link until a manual reload.
      router.refresh();
    } catch (caught) {
      console.error("[components/profile/ResumeUpload]", caught);
      setError("Could not upload your resume.");
    } finally {
      setIsUploading(false);
    }
  };

  // No body: the route reads the resume already stored for this session's user.
  const extract = async () => {
    setExtractStatus(null);
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

  const currentResume = uploadedName ?? (resumeUrl ? "resume.pdf" : null);
  const isBusy = isUploading || isExtracting;

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

          {/* Keyed off the resume itself, not off resumeHref — that is null
              whenever the signed URL fails to mint, even though the object is
              there and perfectly readable. */}
          {currentResume ? (
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
            {resumeHref ? (
              <a
                href={resumeHref}
                target="_blank"
                rel="noopener noreferrer"
                // Opening the resume must not also open the file picker.
                onClick={(event) => event.stopPropagation()}
                className="font-medium text-accent underline-offset-2 transition-colors hover:text-accent-dark hover:underline"
              >
                {currentResume}
              </a>
            ) : (
              currentResume
            )}
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
        <p className="text-sm leading-5 text-text-secondary">
          Need a fresh document based on the fields below?
        </p>
        {/* Generation lands in Feature 08 — inert today. */}
        <Button type="button">
          <FileText className="size-4" />
          Generate Resume from Profile
        </Button>
      </div>
    </section>
  );
}
