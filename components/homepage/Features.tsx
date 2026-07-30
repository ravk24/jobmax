import { FeatureBlock } from "@/components/homepage/FeatureBlock";
import { JobsTablePreview } from "@/components/homepage/JobsTablePreview";

const ITEMS = [
  {
    title: "Find jobs that actually fit",
    description:
      "Search by title and location. JobMax pulls matching roles and scores every one against your profile, so you can scan them quickly.",
    highlighted: true,
  },
  {
    title: "Know the company before you apply",
    description:
      "Stop guessing what a company is about. JobMax browses their site and gives you everything you need to apply with confidence.",
  },
  {
    title: "Keep track of every role you find",
    description:
      "Keep a clear view of every job you’ve found, scored, and researched. Your activity and progress all stay in one simple place.",
  },
];

export function Features() {
  return (
    <FeatureBlock
      heading="Manage Your Job Search With Ease"
      items={ITEMS}
      visual={<JobsTablePreview />}
    />
  );
}
