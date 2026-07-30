"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, UploadCloud } from "lucide-react";

import { MAX_RESUME_BYTES } from "@/lib/profile";
import { Button } from "@/components/ui/button";

const MAX_RESUME_MB = Math.round(MAX_RESUME_BYTES / (1024 * 1024));

type Props = {
  resumeUrl: string | null;
  // Signed, time-limited and credential-free — the private-bucket object URL in
  // resumeUrl cannot be opened in a tab. Minted per render by the page.
  resumeHref: string | null;
};

export function ResumeUpload({ resumeUrl, resumeHref }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedName, setUploadedName] = useState<string | null>(null);

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

  const currentResume = uploadedName ?? (resumeUrl ? "resume.pdf" : null);

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
          if (!isUploading) inputRef.current?.click();
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDraggingOver(false);
          if (isUploading) return;
          const file = event.dataTransfer.files[0];
          if (file) void upload(file);
        }}
        className={`mt-5 flex flex-col items-center rounded-xl border border-dashed px-6 py-10 text-center transition-colors ${
          isUploading ? "cursor-default" : "cursor-pointer"
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

        <div className="mt-4">
          <Button
            type="button"
            variant="outline"
            disabled={isUploading}
            // The surrounding surface opens the picker as well; without this the
            // click reaches both handlers.
            onClick={(event) => {
              event.stopPropagation();
              inputRef.current?.click();
            }}
          >
            {isUploading ? "Uploading…" : "Select Resume"}
          </Button>
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
