import { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth";
import { AppError } from "../../common/errors";
import {
  addGroupMember,
  createGroup,
  findGroupById,
  findGroupByJoinCode,
  findGroupsByMember,
  removeGroupMember,
  setGroupHost,
  updateGroupJoinCode,
  updateGroupStatus
} from "./repository";

const JOIN_CODE_LENGTH = 8;
const JOIN_CODE_TTL_MINUTES = 60;

function serializeGroup(group: Awaited<ReturnType<typeof findGroupById>>) {
  if (!group) return null;
  return {
    id: group.id,
    name: group.name,
    members: group.members,
    hostId: group.hostId,
    joinCode: group.joinCode,
    joinCodeExpiresAt: group.joinCodeExpiresAt,
    status: group.status
  };
}

export async function groupRoutes(app: FastifyInstance) {
  app.get(
    "/api/groups",
    { preHandler: [requireAuth] },
    async (req) => {
      const groups = await findGroupsByMember(req.userId!);
      return groups.map(serializeGroup);
    }
  );

  app.post(
    "/api/groups",
    { preHandler: [requireAuth] },
    async (req) => {
      const body = req.body as any;
      const name = String(body?.name ?? "").trim();
      const memberIds = Array.isArray(body?.memberIds)
        ? body.memberIds.map((id: string) => String(id)).filter(Boolean)
        : [];

      if (!name) {
        throw new AppError("INVALID_INPUT", 400, "Missing group name");
      }

      const { code, expiresAt } = generateJoinCode();

      const group = await createGroup({
        name,
        hostId: req.userId!,
        joinCode: code,
        joinCodeExpiresAt: expiresAt,
        status: "open"
      });

      const allMemberIds = Array.from(new Set([req.userId!, ...memberIds]));
      for (const memberId of allMemberIds) {
        await addGroupMember(group.id, memberId);
      }

      const fullGroup = await findGroupById(group.id);
      return serializeGroup(fullGroup);
    }
  );

  app.get(
    "/api/groups/:groupId",
    { preHandler: [requireAuth] },
    async (req) => {
      const { groupId } = req.params as { groupId: string };

      const group = await findGroupById(groupId);
      if (!group) {
        throw new AppError("NOT_FOUND", 404, "Group not found");
      }

      if (!group.members.includes(req.userId!)) {
        throw new AppError("UNAUTHORIZED", 403, "User is not a group member");
      }

      return serializeGroup(group);
    }
  );

  app.post(
    "/api/groups/join",
    { preHandler: [requireAuth] },
    async (req) => {
      const body = req.body as any;
      const code = String(body?.code ?? "").trim().toUpperCase();

      if (!code) {
        throw new AppError("INVALID_INPUT", 400, "Missing join code");
      }

      const group = await findGroupByJoinCode(code);
      if (!group) {
        throw new AppError("NOT_FOUND", 404, "Group not found");
      }

      if (group.status === "locked" || group.status === "closed") {
        throw new AppError("UNAUTHORIZED", 403, "Group is not open to join");
      }

      if (group.joinCodeExpiresAt && group.joinCodeExpiresAt < new Date()) {
        throw new AppError("UNAUTHORIZED", 403, "Join code expired");
      }

      await addGroupMember(group.id, req.userId!);

      return {
        ok: true,
        groupId: group.id
      };
    }
  );

  app.delete(
    "/api/groups/:groupId/members/me",
    { preHandler: [requireAuth] },
    async (req) => {
      const { groupId } = req.params as { groupId: string };

      const group = await findGroupById(groupId);
      if (!group) {
        throw new AppError("NOT_FOUND", 404, "Group not found");
      }

      if (!group.members.includes(req.userId!)) {
        throw new AppError("UNAUTHORIZED", 403, "User is not a group member");
      }

      const remainingMembers = group.members.filter((id) => id !== req.userId);

      await removeGroupMember(group.id, req.userId!);

      if (group.hostId === req.userId) {
        await setGroupHost(group.id, remainingMembers[0]);
      }

      return { ok: true };
    }
  );

  app.post(
    "/api/groups/:groupId/join-code",
    { preHandler: [requireAuth] },
    async (req) => {
      const { groupId } = req.params as { groupId: string };

      const group = await findGroupById(groupId);
      if (!group) {
        throw new AppError("NOT_FOUND", 404, "Group not found");
      }

      if (group.hostId !== req.userId) {
        throw new AppError("UNAUTHORIZED", 403, "Only host can regenerate code");
      }

      const { code, expiresAt } = generateJoinCode();
      await updateGroupJoinCode(group.id, code, expiresAt);

      return {
        joinCode: code,
        joinCodeExpiresAt: expiresAt
      };
    }
  );

  app.post(
    "/api/groups/:groupId/lock",
    { preHandler: [requireAuth] },
    async (req) => {
      const { groupId } = req.params as { groupId: string };

      const group = await findGroupById(groupId);
      if (!group) {
        throw new AppError("NOT_FOUND", 404, "Group not found");
      }

      if (group.hostId !== req.userId) {
        throw new AppError("UNAUTHORIZED", 403, "Only host can lock group");
      }

      await updateGroupStatus(group.id, "locked");
      return { ok: true };
    }
  );

  app.post(
    "/api/groups/:groupId/unlock",
    { preHandler: [requireAuth] },
    async (req) => {
      const { groupId } = req.params as { groupId: string };

      const group = await findGroupById(groupId);
      if (!group) {
        throw new AppError("NOT_FOUND", 404, "Group not found");
      }

      if (group.hostId !== req.userId) {
        throw new AppError("UNAUTHORIZED", 403, "Only host can unlock group");
      }

      await updateGroupStatus(group.id, "open");
      return { ok: true };
    }
  );
}

function generateJoinCode() {
  const code = Array.from({ length: JOIN_CODE_LENGTH }, () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return chars[Math.floor(Math.random() * chars.length)];
  }).join("");

  const expiresAt = new Date(Date.now() + JOIN_CODE_TTL_MINUTES * 60 * 1000);
  return { code, expiresAt };
}
