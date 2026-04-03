import { ScoredMovie, EnrichedMovieCandidate } from "./types";

interface SerendipityConfig {
  rate: number;        // es. 0.1
  poolSize: number;    // es. 100
}

/**
 * Inserisce "sorprese" nel ranking finale in modo da massimizzare la diversità di genere.
 *
 * Rispetto alla precedente selezione casuale dalla coda, questo approccio:
 * 1. Raccoglie i generi già ben rappresentati nei top risultati.
 * 2. Punteggia ogni film nella coda in base alla "novelty" di genere
 *    (quanti dei suoi generi NON compaiono già nei top).
 * 3. Seleziona i film con la novelty più alta come sorprese,
 *    garantendo che siano genuinamente diversi — non semplicemente i film con score più basso.
 * 4. Distribuisce le sorprese uniformemente nel ranking per non concentrarle in un punto.
 *
 * Fallback: se i film della coda non hanno dati di genere (non ancora arricchiti),
 * il comportamento torna alla selezione casuale originale.
 */
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

  // Generi già presenti nei top risultati — le sorprese devono portare qualcosa di diverso
  const topGenres = new Set<string>(
    top.flatMap((entry) =>
      ((entry.movie as EnrichedMovieCandidate).genres ?? []).map((g) => g.toLowerCase())
    )
  );

  // Calcola la "novelty" di ogni film nella coda:
  // proporzione di generi che NON sono già nei top risultati
  const scoredTail = tail.map((entry) => {
    const genres = ((entry.movie as EnrichedMovieCandidate).genres ?? [])
      .map((g) => g.toLowerCase());

    let novelty: number;
    if (genres.length === 0) {
      // Film senza dati di genere: assume novelty media (non penalizzare)
      novelty = 0.5;
    } else {
      const novelGenres = genres.filter((g) => !topGenres.has(g));
      novelty = novelGenres.length / genres.length;
    }

    return { entry, novelty };
  });

  // Ordina per novelty decrescente: le vere sorprese vengono prima
  scoredTail.sort((a, b) => b.novelty - a.novelty);

  const surprises = scoredTail
    .slice(0, Math.min(surpriseCount, scoredTail.length))
    .map(({ entry }) => ({
      ...entry,
      serendipity: true as const,
      reasons: [...entry.reasons, "Suggested to help you discover something new"].slice(0, 3)
    }));

  // Distribuisci le sorprese uniformemente nel ranking top
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
