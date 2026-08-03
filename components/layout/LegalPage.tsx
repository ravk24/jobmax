// Shared body for the legal pages (/privacy, /terms) — one layout so the two
// documents cannot drift apart visually. Marketing-side page: white surface,
// narrow reading column, the established heading/body recipes.

type LegalSection = {
  heading: string;
  paragraphs: string[];
};

type Props = {
  title: string;
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
};

export function LegalPage({ title, lastUpdated, intro, sections }: Props) {
  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto w-full max-w-3xl px-6 py-16">
        <h1 className="text-3xl leading-9 font-bold tracking-tight text-text-primary">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-5 text-text-muted">
          Last updated: {lastUpdated}
        </p>

        <p className="mt-6 text-sm leading-6 text-text-secondary">{intro}</p>

        {sections.map((section) => (
          <section key={section.heading} className="mt-10">
            <h2 className="text-base leading-6 font-semibold text-text-primary">
              {section.heading}
            </h2>
            {section.paragraphs.map((paragraph) => (
              <p
                key={paragraph}
                className="mt-3 text-sm leading-6 text-text-secondary"
              >
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
