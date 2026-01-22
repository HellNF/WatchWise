import { ObjectId } from "mongodb";

export interface GroupSession {
  _id: ObjectId;

  groupId: ObjectId;

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
