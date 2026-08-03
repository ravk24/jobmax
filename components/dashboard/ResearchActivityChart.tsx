"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ResearchActivityPoint = {
  day: string;
  researched: number;
};

type Props = {
  data: ResearchActivityPoint[];
  // Shown when data is empty — the page distinguishes "no data yet" from
  // "the read failed" here, the RecentActivity precedent. The card never
  // hides, and the 280px slot holds so the grid keeps its footprint.
  emptyMessage?: string;
};

// Recharts styling rides on SVG props, which take CSS variables — the
// no-hardcoded-hex rule holds. See library-docs.md § Recharts.
const AXIS_TICK = { fill: "var(--color-chart-axis)", fontSize: 12 };

export function ResearchActivityChart({
  data,
  emptyMessage = "No data yet.",
}: Props) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
      <h2 className="text-base leading-6 font-semibold text-text-primary">
        Company Research Activity
      </h2>

      {data.length === 0 ? (
        <div className="mt-4 flex h-[280px] items-center justify-center">
          <p className="text-sm leading-5 text-text-muted">{emptyMessage}</p>
        </div>
      ) : (
      // ResponsiveContainer resolves against the nearest sized ancestor —
      // without the fixed height it measures 0 and renders nothing.
      <div className="mt-4 h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid
              vertical={false}
              strokeDasharray="4 4"
              stroke="var(--color-border)"
            />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tickMargin={8}
              tick={AXIS_TICK}
            />
            <YAxis
              width={36}
              axisLine={false}
              tickLine={false}
              tick={AXIS_TICK}
            />
            <Tooltip
              cursor={{ fill: "var(--color-surface-secondary)" }}
              contentStyle={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--color-text-secondary)" }}
              itemStyle={{ color: "var(--color-text-primary)" }}
            />
            <Bar
              dataKey="researched"
              name="Companies researched"
              fill="var(--color-info)"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      )}
    </section>
  );
}
