import { createInsforgeServer } from "@/lib/insforge-server";
import type { AgentLogLevel } from "@/types";

// The agent's own trail, written to agent_logs. code-standards.md sketches
// logAgentError(runId, jobId, error) with no user id — agent_logs.user_id is
// NOT NULL and its RLS policy compares it to auth.uid(), so it has to be
// carried. Every other argument follows the sketch.
//
// Both helpers swallow their own failures. Logging must never fail the run it
// is describing: a write that cannot record "Adzuna returned nothing" must not
// also lose the jobs that were found. Same reasoning as captureProfileCompleted
// in actions/profile.ts.

type LogEntry = {
  runId: string;
  userId: string;
  level: AgentLogLevel;
  message: string;
  jobId?: string | null;
};

export async function logAgent({
  runId,
  userId,
  level,
  message,
  jobId = null,
}: LogEntry): Promise<void> {
  try {
    const insforge = await createInsforgeServer();
    const { error } = await insforge.database.from("agent_logs").insert({
      run_id: runId,
      user_id: userId,
      level,
      message,
      job_id: jobId,
    });

    if (error) {
      console.error("[agent/logs]", error.message);
    }
  } catch (error) {
    console.error("[agent/logs]", error);
  }
}

// Raw error text goes to agent_logs and to the console, never to the UI —
// code-standards.md § Error Handling. The route decides what the user reads.
export async function logAgentError(
  runId: string,
  userId: string,
  message: string,
  error: unknown,
): Promise<void> {
  console.error("[agent/logs]", message, error);
  await logAgent({
    runId,
    userId,
    level: "error",
    message: `${message}: ${String(error)}`,
  });
}
