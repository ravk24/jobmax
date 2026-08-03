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

export type MatchScoreBucket = {
  range: string;
  count: number;
};

type Props = {
  data: MatchScoreBucket[];
  // Shown when data is empty — the page distinguishes "no data yet" from
  // "the read failed" here, the RecentActivity precedent. The card never
  // hides, and the 280px slot holds so the grid keeps its footprint.
  emptyMessage?: string;
};

const AXIS_TICK = { fill: "var(--color-chart-axis)", fontSize: 12 };

export function MatchScoreChart({
  data,
  emptyMessage = "No data yet.",
}: Props) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
      <h2 className="text-base leading-6 font-semibold text-text-primary">
        Match Score Distribution
      </h2>

      {data.length === 0 ? (
        <div className="mt-4 flex h-[280px] items-center justify-center">
          <p className="text-sm leading-5 text-text-muted">{emptyMessage}</p>
        </div>
      ) : (
        <div className="mt-4 h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                vertical={false}
                strokeDasharray="4 4"
                stroke="var(--color-border)"
              />
              <XAxis
                dataKey="range"
                axisLine={false}
                tickLine={false}
                tickMargin={8}
                tick={AXIS_TICK}
              />
              {/* No fixed domain — see JobsFoundChart; a bucket over 100 must
                  rescale the axis, never clip. allowDecimals only suppresses
                  fractional ticks on an integer count axis. */}
              <YAxis
                width={36}
                axisLine={false}
                tickLine={false}
                tick={AXIS_TICK}
                allowDecimals={false}
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
                dataKey="count"
                name="Jobs"
                fill="var(--color-success)"
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
