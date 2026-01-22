import { ObjectId } from "mongodb";

export interface Group {
  _id: ObjectId;

  name: string;
  members: ObjectId[];

  hostId?: ObjectId;
  joinCode?: string;
  joinCodeExpiresAt?: Date;
  status?: "open" | "locked" | "closed";

  createdAt: Date;
}
