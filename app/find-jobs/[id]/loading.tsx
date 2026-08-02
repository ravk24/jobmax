import { AppNavbar } from "@/components/layout/AppNavbar";

const CARD =
  "rounded-2xl border border-border bg-surface p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]";

const BLOCK = "rounded-md bg-border-light";

// Opening a job is a click that waits on a database read, and without this the
// row click reads as dead. The shape mirrors the real page so the layout does
// not jump when the content arrives.
export default function Loading() {
  return (
    <>
      <AppNavbar />

      <main className="flex-1 bg-background px-6 py-8">
        <div
          className="mx-auto flex max-w-[940px] animate-pulse flex-col gap-6"
          aria-hidden
        >
          <div className={`${BLOCK} h-5 w-28`} />

          <div className={CARD}>
            <div className="flex items-center gap-4">
              <div className={`${BLOCK} size-12 rounded-xl`} />
              <div className="flex flex-col gap-2">
                <div className={`${BLOCK} h-7 w-64`} />
                <div className={`${BLOCK} h-4 w-40`} />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((tile) => (
              <div key={tile} className={`${CARD} flex items-center gap-3 p-4`}>
                <div className={`${BLOCK} size-8 rounded-lg`} />
                <div className="flex flex-col gap-2">
                  <div className={`${BLOCK} h-4 w-20`} />
                  <div className={`${BLOCK} h-3 w-14`} />
                </div>
              </div>
            ))}
          </div>

          {[0, 1].map((card) => (
            <div key={card} className={CARD}>
              <div className={`${BLOCK} h-4 w-44`} />
              <div className={`${BLOCK} mt-4 h-4 w-full`} />
              <div className={`${BLOCK} mt-2 h-4 w-11/12`} />
              <div className={`${BLOCK} mt-2 h-4 w-3/4`} />
            </div>
          ))}
        </div>

        <span className="sr-only" role="status">
          Loading job
        </span>
      </main>
    </>
  );
}
