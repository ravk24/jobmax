import { z } from "zod";

// The PostHog read layer, server only — the charts' counterpart to
// lib/dashboard-query.ts, in its own file because it is a different backend.
// posthog-node is capture-only (verified against 5.46.1's types), so reads go
// through the HTTP Query API with HogQL, authenticated by a personal API key —
// never the NEXT_PUBLIC_POSTHOG_KEY project token, which cannot query.
// Returns raw data (ISO dates, counts), never display strings — labels live in
// app/dashboard/page.tsx, the buildStats precedent.
//
// Per-render querying, no cache: three POSTs per dashboard view for one dev
// user sits far under PostHog's documented /query limits. Revisit trigger:
// multiple concurrent users or a dashboard auto-refresh — then wrap these in
// unstable_cache with a short TTL.

// day is "YYYY-MM-DD", zero-filled over the whole window, ascending. A missing
// day is a zero-activity day, and filling it here is data completeness, not
// presentation — the chart must never imply a gap in time that did not happen.
export type DailyCount = { day: string; count: number };

export type DailyCountsResult =
  | { status: "ok"; days: DailyCount[] }
  | { status: "error" };

// Index order matches the page's six labels:
// "<50%", "50-60%", "60-70%", "70-80%", "80-90%", "90-100%".
export type MatchScoreBucketCounts = [
  number,
  number,
  number,
  number,
  number,
  number,
];

export type MatchDistributionResult =
  | { status: "ok"; buckets: MatchScoreBucketCounts }
  | { status: "error" };

function getPosthogPersonalApiKey(): string {
  const key = process.env.POSTHOG_PERSONAL_API_KEY;
  if (!key) {
    throw new Error("POSTHOG_PERSONAL_API_KEY is not set");
  }
  return key;
}

function getPosthogProjectId(): string {
  const id = process.env.POSTHOG_PROJECT_ID;
  if (!id) {
    throw new Error("POSTHOG_PROJECT_ID is not set");
  }
  return id;
}

// The Query API lives on the app origin (us.posthog.com), not the ingestion
// origin the capture host points at (us.i.posthog.com). Derived rather than a
// third env var that could drift out of sync with the host; an unrecognised
// host throws instead of guessing.
function getPosthogApiOrigin(): string {
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!host) {
    throw new Error("NEXT_PUBLIC_POSTHOG_HOST is not set");
  }

  const { hostname, protocol } = new URL(host);
  const match = /^([a-z]+)\.i\.posthog\.com$/.exec(hostname);
  if (!match) {
    throw new Error(
      `NEXT_PUBLIC_POSTHOG_HOST is not a *.i.posthog.com ingestion host (${hostname}) — cannot derive the Query API origin`,
    );
  }

  return `${protocol}//${match[1]}.posthog.com`;
}

// user.id goes into the HogQL string by interpolation, made safe by validating
// rather than escaping: it comes from getCurrentUser() — the server-verified
// session, never request input — and is a UUID by construction. The regex
// admits only hex digits and hyphens, a character set in which no HogQL
// string-literal escape is possible. A failure here is corruption, and the
// read fails closed rather than attempting escapes.
const distinctIdSchema = z.string().regex(/^[0-9a-fA-F-]{36}$/);

const hogqlResponseSchema = z.object({
  results: z.array(z.array(z.unknown())),
});

