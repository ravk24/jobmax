// Mock dashboard data for Feature 14 — the UI ships against these shapes and
// Features 16/17 replace what remains with real reads, the same way
// lib/jobs-mock.ts stood in for Features 09→10. Values match
// context/design/dashboard.png. MOCK_STATS left in Feature 15, replaced by
// lib/dashboard-query.ts.

import type { ActivityEntry } from "@/components/dashboard/RecentActivity";
import type { JobsFoundPoint } from "@/components/dashboard/JobsFoundChart";
import type { MatchScoreBucket } from "@/components/dashboard/MatchScoreChart";
import type { ResearchActivityPoint } from "@/components/dashboard/ResearchActivityChart";

export const MOCK_ACTIVITY: ActivityEntry[] = [
  {
    id: "activity-1",
    kind: "search",
    message: "Found 8 jobs for Frontend Engineer",
    timeAgo: "10 mins ago",
  },
  {
    id: "activity-2",
    kind: "research",
    message: "Researched Stripe",
    timeAgo: "1 hour ago",
  },
  {
    id: "activity-3",
    kind: "search",
    message: "Found 12 jobs for React Developer",
    timeAgo: "2 hours ago",
  },
  {
    id: "activity-4",
    kind: "research",
    message: "Researched Vercel",
    timeAgo: "Yesterday",
  },
  {
    id: "activity-5",
    kind: "search",
    message: "Found 10 jobs for Full Stack Engineer",
    timeAgo: "Yesterday",
  },
];

export const MOCK_RESEARCH_ACTIVITY: ResearchActivityPoint[] = [
  { day: "Mon", researched: 2 },
  { day: "Tue", researched: 5 },
  { day: "Wed", researched: 3 },
  { day: "Thu", researched: 8 },
  { day: "Fri", researched: 12 },
  { day: "Sat", researched: 4 },
  { day: "Sun", researched: 1 },
];

export const MOCK_JOBS_FOUND: JobsFoundPoint[] = [
  { day: "Mon", jobs: 12 },
  { day: "Tue", jobs: 45 },
  { day: "Wed", jobs: 35 },
  { day: "Thu", jobs: 58 },
  { day: "Fri", jobs: 85 },
  { day: "Sat", jobs: 38 },
  { day: "Sun", jobs: 12 },
];

export const MOCK_MATCH_DISTRIBUTION: MatchScoreBucket[] = [
  { range: "50-60%", count: 5 },
  { range: "60-70%", count: 15 },
  { range: "70-80%", count: 45 },
  { range: "80-90%", count: 85 },
  { range: "90-100%", count: 35 },
];
