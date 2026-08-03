import { Building2 } from "lucide-react";

import { ResearchButton } from "@/components/job-details/ResearchButton";
import type { CompanyResearch as CompanyResearchData } from "@/types";

const CARD =
  "overflow-hidden rounded-2xl border border-border bg-surface shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]";

const CHIP =
  "inline-flex items-center rounded-full bg-surface-secondary px-2.5 py-1 text-xs leading-4 font-medium text-text-secondary";

type Props = {
  company: string;
  jobId: string;
  research: CompanyResearchData | null;
};

// One shape per dossier field, driven by a config array rather than a component
// per section — code-standards.md is one component per file, and nine section
// components would be eight too many.
type Section =
  | { label: string; kind: "paragraph"; text: string }
  | { label: string; kind: "chips"; items: string[] }
  | { label: string; kind: "bullets"; items: string[]; emphasis?: boolean }
  | { label: string; kind: "links"; items: string[] };

// Every list is model-produced, so it dedupes at render — ui-registry.md:
// Gemini can emit the same string twice, and the string is the React key.
function dedupe(items: string[]): string[] {
  return Array.from(new Set(items));
}

function dossierSections(research: CompanyResearchData): Section[] {
  return [
    {
      label: "Company Overview",
      kind: "paragraph",
      text: research.companyOverview,
    },
    { label: "Tech Stack", kind: "chips", items: dedupe(research.techStack) },
    { label: "Culture", kind: "bullets", items: dedupe(research.culture) },
    { label: "Why This Role", kind: "paragraph", text: research.whyThisRole },
    // The dossier's centrepiece — the items written for this candidate rather
    // than about the company — carries the primary text colour.
    {
      label: "Your Edge",
      kind: "bullets",
      items: dedupe(research.yourEdge),
      emphasis: true,
    },
    {
      label: "Gaps to Address",
      kind: "bullets",
      items: dedupe(research.gapsToAddress),
    },
    {
      label: "Smart Questions",
      kind: "bullets",
      items: dedupe(research.smartQuestions),
    },
    {
      label: "Interview Prep",
      kind: "bullets",
      items: dedupe(research.interviewPrep),
    },
    // Safe to render as hrefs without checks here: sanitized to http(s) at
    // save time in agent/research.ts, and again by jobDetailSchema on read.
    { label: "Sources", kind: "links", items: dedupe(research.sources) },
  ];
}

function isEmpty(section: Section): boolean {
  return section.kind === "paragraph"
    ? section.text.trim() === ""
    : section.items.length === 0;
}

export function CompanyResearch({ company, jobId, research }: Props) {
  return (
    <section className={CARD}>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-6">
        <h2 className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-muted">
            <Building2 className="size-4 text-accent" />
          </span>
          <span className="text-base leading-6 font-semibold text-text-primary">
            Company Research
          </span>
        </h2>

        <ResearchButton jobId={jobId} hasResearch={research !== null} />
      </div>

      {research === null ? (
        <div className="flex flex-col items-center px-6 py-12 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-accent-muted">
            <Building2 className="size-5 text-accent" />
          </span>

          <h3 className="mt-4 text-base leading-6 font-semibold text-text-primary">
            No research yet
          </h3>

          <p className="mt-1 max-w-md text-sm leading-5 text-text-muted">
            Research Company will let the AI browse {company}&apos;s public
            pages and build a dossier — company overview, tech stack, culture
            and interview prep.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 p-6">
          {/* An empty section hides on its own, the SkillsComparison rule: a
              heading over nothing reads as a bug. The two paragraphs are
              always present, so the card never collapses. */}
          {dossierSections(research).map((section) =>
            isEmpty(section) ? null : (
              <section key={section.label}>
                <h3 className="text-xs leading-4 font-semibold tracking-wider text-text-secondary uppercase">
                  {section.label}
                </h3>

                {section.kind === "paragraph" ? (
                  <p className="mt-2 text-sm leading-5 text-text-secondary">
                    {section.text}
                  </p>
                ) : section.kind === "chips" ? (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {section.items.map((item) => (
                      <li key={item} className={CHIP}>
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : section.kind === "bullets" ? (
                  <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-4 marker:text-text-muted">
                    {section.items.map((item) => (
                      <li
                        key={item}
                        className={
                          section.emphasis
                            ? "text-sm leading-5 text-text-primary"
                            : "text-sm leading-5 text-text-secondary"
                        }
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul className="mt-2 flex flex-col gap-1">
                    {section.items.map((item) => (
                      <li key={item}>
                        <a
                          href={item}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs leading-4 break-all text-text-muted underline-offset-2 hover:underline"
                        >
                          {item}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ),
          )}
        </div>
      )}
    </section>
  );
}
