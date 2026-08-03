"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type JobsFoundPoint = {
  day: string;
  jobs: number;
};

type Props = {
  data: JobsFoundPoint[];
};

const AXIS_TICK = { fill: "var(--color-chart-axis)", fontSize: 12 };

export function JobsFoundChart({ data }: Props) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
      <h2 className="text-base leading-6 font-semibold text-text-primary">
        Jobs Found Over Time
      </h2>

      <div className="mt-4 h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              {/* The mock's fill fades to transparent; the stops stay on the
                  accent token so no rgba literal appears here. */}
              <linearGradient id="jobsFoundGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--color-accent)"
                  stopOpacity={0.25}
                />
                <stop
                  offset="100%"
                  stopColor="var(--color-accent)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
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
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              axisLine={false}
              tickLine={false}
              tick={AXIS_TICK}
            />
            <Tooltip
              cursor={{ stroke: "var(--color-border-muted)" }}
              contentStyle={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--color-text-secondary)" }}
              itemStyle={{ color: "var(--color-text-primary)" }}
            />
            <Area
              type="monotone"
              dataKey="jobs"
              name="Jobs found"
              stroke="var(--color-accent)"
              strokeWidth={3}
              fill="url(#jobsFoundGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
