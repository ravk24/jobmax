import { AuthHighlights } from "@/components/auth/AuthHighlights";
import { JobsTablePreview } from "@/components/homepage/JobsTablePreview";

export function AuthShowcase() {
  return (
    <section className="aurora hidden border-l border-border lg:flex lg:flex-col lg:justify-center lg:px-12 lg:py-12 xl:px-16">
      <div className="mx-auto w-full max-w-md">
        <h2 className="text-2xl leading-tight font-bold tracking-tight text-text-primary xl:text-3xl xl:leading-[1.2]">
          Job hunting is hard.
          <br />
          Your tools shouldn&rsquo;t be.
        </h2>

        <p className="mt-4 text-sm leading-6 text-text-dark">
          Set up your profile once. JobMax finds the jobs, scores them against
          your actual skills, and researches every company for you.
        </p>

        <div className="mt-8">
          <JobsTablePreview />
        </div>

        <div className="mt-8">
          <AuthHighlights />
        </div>
      </div>
    </section>
  );
}
