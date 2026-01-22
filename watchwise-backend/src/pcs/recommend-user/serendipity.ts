import { ScoredMovie } from "./types";

interface SerendipityConfig {
  rate: number;        // es. 0.2
  poolSize: number;    // es. 20
}

export function applySerendipity(
  ranked: ScoredMovie[],
  config: SerendipityConfig
): ScoredMovie[] {

  if (ranked.length === 0) return ranked;

  const topCount = Math.max(1, Math.floor((1 - config.rate) * ranked.length));
  const surpriseCount = Math.max(1, Math.floor(config.rate * ranked.length));

  const top = ranked.slice(0, topCount);
  const tail = ranked.slice(topCount, topCount + config.poolSize);

  if (tail.length === 0) return ranked;

  const shuffledTail = [...tail];
  for (let i = shuffledTail.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledTail[i], shuffledTail[j]] = [shuffledTail[j], shuffledTail[i]];
  }

  const surprises = shuffledTail.slice(0, Math.min(surpriseCount, shuffledTail.length));
  for (const surprise of surprises) {
    surprise.serendipity = true;
    surprise.reasons.push("Suggested to help you discover something new");
  }

  const result = [...top];
  const step = Math.max(1, Math.floor(result.length / (surprises.length + 1)));
  let insertAt = step;

  for (const surprise of surprises) {
    const index = Math.min(insertAt, result.length);
    result.splice(index, 0, surprise);
    insertAt += step + 1;
  }

  return result;
}
