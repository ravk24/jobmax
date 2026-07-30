export function Testimonial() {
  return (
    <section className="border-b border-border bg-surface">
      <div className="mx-auto max-w-[1440px] px-6 py-20 text-center">
        <p className="text-xs leading-4 font-semibold tracking-widest text-accent uppercase">
          Success stories
        </p>

        <figure>
          <blockquote className="mx-auto mt-6 max-w-2xl text-lg leading-7 font-medium text-text-primary sm:text-2xl sm:leading-9">
            &ldquo;I used to spend my evenings copy-pasting resumes. Now I open
            my dashboard to see interviews waiting. It feels like cheating. Had
            3 offers on the table simultaneously.&rdquo;
          </blockquote>

          <figcaption className="mt-8 flex items-center justify-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-accent-light text-sm leading-5 font-semibold text-accent">
              TW
            </span>
            <span className="text-left">
              <span className="block text-sm leading-5 font-medium text-text-primary">
                Tom Wilson
              </span>
              <span className="block text-xs leading-4 text-text-muted">
                Junior Developer
              </span>
            </span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
