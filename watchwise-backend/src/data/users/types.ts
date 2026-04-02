// watchwise-backend/src/data/users/types.ts

export interface User {
  id: string;           // UUID da Supabase Auth
  username: string;
  avatar: string;
  createdAt: Date;
  updatedAt: Date;
}

export type UpdateUserInput = Partial<Pick<User, "username" | "avatar">>;
export type CreateUserInput = Pick<User, "id" | "username" | "avatar">;
