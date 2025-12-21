import { ObjectId } from "mongodb";

export interface Group {
  _id: ObjectId;

  name: string;
  members: ObjectId[];

  createdAt: Date;
}
