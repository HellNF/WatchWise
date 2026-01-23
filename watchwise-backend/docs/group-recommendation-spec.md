
# Group Recommendation — Functional & Technical Specification (MVP)

**Goal**
Feature designed for couples/groups of friends in person. The experience must be fast, with lightweight onboarding, and offer both “compromise” suggestions and smart outsiders (watchlist).

---

## Group Movie Recommendation Process — Layered Architecture

The group recommendation process is organized into four main layers, each responsible for a specific set of tasks:

### 1. Data Layer Services
Responsible for direct access to persistent data and external APIs. Provides raw data to upper layers.

- **Group Repository**: Fetches group info, join codes, status, and membership from MongoDB.
- **User Repository**: Fetches user profiles, preferences, watch history, and daily questionnaire responses.
- **Movies Repository**: Provides access to movie metadata, ratings, genres, and popularity.
- **Watchlist Repository**: Retrieves each user’s watchlist.
- **TMDB Adapter**: Fetches additional movie data from The Movie Database (TMDB) API (e.g., details, images, cast).

### 2. Adapter Layer Services
Responsible for normalizing, mapping, and enriching data from external sources or the data layer.

- **TMDB Client & Mapper**: Maps TMDB API responses to internal movie data structures. Handles API errors, pagination, and data normalization.
- **Enrichment Service**: Enriches candidate movies with additional features (e.g., genre vectors, popularity, release year, cast overlap).
- **Preferences Adapter**: Translates user preferences, watch history, and questionnaire responses into feature vectors for scoring.
- **Group Profile Builder**: Aggregates individual user preferences and context (mood, energy, max duration) into a group profile.

### 3. Business Logic Layer Services
Implements the core logic for candidate selection, scoring, compatibility calculation, bucketing, and explanation.

- **Group Join & Security Logic**: Manages join code generation, expiry, rate limiting, and anti-abuse mechanisms.
- **Questionnaire Handling**: Ensures all (or most) group members have completed the daily questionnaire, with soft start and host override.
- **Candidate Generation**: Selects a pool of candidate movies for the group based on trending/popular, genre/actor/director overlap, and watchlist outsiders.
- **User Scoring**: Computes a personalized score for each candidate movie for each user, considering preferences, context, and exclusions.
- **Group Compatibility Aggregation**: Aggregates user scores for each movie using:
  - Mean score ($\bar{s}$)
  - Minimum score ($s_{min}$)
  - Disagreement (variance $\sigma^2$)
  - Final compatibility: $C = 0.6\bar{s} + 0.3s_{min} - 0.1\sigma^2$
- **Dynamic Bucketing**: Segments movies into compatibility buckets (e.g., high, medium, exploratory) using percentiles or static thresholds.
- **Outsider Handling**: Reserves a quota (10–20%) for watchlist outsiders, with soft penalties if too far from group preferences.
- **Filtering & Post-processing**: Applies business rules (e.g., minimum rating, language, age restrictions).
- **Explanation Engine**: Generates human-readable explanations for why a movie was recommended to the group.

### 4. Process Centric Services
Coordinates the overall group recommendation workflow, orchestrating the above layers.

- **Group Recommendation Service**: Entry point for group recommendations (e.g., `recommendForGroup(groupId, options)`). Steps:
  1. Validate group join and questionnaire completion (Business Logic)
  2. Fetch group members, profiles, preferences, and watchlists (Data Layer)
  3. Build group profile and context (Adapter Layer)
  4. Generate candidate movies (Business Logic)
  5. Enrich candidates with features (Adapter Layer)
  6. Score candidates for each user (Business Logic)
  7. Aggregate scores and compute group compatibility (Business Logic)
  8. Bucket movies by compatibility (Business Logic)
  9. Select and label outsiders (Business Logic)
  10. Generate explanations (Business Logic)
  11. Return recommendations, buckets, outsiders, and explanations
- **API Endpoint**: Exposes the recommendation service via REST API (e.g., `GET /api/recommend/group/:groupId`)

---

## Detailed Group Recommendation Pipeline

1. **Join Group**: Users join a group using an alphanumeric code (8+ characters, block format for readability). The code has an expiry and is protected against abuse (rate limiting, max attempts, regeneration by host).
2. **Questionnaire Check**: Each member is prompted to complete the daily questionnaire (mood, energy, max duration, etc.). If not all respond within a timeout, the system can start with available responses (soft start), or the host can override.
3. **Build Group Profile**: Aggregates user preferences, questionnaire responses, and historical data to form a group profile (mean, min, and variance of preferences/context).
4. **Candidate Pool Generation**: Gathers movies from:
   - Trending/popular titles (via TMDB)
   - Movies matching group’s aggregated genres, actors, directors
   - Watchlist outsiders (movies present in at least one member’s watchlist and not recently watched)
