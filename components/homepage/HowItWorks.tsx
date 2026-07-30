import { AgentLogPreview } from "@/components/homepage/AgentLogPreview";
import { FeatureBlock } from "@/components/homepage/FeatureBlock";

const ITEMS = [
  {
    title: "Understand your match score",
    description:
      "See how your profile lines up with each role before you apply. Get a clear breakdown of what fits and what’s missing.",
  },
  {
    title: "AI-powered job matching",
    description:
      "Stop guessing which jobs are worth applying to. JobMax scores every role against your actual skills so you focus on the ones that matter.",
    highlighted: true,
  },
  {
    title: "Focus on the right roles",
    description:
      "Filter out low fit jobs and stay on the ones that actually matter. Spend less time sorting and more time applying.",
  },
];

export function HowItWorks() {
  return (
    <FeatureBlock
      heading="Apply With More Confidence, Every Time"
      items={ITEMS}
      visual={<AgentLogPreview />}
      visualFirst
    />
  );
}
