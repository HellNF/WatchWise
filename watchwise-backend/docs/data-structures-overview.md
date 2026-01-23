# Data Structures Overview — WatchWise Backend

This document provides an overview of the main data structures used in the WatchWise backend. It combines schematic representations (for clarity and quick reference) with discursive explanations (to clarify design choices and relationships).

---

## 1. User

**File:** `src/data/users/types.ts`

**Schema:**
```ts
User {
  _id: ObjectId;
  username: string;
  email: string;
  oauthProvider?: 'google' | 'github';
  oauthId?: string;
  preferences: Preferences;
  watchHistory: WatchHistoryEntry[];
  lists: ListSummary[];
  createdAt: Date;
  updatedAt: Date;
}
```
**Explanation:**
- Each user has a unique username and email. OAuth fields are present if the user registered via Google or GitHub.
- Preferences, watch history, and lists are embedded or referenced for quick access.

---

## 2. Group

**File:** `src/data/groups/types.ts`

**Schema:**
```ts
Group {
  _id: ObjectId;
  name: string;
  members: ObjectId[]; // User IDs
  joinCode: string;
  joinCodeExpiresAt: Date;
  hostId?: ObjectId;
  status?: 'open' | 'locked' | 'closed';
  createdAt: Date;
  updatedAt: Date;
}
```
**Explanation:**
- Groups are collections of users, identified by a join code for onboarding.
- The hostId (optional) identifies the group leader.
- Status tracks the group’s lifecycle.

---

## 3. Movie

**File:** `src/data/movies/types.ts` (if present) or via TMDB Adapter

**Schema:**
```ts
Movie {
  _id: ObjectId;
  tmdbId: number;
  title: string;
  genres: string[];
  releaseDate: Date;
  cast: string[];
  director: string;
  popularity: number;
  rating: number;
  posterUrl?: string;
  ... // Additional TMDB fields
}
```
**Explanation:**
- Movies are identified by both internal and TMDB IDs.
- Metadata includes genres, cast, director, and popularity for recommendation logic.

---

## 4. Preferences

**File:** `src/data/preferences/types.ts`

**Schema:**
```ts
Preferences {
  genres: string[];
  favoriteActors: string[];
  favoriteDirectors: string[];
  moods?: string[];
  minRating?: number;
  maxDuration?: number;
}
```
**Explanation:**
- Captures explicit user preferences for genres, people, and optional constraints.
- Used for both individual and group recommendations.

---

## 5. Watch History Entry

**File:** `src/data/watch-history/types.ts`

**Schema:**
```ts
WatchHistoryEntry {
  movieId: ObjectId;
  watchedAt: Date;
  feedback?: 'like' | 'dislike';
}
```
**Explanation:**
- Tracks when a user watched a movie and their feedback.
- Used to filter out already seen movies and learn user tastes.

---

## 6. List (User List/Watchlist)

**File:** `src/data/lists/types.ts`

**Schema:**
```ts
List {
  _id: ObjectId;
  userId: ObjectId;
  name: string;
  movies: ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}
```
**Explanation:**
- Users can create custom lists (e.g., watchlist, favorites).
- Each list contains references to movies.

---

## 7. Group Session

**File:** `src/data/group-sessions/types.ts`

**Schema:**
```ts
GroupSession {
  _id: ObjectId;
  groupId: ObjectId;
  startedAt: Date;
  endedAt?: Date;
  questionnaireResponses: GroupQuestionnaireResponse[];
  recommendations: ObjectId[]; // Movie IDs
}
```
**Explanation:**
- Represents a recommendation session for a group, including questionnaire responses and generated recommendations.

---

## 8. Group Feedback

**File:** `src/data/group-feedback/types.ts`

**Schema:**
```ts
GroupFeedback {
  _id: ObjectId;
  groupId: ObjectId;
  movieId: ObjectId;
  userFeedback: Array<{
    userId: ObjectId;
    feedback: 'like' | 'dislike' | 'skip';
  }>;
  createdAt: Date;
}
```
**Explanation:**
- Stores feedback from group members on recommended movies.
- Used to refine future group recommendations.
- *** Not yet implemented *** 

---

## Relationships & Design Notes

- **References:** Most entities use MongoDB ObjectIds to reference related documents (e.g., userId, groupId, movieId).
- **Extensibility:** The schemas are designed to be extensible, allowing for additional fields (e.g., for future features like ratings, comments, or advanced preferences).
- **Normalization vs. Embedding:** Some data (like preferences) may be embedded for performance, while others (like movies) are referenced to avoid duplication.
- **TMDB Integration:** Movie metadata is enriched via the TMDB Adapter, ensuring up-to-date and rich information for recommendations.

---

For further details, see the `types.ts` files in each data module under `src/data/`.
