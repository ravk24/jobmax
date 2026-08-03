import { AppNavbar } from "@/components/layout/AppNavbar";

const CARD =
  "rounded-2xl border border-border bg-surface p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]";

const BLOCK = "rounded-md bg-border-light";

// The dashboard waits on a real profile read, so a navbar click needs pending
// feedback — the job-details precedent. The shape mirrors the real grid so
// nothing jumps when content arrives.
export default function Loading() {
  return (
    <>
      <AppNavbar />

      <main className="flex-1 bg-background px-6 py-8">
        <div
          className="mx-auto flex max-w-[1440px] animate-pulse flex-col gap-6"
          aria-hidden
        >
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((card) => (
              <div key={card} className={CARD}>
                <div className={`${BLOCK} h-4 w-28`} />
                <div className={`${BLOCK} mt-2 h-8 w-20`} />
                <div className={`${BLOCK} mt-3 h-4 w-24`} />
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
            <div className={CARD}>
              <div className={`${BLOCK} h-4 w-32`} />
              {[0, 1, 2, 3, 4].map((row) => (
                <div key={row} className="mt-5 flex gap-3">
                  <div className={`${BLOCK} size-4 rounded-full`} />
                  <div className="flex flex-1 flex-col gap-2">
                    <div className={`${BLOCK} h-4 w-3/4`} />
                    <div className={`${BLOCK} h-3 w-20`} />
                  </div>
                </div>
              ))}
            </div>
            <div className={CARD}>
              <div className={`${BLOCK} h-4 w-52`} />
              <div className={`${BLOCK} mt-4 h-[280px] w-full`} />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
            {[0, 1].map((card) => (
              <div key={card} className={CARD}>
                <div className={`${BLOCK} h-4 w-44`} />
                <div className={`${BLOCK} mt-4 h-[280px] w-full`} />
              </div>
            ))}
          </div>
        </div>

        <span className="sr-only" role="status">
          Loading dashboard
        </span>
      </main>
    </>
  );
}
