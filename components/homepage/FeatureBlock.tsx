import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type FeatureItem = {
  title: string;
  description: string;
  highlighted?: boolean;
};

type Props = {
  heading: string;
  items: FeatureItem[];
  visual: ReactNode;
  visualFirst?: boolean;
};

export function FeatureBlock({ heading, items, visual, visualFirst }: Props) {
  return (
    <section className="border-b border-border">
      <div className="mx-auto grid max-w-[1440px] border-x border-border lg:grid-cols-2">
        <div
          className={cn(
            "flex flex-col border-border lg:border-r",
            visualFirst && "lg:order-2 lg:border-r-0 lg:border-l",
          )}
        >
          <h2 className="border-b border-border px-6 py-10 text-2xl leading-tight font-bold tracking-tight text-text-primary sm:px-8 sm:py-12 sm:text-3xl lg:text-4xl">
            {heading}
          </h2>

          <ul className="flex flex-col">
            {items.map((item) => (
              <li
                key={item.title}
                className={cn(
                  "border-b border-l-2 border-border px-6 py-6 last:border-b-0 sm:px-8",
                  item.highlighted ? "border-l-accent" : "border-l-transparent",
                )}
              >
                <h3 className="text-base leading-6 font-semibold text-text-primary">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-text-secondary">
                  {item.description}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div
          className={cn(
            "flex min-w-0 items-center justify-center bg-surface-muted p-6 sm:p-8",
            visualFirst && "lg:order-1",
          )}
        >
          {visual}
        </div>
      </div>
    </section>
  );
}
