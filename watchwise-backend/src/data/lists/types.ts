import { ObjectId } from "mongodb";

export interface UserList {
  _id: ObjectId;
  userId: ObjectId;
  name: string;
  slug: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserListItem {
  _id: ObjectId;
  userId: ObjectId;
  listId: ObjectId;
  movieId: string;
  addedAt: Date;
}
