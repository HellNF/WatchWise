import { ObjectId } from "mongodb";

export interface GroupFeedbackEvent {
  _id: ObjectId;

  sessionId: ObjectId;
  userId: ObjectId;

  movieId: string;

  rating?: number;
  liked?: boolean;

  createdAt: Date;
}
