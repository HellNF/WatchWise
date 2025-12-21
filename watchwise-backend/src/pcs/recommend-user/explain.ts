import { ScoredMovie } from "./types";

export function buildExplanation(
  scored: ScoredMovie
): string[] {
  return scored.reasons;
}