async function runHogQL(query: string): Promise<unknown[][] | null> {
  const url = `${getPosthogApiOrigin()}/api/projects/${getPosthogProjectId()}/query`;

  const response = await fetch(url, {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${getPosthogPersonalApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
  });

  if (!response.ok) {
    console.error(
      "[lib/posthog-query]",
      `query failed: ${response.status} ${response.statusText}`,
    );
    return null;
  }

  const parsed = hogqlResponseSchema.safeParse(await response.json());

  if (!parsed.success) {
    console.error("[lib/posthog-query]", parsed.error.issues);
    return null;
  }

  return parsed.data.results;
}

// Rows come back positional per SELECT column, not keyed.
const dailyRowSchema = z.tuple([z.string(), z.number()]);

const DAY_MS = 24 * 60 * 60 * 1000;

// UTC end-to-end, on both sides of the join: HogQL's toDate evaluates in the
// PostHog project timezone (UTC, PostHog's default) and these keys are UTC
// dates. If the project timezone is ever changed, boundary events could land
// one day off — acceptable here, and the fix (pass the timezone into both
// sides) is localized to this file.
function zeroFilledDays(
  counts: Map<string, number>,
  windowDays: number,
): DailyCount[] {
  const days: DailyCount[] = [];
  const todayUtc = new Date();

  for (let offset = windowDays - 1; offset >= 0; offset -= 1) {
    const day = new Date(todayUtc.getTime() - offset * DAY_MS)
      .toISOString()
      .slice(0, 10);
    days.push({ day, count: counts.get(day) ?? 0 });
  }

  return days;
}

async function selectDailyCounts(
  event: "job_found" | "company_researched",
  userId: string,
  windowDays: number,
): Promise<DailyCountsResult> {
  try {
    if (!distinctIdSchema.safeParse(userId).success) {
      console.error("[lib/posthog-query]", "distinct_id failed validation");
      return { status: "error" };
    }

    const results = await runHogQL(
      `SELECT toString(toDate(timestamp)) AS day, count() AS total ` +
        `FROM events ` +
        `WHERE event = '${event}' ` +
        `AND distinct_id = '${userId}' ` +
        `AND timestamp >= toStartOfDay(now()) - INTERVAL ${windowDays - 1} DAY ` +
        `GROUP BY day ORDER BY day ASC`,
    );

    if (results === null) {
      return { status: "error" };
    }

    const parsed = z.array(dailyRowSchema).safeParse(results);

    if (!parsed.success) {
      console.error("[lib/posthog-query]", parsed.error.issues);
      return { status: "error" };
    }

    const counts = new Map<string, number>();
    for (const [day, total] of parsed.data) {
      // Defensive: pin to the date part even if a serializer appends a time.
      counts.set(day.slice(0, 10), total);
    }

    return { status: "ok", days: zeroFilledDays(counts, windowDays) };
  } catch (error) {
    console.error("[lib/posthog-query]", error);
    return { status: "error" };
  }
}

export async function selectJobsFoundDaily(
  userId: string,
): Promise<DailyCountsResult> {
  return selectDailyCounts("job_found", userId, 30);
}

export async function selectResearchDaily(
  userId: string,
): Promise<DailyCountsResult> {
  return selectDailyCounts("company_researched", userId, 7);
}

const scoreRowSchema = z.tuple([z.number()]);

// Raw scores fetched and bucketed here rather than a HogQL histogram — the
// averageMatchScore precedent in lib/dashboard-query.ts: JS aggregation over
// one fetched column is cheap at this scale, and the bucket rule stays in one
// language. Revisit if the event volume ever outgrows one response.
//
// isNotNull(toFloat(...)) excludes both null matchScore (unscored jobs fire
// job_found too — Feature 10) and any non-numeric junk in one predicate: a
// score distribution charts scores, the stats card's treatment of unscored.
export async function selectMatchScoreDistribution(
  userId: string,
): Promise<MatchDistributionResult> {
  try {
    if (!distinctIdSchema.safeParse(userId).success) {
      console.error("[lib/posthog-query]", "distinct_id failed validation");
      return { status: "error" };
    }

    const results = await runHogQL(
      `SELECT toFloat(properties.matchScore) AS score ` +
        `FROM events ` +
        `WHERE event = 'job_found' ` +
        `AND distinct_id = '${userId}' ` +
        `AND isNotNull(toFloat(properties.matchScore))`,
    );

    if (results === null) {
      return { status: "error" };
    }

    const parsed = z.array(scoreRowSchema).safeParse(results);

    if (!parsed.success) {
      console.error("[lib/posthog-query]", parsed.error.issues);
      return { status: "error" };
    }

    const buckets: MatchScoreBucketCounts = [0, 0, 0, 0, 0, 0];
    for (const [score] of parsed.data) {
      if (score < 50) buckets[0] += 1;
      else if (score < 60) buckets[1] += 1;
      else if (score < 70) buckets[2] += 1;
      else if (score < 80) buckets[3] += 1;
      else if (score < 90) buckets[4] += 1;
      else buckets[5] += 1;
    }

    return { status: "ok", buckets };
  } catch (error) {
    console.error("[lib/posthog-query]", error);
    return { status: "error" };
  }
}
