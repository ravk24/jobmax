import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const MATCH_THRESHOLD = 70

export function matchScoreBarClass(score: number): string {
  if (score >= 80) return "bg-success"
  if (score >= 60) return "bg-info"
  return "bg-warning"
}
