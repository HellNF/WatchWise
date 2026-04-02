// watchwise-backend/src/data/group-feedback/types.ts

export interface GroupFeedbackEvent {
  id: string;
  sessionId: string;
  userId: string;
  movieId: string;
  rating?: number;
  liked?: boolean;
  createdAt: Date;
}
