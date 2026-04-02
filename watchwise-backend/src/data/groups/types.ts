// watchwise-backend/src/data/groups/types.ts

export interface Group {
  id: string;
  name: string;
  members: string[];   // array di userId (derivato da group_members)
  hostId?: string;
  joinCode?: string;
  joinCodeExpiresAt?: Date;
  status?: "open" | "locked" | "closed";
  createdAt: Date;
}
