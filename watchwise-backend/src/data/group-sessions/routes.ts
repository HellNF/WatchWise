import { FastifyInstance } from "fastify";
import { ObjectId } from "mongodb";
import { requireAuth } from "../../middleware/auth";
import { AppError } from "../../common/errors";
import { findGroupById } from "../groups/repository";
import { createGroupSession, findGroupSessionById, updateGroupSessionById } from "./repository";
import { getLatestQuestionnaireEvent } from "../preferences/repository";

export async function groupSessionRoutes(app: FastifyInstance) {
  app.get(
    "/api/groups/:groupId/questionnaire-status",
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

      const dayStart = getDayStartUTC();
      const members = await Promise.all(
        group.members.map(async (memberId) => {
          const latest = await getLatestQuestionnaireEvent(memberId);
          const completed = latest?.createdAt
            ? latest.createdAt >= dayStart
            : false;
          return {
            userId: memberId.toString(),
            completed,
            lastCompletedAt: latest?.createdAt ?? null
          };
        })
      );

      const completedCount = members.filter((m) => m.completed).length;
      return {
        groupId,
        dayStart,
        total: members.length,
        completed: completedCount,
        allComplete: completedCount === members.length,
        members
      };
    }
  );

  app.post(
    "/api/groups/:groupId/sessions",
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

      const body = req.body as any;
      const context = body?.context ?? {};

      const softStartAt = new Date();
      const session = await createGroupSession({
        groupId: new ObjectId(groupId),
        context,
        createdAt: new Date(),
        status: "pending",
        softStartAt,
        softStartTimeoutMinutes: 10
      });

      return {
        id: session._id.toString(),
        groupId: session.groupId.toString(),
        context: session.context,
        createdAt: session.createdAt,
        selectedMovieId: session.selectedMovieId,
        status: session.status,
        softStartAt: session.softStartAt,
        softStartTimeoutMinutes: session.softStartTimeoutMinutes,
        startedAt: session.startedAt
      };
    }
  );

  app.get(
    "/api/groups/:groupId/sessions/:sessionId",
    { preHandler: [requireAuth] },
    async (req) => {
      const { groupId, sessionId } = req.params as {
        groupId: string;
        sessionId: string;
      };

      if (!ObjectId.isValid(groupId) || !ObjectId.isValid(sessionId)) {
        throw new AppError("INVALID_INPUT", 400, "Invalid group/session id");
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

      const session = await findGroupSessionById(new ObjectId(sessionId));
      if (!session || session.groupId.toString() !== groupId) {
        throw new AppError("NOT_FOUND", 404, "Group session not found");
      }

      return {
        id: session._id.toString(),
        groupId: session.groupId.toString(),
        context: session.context,
        createdAt: session.createdAt,
        selectedMovieId: session.selectedMovieId,
        status: session.status,
        softStartAt: session.softStartAt,
        softStartTimeoutMinutes: session.softStartTimeoutMinutes,
        startedAt: session.startedAt
      };
    }
  );

  app.post(
    "/api/groups/:groupId/sessions/:sessionId/softstart",
    { preHandler: [requireAuth] },
    async (req) => {
      const { groupId, sessionId } = req.params as {
        groupId: string;
        sessionId: string;
      };

      if (!ObjectId.isValid(groupId) || !ObjectId.isValid(sessionId)) {
        throw new AppError("INVALID_INPUT", 400, "Invalid group/session id");
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

      const session = await findGroupSessionById(new ObjectId(sessionId));
      if (!session || session.groupId.toString() !== groupId) {
        throw new AppError("NOT_FOUND", 404, "Group session not found");
      }

      const body = req.body as any;
      const timeoutMinutes = Number(body?.timeoutMinutes ?? 10);
      const safeTimeout = Math.max(1, Math.min(timeoutMinutes, 30));
      const softStartAt = session.softStartAt ?? new Date();

      await updateGroupSessionById(session._id, {
        softStartAt,
        softStartTimeoutMinutes: safeTimeout,
        status: session.status ?? "pending"
      });

      return {
        softStartAt,
        timeoutMinutes: safeTimeout
      };
    }
  );

  app.post(
    "/api/groups/:groupId/sessions/:sessionId/start",
    { preHandler: [requireAuth] },
    async (req) => {
      const { groupId, sessionId } = req.params as {
        groupId: string;
        sessionId: string;
      };

      if (!ObjectId.isValid(groupId) || !ObjectId.isValid(sessionId)) {
        throw new AppError("INVALID_INPUT", 400, "Invalid group/session id");
      }

      const group = await findGroupById(new ObjectId(groupId));
      if (!group) {
        throw new AppError("NOT_FOUND", 404, "Group not found");
      }

      if (group.hostId?.toString() !== req.userId) {
        throw new AppError("UNAUTHORIZED", 403, "Only host can start session");
      }

      const session = await findGroupSessionById(new ObjectId(sessionId));
      if (!session || session.groupId.toString() !== groupId) {
        throw new AppError("NOT_FOUND", 404, "Group session not found");
      }

      const startedAt = new Date();
      await updateGroupSessionById(session._id, {
        status: "started",
        startedAt
      });

      return { ok: true, startedAt };
    }
  );

  app.get(
    "/api/groups/:groupId/sessions/:sessionId/softstart/status",
    { preHandler: [requireAuth] },
    async (req) => {
      const { groupId, sessionId } = req.params as {
        groupId: string;
        sessionId: string;
      };

      if (!ObjectId.isValid(groupId) || !ObjectId.isValid(sessionId)) {
        throw new AppError("INVALID_INPUT", 400, "Invalid group/session id");
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

      const session = await findGroupSessionById(new ObjectId(sessionId));
      if (!session || session.groupId.toString() !== groupId) {
        throw new AppError("NOT_FOUND", 404, "Group session not found");
      }

      const dayStart = getDayStartUTC();
      const members = await Promise.all(
        group.members.map(async (memberId) => {
          const latest = await getLatestQuestionnaireEvent(memberId);
          const completed = latest?.createdAt
            ? latest.createdAt >= dayStart
            : false;
          return {
            userId: memberId.toString(),
            completed,
            lastCompletedAt: latest?.createdAt ?? null
          };
        })
      );

      const completedCount = members.filter((m) => m.completed).length;
      const allComplete = completedCount === members.length;

      const timeoutMinutes = session.softStartTimeoutMinutes ?? 10;
      const softStartAt = session.softStartAt ?? new Date(session.createdAt);
      const timeoutAt = new Date(softStartAt.getTime() + timeoutMinutes * 60 * 1000);
      const now = new Date();
      const timedOut = now >= timeoutAt;

      let ready = allComplete || timedOut;
      let reason: "all_complete" | "timeout" | "pending" = "pending";
      if (allComplete) reason = "all_complete";
      else if (timedOut) reason = "timeout";

      if (ready && session.status !== "started") {
        await updateGroupSessionById(session._id, {
          status: "started",
          startedAt: now
        });
      }

      return {
        groupId,
        sessionId,
        ready,
        reason,
        softStartAt,
        timeoutAt,
        questionnaire: {
          dayStart,
          total: members.length,
          completed: completedCount,
          allComplete,
          members
        }
      };
    }
  );
}

function getDayStartUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
