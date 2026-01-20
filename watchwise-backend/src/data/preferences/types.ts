import { ObjectId } from "mongodb";

export type PreferenceType =
  | "genre"
  | "actor"
  | "director"
  | "mood"
  | "energy"
  | "company"
  | "duration"
  | "novelty";

export type PreferenceSource =
  | "questionnaire"
  | "watch"
  | "explicit"
  | "implicit";

export interface UserPreferenceEvent {
  _id: ObjectId;
  userId: ObjectId;
  type: PreferenceType;
  value: string;
  weight: number; // 0..1
  source: PreferenceSource;
  createdAt: Date;
}
