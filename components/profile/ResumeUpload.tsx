import { FileText, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ResumeUpload() {
  return (
    <section className="rounded-2xl border border-border bg-surface p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
      <h2 className="text-base leading-6 font-semibold text-text-primary">
        Resume
      </h2>
      <p className="mt-1 text-sm leading-5 text-text-secondary">
        Upload an existing resume to auto-fill the profile, or generate a new
        tailored one from your details below.
      </p>

      <div className="mt-5 flex flex-col items-center rounded-xl border border-dashed border-border-muted bg-surface px-6 py-10 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-accent-muted">
          <UploadCloud className="size-5 text-accent" />
        </span>

        <p className="mt-4 text-sm leading-5 font-semibold text-text-primary">
          Click to upload or drag and drop
        </p>
        <p className="mt-1 text-xs leading-4 text-text-muted">
          PDF formatting only. Maximum file size 5MB.
        </p>

        <div className="mt-4">
          <Button type="button" variant="outline">
            Select Resume
          </Button>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-5 text-text-secondary">
          Need a fresh document based on the fields below?
        </p>
        <Button type="button">
          <FileText className="size-4" />
          Generate Resume from Profile
        </Button>
      </div>
    </section>
  );
}
