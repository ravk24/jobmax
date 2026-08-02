import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const MATCH_THRESHOLD = 70

// Two score scales exist on purpose, and they are not a contradiction to be
// tidied away: this one is the bar fill from ui-rules.md, and the pill below is
// the badge scale from ui-tokens.md. They colour different elements and their
// breakpoints genuinely differ — the bar turns blue at 60, the pill never does.
export function matchScoreBarClass(score: number): string {
  if (score >= 80) return "bg-success"
  if (score >= 60) return "bg-info"
  return "bg-warning"
}

// The match pill on the job details header — ui-tokens.md § Score Indicators.
// Returns background and text together because the pair is what the token spec
// defines; splitting them invites a green background with muted text.
export function matchScoreBadgeClass(score: number): string {
  if (score >= 90) return "bg-success-lightest text-success"
  if (score >= 70) return "bg-success-light text-success"
  if (score >= 50) return "bg-warning/10 text-warning"
  return "bg-surface-secondary text-text-muted"
}
