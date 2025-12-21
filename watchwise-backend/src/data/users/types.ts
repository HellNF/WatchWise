import { ObjectId } from "mongodb";

export type AuthProvider = "local" | "oauth";

export interface User {
  _id: ObjectId;

  email: string;
  username: string;

  avatar: string; // es. "avatar_01"

  authProvider: AuthProvider;
  passwordHash?: string;

  oauthProvider?: string;
  oauthId?: string;

  createdAt: Date;
  updatedAt: Date;
}
export type UpdateUserInput = Partial<
  Pick<User, "username" | "avatar">
>;