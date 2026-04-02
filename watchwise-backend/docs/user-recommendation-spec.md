# User Movie Recommendation Process (WatchWise)

This document describes in detail the process and architecture for generating personalized movie recommendations for a single user in WatchWise. The process is broken down into four main layers: Data Layer Services, Adapter Layer Services, Business Logic Layer Services, and Process Centric Services.

---

## 1. Data Layer Services
Responsible for direct access to persistent data and external APIs. Provides raw data to upper layers.

- **User Repository** (`src/data/users/repository.ts`)
  - Fetches user profile, preferences, watch history, and lists from MongoDB.
- **Movies Repository** (`src/data/movies/repository.ts`)
  - Provides access to movie metadata, ratings, genres, and popularity.
- **TMDB Adapter** (`src/adapters/tmdb/`)
  - Fetches additional movie data from The Movie Database (TMDB) API (e.g., details, images, cast).
- **Preferences Repository** (`src/data/preferences/repository.ts`)
  - Stores and retrieves explicit user preferences (genres, moods, etc.).

---

## 2. Adapter Layer Services
Responsible for normalizing, mapping, and enriching data from external sources or the data layer.

- **TMDB Client & Mapper** (`src/adapters/tmdb/client.ts`, `mapper.ts`)
  - Maps TMDB API responses to internal movie data structures.
  - Handles API errors, pagination, and data normalization.
- **Enrichment Service** (`src/pcs/recommend-user/enrich.ts`)
  - Enriches candidate movies with additional features (e.g., genre vectors, popularity, release year, cast overlap).
- **Preferences Adapter**
  - Translates user preferences and watch history into feature vectors for scoring.

---

## 3. Business Logic Layer Services
Implements the core logic for candidate selection, scoring, filtering, and explanation.

- **Candidate Generation** (`src/pcs/recommend-user/candidates.ts`)
  - Selects a pool of candidate movies for the user based on popularity, recency, and availability.
  - Excludes movies already seen or explicitly disliked by the user.
- **Preference Scoring** (`src/pcs/recommend-user/scoring.ts`)
  - Computes a personalized score for each candidate movie using user preferences, genre affinity, mood, and collaborative signals.
  - May use weighted sums, cosine similarity, or other algorithms.
- **Serendipity Module** (`src/pcs/recommend-user/serendipity.ts`)
  - Optionally boosts movies that are relevant but less obvious, to increase discovery and diversity.
- **Filtering & Post-processing**
  - Applies business rules (e.g., minimum rating, language, age restrictions).
- **Explanation Engine** (`src/pcs/recommend-user/explain.ts`)
  - Generates human-readable explanations for why a movie was recommended (e.g., "Because you liked Inception and enjoy Sci-Fi thrillers").

---

## 4. Process Centric Services
Coordinates the overall recommendation workflow, orchestrating the above layers.

- **User Recommendation Service** (`src/pcs/recommend-user/service.ts`)
  - Entry point for user recommendations (e.g., `recommendForUser(userId, options)`)
  - Steps:
    1. Fetch user profile, preferences, and watch history (Data Layer)
    2. Generate candidate movies (Business Logic)
    3. Enrich candidates with features (Adapter Layer)
    4. Score and rank candidates (Business Logic)
    5. Apply serendipity and filtering (Business Logic)
    6. Generate explanations (Business Logic)
    7. Return top-N recommendations with explanations
- **API Endpoint** (`src/pcs/recommend-user/index.ts`)
  - Exposes the recommendation service via REST API (e.g., `GET /api/recommend/user/:userId`)

---

## Example Flow
1. **API Call**: Frontend requests recommendations for user `U123`.
2. **Process Centric Service**: `recommendForUser(U123)` is called.
3. **Data Layer**: Fetches user profile, preferences, watch history, and available movies.
4. **Candidate Generation**: Selects movies not yet seen by the user.
5. **Enrichment**: Adds genre, popularity, and cast features to each candidate.
6. **Scoring**: Computes a personalized score for each movie.
7. **Serendipity**: Optionally boosts diverse or novel movies.
8. **Filtering**: Removes movies not matching business rules.
9. **Explanation**: Generates a reason for each top recommendation.
10. **Response**: Returns a ranked list of movies with explanations to the frontend.

---

## References
- See `src/pcs/recommend-user/` for all main modules.
- See `docs/group-recommendation-spec.md` for group recommendation logic.

For further details, see code comments and each module's documentation.
---



## Discursive explanation of the recommendation algorithm (in English)

The WatchWise recommendation system is based on a multi-layered approach that combines historical data, explicit preferences, and information from external sources (such as TMDB) to provide personalized movie suggestions. The goal is to offer recommendations that are both relevant and diverse, avoiding repetition and taking the user's tastes into account.

**1. User data collection:**  
The system starts from the data collected about the user: movies already watched, feedback given (like/dislike), explicit preferences (favorite genres, actors, directors), and questionnaire responses. This information is saved in the database and updated every time the user interacts with the platform.

**2. Filtering and pre-processing:**  
Before generating suggestions, the system excludes all movies already seen or negatively rated by the user, to avoid repetition and propose only new or potentially appreciated content.

**3. Preference analysis:**  
The core of the algorithm analyzes both explicit and implicit preferences. Explicit preferences are those directly declared by the user (e.g., "I like thrillers" or "I prefer movies with DiCaprio"). Implicit preferences are deduced from behavior: if the user often watches movies of a certain genre or with certain actors, the system detects this and takes it into account.

**4. Candidate collection:**  
A list of "candidate" movies is generated from:
- Popular and trending movies (via TMDB)
- Movies similar to those already appreciated by the user (analysis of genres, cast, directors)
- Movies recommended by collaborative filtering models (if enough data is available)
- Movies suggested by questionnaires or recent preferences

**5. Scoring and ranking:**  
Each candidate movie is evaluated with a score that takes into account various factors:
- Match with favorite genres
- Presence of favorite actors/directors
- Similarity to movies already appreciated
- General popularity (to avoid overly niche suggestions)
- Novelty (priority to recent or unseen movies)
- Possible penalties for movies already suggested recently

**6. Final selection:**  
The movies with the highest scores are selected and ordered to be shown to the user. The system may introduce some randomness to avoid overly repetitive suggestions and encourage discovery.

**7. Feedback and learning:**  
When the user interacts with the suggestions (for example, watches a movie or leaves feedback), the system updates the data and refines future recommendations, making them increasingly personalized.

In summary, the WatchWise recommendation logic is a mix of content filtering, preference analysis, and intelligent ranking, with the goal of proposing movies that are truly interesting for each individual user, learning and improving over time thanks to continuous feedback.
