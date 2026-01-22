import { FastifyInstance } from "fastify";
import { ObjectId } from "mongodb";
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

export async function groupRoutes(app: FastifyInstance) {
  app.get(
    "/api/groups",
    { preHandler: [requireAuth] },
    async (req) => {
      const groups = await findGroupsByMember(new ObjectId(req.userId!));
      return groups.map((group) => ({
        id: group._id.toString(),
        name: group.name,
        members: group.members.map((m) => m.toString()),
        hostId: group.hostId?.toString(),
        joinCode: group.joinCode,
        joinCodeExpiresAt: group.joinCodeExpiresAt,
        status: group.status
      }));
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

      const hostId = new ObjectId(req.userId!);
      const members = Array.from(
        new Set([hostId.toString(), ...memberIds])
      ).map((id) => new ObjectId(id));

      const { code, expiresAt } = generateJoinCode();

      const group = await createGroup({
        name,
        members,
        hostId,
        joinCode: code,
        joinCodeExpiresAt: expiresAt,
        status: "open"
      });

      return {
        id: group._id.toString(),
        name: group.name,
        members: group.members.map((m) => m.toString()),
        hostId: group.hostId?.toString(),
        joinCode: group.joinCode,
        joinCodeExpiresAt: group.joinCodeExpiresAt,
        status: group.status
      };
    }
  );

  app.get(
    "/api/groups/:groupId",
    { preHandler: [requireAuth] },
    async (req) => {
      const { groupId } = req.params as { groupId: string };
      if (!ObjectId.isValid(groupId)) {
        throw new AppError("INVALID_INPUT", 400, "Invalid group id");
      }

      const group = await findGroupById(new ObjectId(groupId));
      if (!group) {
        throw new AppError("NOT_FOUND", 404, "Group not found");
      }

      const isMember = group.members.some(
        (memberId) => memberId.toString() === req.userId
      );
      if (!isMember) {
        throw new AppError("UNAUTHORIZED", 403, "User is not a group member");
      }

      return {
        id: group._id.toString(),
        name: group.name,
        members: group.members.map((m) => m.toString()),
        hostId: group.hostId?.toString(),
        joinCode: group.joinCode,
        joinCodeExpiresAt: group.joinCodeExpiresAt,
        status: group.status
      };
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

      await addGroupMember(group._id, new ObjectId(req.userId!));

      return {
        ok: true,
        groupId: group._id.toString()
      };
    }
  );

  app.delete(
    "/api/groups/:groupId/members/me",
    { preHandler: [requireAuth] },
    async (req) => {
      const { groupId } = req.params as { groupId: string };
      if (!ObjectId.isValid(groupId)) {
        throw new AppError("INVALID_INPUT", 400, "Invalid group id");
      }

      const groupObjectId = new ObjectId(groupId);
      const userObjectId = new ObjectId(req.userId!);

      const group = await findGroupById(groupObjectId);
      if (!group) {
        throw new AppError("NOT_FOUND", 404, "Group not found");
      }

      const isMember = group.members.some((memberId) =>
        memberId.equals(userObjectId)
      );
      if (!isMember) {
        throw new AppError("UNAUTHORIZED", 403, "User is not a group member");
      }

      const remainingMembers = group.members.filter(
        (memberId) => !memberId.equals(userObjectId)
      );

      await removeGroupMember(group._id, userObjectId);

      if (group.hostId?.equals(userObjectId)) {
        const newHostId = remainingMembers[0];
        await setGroupHost(group._id, newHostId);
      }

      return { ok: true };
    }
  );

  app.post(
    "/api/groups/:groupId/join-code",
    { preHandler: [requireAuth] },
    async (req) => {
      const { groupId } = req.params as { groupId: string };
      if (!ObjectId.isValid(groupId)) {
        throw new AppError("INVALID_INPUT", 400, "Invalid group id");
      }

      const group = await findGroupById(new ObjectId(groupId));
      if (!group) {
        throw new AppError("NOT_FOUND", 404, "Group not found");
      }

      if (group.hostId?.toString() !== req.userId) {
        throw new AppError("UNAUTHORIZED", 403, "Only host can regenerate code");
      }

      const { code, expiresAt } = generateJoinCode();
      await updateGroupJoinCode(group._id, code, expiresAt);

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
      if (!ObjectId.isValid(groupId)) {
        throw new AppError("INVALID_INPUT", 400, "Invalid group id");
      }

      const group = await findGroupById(new ObjectId(groupId));
      if (!group) {
        throw new AppError("NOT_FOUND", 404, "Group not found");
      }

      if (group.hostId?.toString() !== req.userId) {
        throw new AppError("UNAUTHORIZED", 403, "Only host can lock group");
      }

      await updateGroupStatus(group._id, "locked");
      return { ok: true };
    }
  );

  app.post(
    "/api/groups/:groupId/unlock",
    { preHandler: [requireAuth] },
    async (req) => {
      const { groupId } = req.params as { groupId: string };
      if (!ObjectId.isValid(groupId)) {
        throw new AppError("INVALID_INPUT", 400, "Invalid group id");
      }

      const group = await findGroupById(new ObjectId(groupId));
      if (!group) {
        throw new AppError("NOT_FOUND", 404, "Group not found");
      }

      if (group.hostId?.toString() !== req.userId) {
        throw new AppError("UNAUTHORIZED", 403, "Only host can unlock group");
      }

      await updateGroupStatus(group._id, "open");
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
