export const PCS_CONFIG = {
  weights: {
    popularity: 0.05,
    rating: 0.1,
    genre: 0.45,
    director: 0.25,
    actor: 0.15
  },
  serendipity: {
    rate: 0.1,
    poolSize: 30
  },
  exploration: {
    jitter: 0.1,
    topMixRate: 0.2,
    topMixWindow: 20
  },
  enrichment: {
    maxCandidates: 10
  }
};
