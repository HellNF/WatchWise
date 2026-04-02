// watchwise-backend/src/data/lists/types.ts

export interface UserList {
  id: string;
  userId: string;
  name: string;
  slug: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserListItem {
  id: string;
  userId: string;
  listId: string;
  movieId: string;
  addedAt: Date;
}
