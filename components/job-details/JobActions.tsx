import { Button } from "@/components/ui/button";

import type { JobDetail } from "@/lib/jobs";

type Props = {
  company: JobDetail["company"];
  applyUrl: JobDetail["external_apply_url"];
};

// The external listing is the only apply path this project has — project-overview
// puts auto-apply and form filling explicitly out of scope, and the invariant in
// AGENTS.md is that Easy Apply is never touched.
export function JobActions({ company, applyUrl }: Props) {
  if (!applyUrl) {
    return (
      <Button type="button" size="xl" className="w-full" disabled>
        No apply link available
      </Button>
    );
  }

  return (
    <Button asChild size="xl" className="w-full">
      <a href={applyUrl} target="_blank" rel="noopener noreferrer">
        Apply Now at {company}
      </a>
    </Button>
  );
}
