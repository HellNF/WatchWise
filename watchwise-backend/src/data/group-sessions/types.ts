// watchwise-backend/src/data/group-sessions/types.ts

export interface GroupSession {
  id: string;
  groupId: string;
  context: {
    mood?: string;
    maxDuration?: number;
    preferredGenres?: string[];
    excludedGenres?: string[];
  };
  createdAt: Date;
  selectedMovieId?: string;
  softStartAt?: Date;
  softStartTimeoutMinutes?: number;
  startedAt?: Date;
  status?: "pending" | "started";
}