5. **User Scoring**: For each candidate, computes a score per user based on their preferences, context, and exclusions.
6. **Group Compatibility Aggregation**: For each movie, aggregates user scores using the formula:
   $$
   C = 0.6\bar{s} + 0.3s_{min} - 0.1\sigma^2
   $$
   where $\bar{s}$ is the mean user score, $s_{min}$ is the minimum user score, and $\sigma^2$ is the variance (disagreement).
7. **Dynamic Bucketing**: Segments movies into compatibility buckets (high, medium, exploratory) using percentiles or static thresholds to ensure each bucket is populated.
8. **Outsider Selection**: Reserves 10–20% of the final ranking for watchlist outsiders, labeled as such, with soft penalties if too far from group preferences.
9. **Filtering & Post-processing**: Applies business rules (minimum rating, language, age restrictions, etc.).
10. **Explanation Generation**: For each top recommendation, generates reasons tailored to the group (e.g., “Because most of you like Sci-Fi and it’s on Alice’s watchlist”).
11. **API Output**: Returns a structured response with the top recommendation, compatibility buckets, outsiders, and explanations.

---

## Example API Output

```json
{
  "recommended": { "movie": { /* ... */ }, "score": 0.92, "reasons": ["High compatibility: matches group’s favorite genres and mood"] },
  "buckets": {
    "high": [ /* ... */ ],
    "medium": [ /* ... */ ],
    "explore": [ /* ... */ ]
  },
  "outsiders": [ /* ... */ ]
}
```

---

## Best Practices for Effectiveness

- **Transparency**: Always explain why a movie is recommended.
- **Fairness**: Ensure every member is represented in the group profile.
- **Speed**: Cache TMDB enrichments for performance.
- **Robustness**: Provide fallbacks if some users lack data.

---

## MVP Scope (First Milestone)

- Group join with code + expiry
- Soft start questionnaire
- Group PCS with:
  - Base candidate pool
  - Aggregated preferences
  - Compatibility buckets
  - Watchlist outsiders

---

## Future Extensions

- Multi-session matching (rotating recommendations)
- Host-guided mode (host has priority)
- Customizable outsider weight

---

**Final Note**
This approach is feasible and well-suited for desktop group settings. The alphanumeric code remains the best choice for in-person groups using PCs.

---

## Discursive Explanation of the Group Recommendation Algorithm

The group movie recommendation algorithm in WatchWise is designed to balance the diverse tastes and contexts of multiple users, aiming to find the best possible compromise while still allowing for discovery and fairness. Here’s a clear, narrative overview of how the logic works:

1. **Gathering Group and User Data:**  
The process begins by collecting all relevant data: group membership, each user’s preferences (genres, actors, directors), watch history, and their responses to a daily questionnaire (mood, energy, max duration, etc.). This ensures the system understands both long-term tastes and the current context of each member.

2. **Filtering and Candidate Selection:**  
The system filters out movies already seen by the group or recently watched, and excludes those that don’t meet basic requirements (e.g., age rating, language). It then builds a pool of candidate movies by combining trending/popular titles, movies matching the group’s aggregated preferences, and “outsider” movies from members’ watchlists that haven’t been watched recently.

3. **Scoring for Each User:**  
For every candidate movie, the algorithm computes a personalized score for each group member. This score reflects how well the movie matches their preferences, current mood, and any explicit exclusions. The scoring can use weighted sums, similarity measures, or other techniques to quantify fit.

4. **Aggregating to Group Compatibility:**  
To turn individual scores into a group recommendation, the system aggregates them using a formula that rewards both overall agreement and fairness:
   - The mean score (how much the group as a whole likes the movie)
   - The minimum score (ensuring no one is left out)
   - The variance (penalizing movies that are divisive)
   - The final compatibility score is:  
     $C = 0.6\bar{s} + 0.3s_{min} - 0.1\sigma^2$

5. **Bucketing and Outsiders:**  
Movies are then bucketed into compatibility bands (high, medium, exploratory) so the group can see which options are best matches and which are more for discovery. A reserved portion of the ranking is set aside for “outsider” movies—those that might not be a perfect fit for everyone but are on someone’s watchlist, encouraging serendipity and compromise.

6. **Final Filtering and Explanations:**  
After applying any final business rules, the system generates explanations for each top suggestion, making it clear why a movie is recommended (e.g., “Because most of you like comedies and it’s on Bob’s watchlist”).

7. **Learning and Feedback:**  
As the group interacts with the recommendations (watching, skipping, or providing feedback), the system updates its data, gradually improving future suggestions and adapting to the group’s evolving tastes.

**In summary:**  
The WatchWise group recommendation logic is a blend of data-driven filtering, individual and collective preference analysis, and fairness-aware ranking. It aims to maximize group satisfaction, ensure everyone is represented, and keep the experience fresh and engaging by occasionally surfacing unexpected but relevant movies.
