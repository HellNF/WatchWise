// watchwise-backend/src/data/preferences/types.ts

export type PreferenceType =
  | "genre"
  | "actor"
  | "director"
  | "mood"
  | "energy"
  | "company"
  | "duration"
  | "novelty"
  | "movie";

export type PreferenceSource =
  | "questionnaire"
  | "watch"
  | "explicit"
  | "implicit"
  | "feedback";

export interface UserPreferenceEvent {
  id: string;
  userId: string;
  type: PreferenceType;
  value: string;
  weight: number;
  source: PreferenceSource;
  createdAt: Date;
}
