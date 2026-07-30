import Image from "next/image";
import { Lock } from "lucide-react";

export function DashboardPreview() {
  return (
    <section className="border-b border-border bg-surface-muted">
      <div className="mx-auto max-w-[1440px] px-4 pt-12 sm:px-6">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-t-xl border border-b-0 border-border bg-surface shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
          <div className="flex items-center gap-3 border-b border-border bg-surface-secondary px-4 py-3">
            <div className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-border-muted" />
              <span className="size-2.5 rounded-full bg-border-muted" />
              <span className="size-2.5 rounded-full bg-border-muted" />
            </div>
            <div className="mx-auto flex items-center gap-1.5 rounded-full bg-surface px-3 py-1">
              <Lock className="size-3 text-text-muted" />
              <span className="text-xs leading-4 text-text-muted">
                jobmax.ai/dashboard
              </span>
            </div>
          </div>

          <div className="max-h-[420px] overflow-hidden">
            <Image
              src="/dashboard.png"
              alt="JobMax dashboard showing job stats, recent activity, and analytics charts"
              width={5760}
              height={4476}
              priority
              className="w-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
