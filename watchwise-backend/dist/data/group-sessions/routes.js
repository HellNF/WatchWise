"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.groupSessionRoutes = groupSessionRoutes;
const mongodb_1 = require("mongodb");
const auth_1 = require("../../middleware/auth");
const errors_1 = require("../../common/errors");
const repository_1 = require("../groups/repository");
const repository_2 = require("./repository");
const repository_3 = require("../preferences/repository");
async function groupSessionRoutes(app) {
    app.get("/api/groups/:groupId/questionnaire-status", { preHandler: [auth_1.requireAuth] }, async (req) => {
        const { groupId } = req.params;
        if (!mongodb_1.ObjectId.isValid(groupId)) {
            throw new errors_1.AppError("INVALID_INPUT", 400, "Invalid group id");
        }
        const group = await (0, repository_1.findGroupById)(new mongodb_1.ObjectId(groupId));
        if (!group) {
            throw new errors_1.AppError("NOT_FOUND", 404, "Group not found");
        }
        const isMember = group.members.some((memberId) => memberId.toString() === req.userId);
        if (!isMember) {
            throw new errors_1.AppError("UNAUTHORIZED", 403, "User is not a group member");
        }
        const dayStart = getDayStartUTC();
        const members = await Promise.all(group.members.map(async (memberId) => {
            const latest = await (0, repository_3.getLatestQuestionnaireEvent)(memberId);
            const completed = latest?.createdAt
                ? latest.createdAt >= dayStart
                : false;
            return {
                userId: memberId.toString(),
                completed,
                lastCompletedAt: latest?.createdAt ?? null
            };
        }));
        const completedCount = members.filter((m) => m.completed).length;
        return {
            groupId,
            dayStart,
            total: members.length,
            completed: completedCount,
            allComplete: completedCount === members.length,
            members
        };
    });
    app.post("/api/groups/:groupId/sessions", { preHandler: [auth_1.requireAuth] }, async (req) => {
        const { groupId } = req.params;
        if (!mongodb_1.ObjectId.isValid(groupId)) {
            throw new errors_1.AppError("INVALID_INPUT", 400, "Invalid group id");
        }
        const group = await (0, repository_1.findGroupById)(new mongodb_1.ObjectId(groupId));
        if (!group) {
            throw new errors_1.AppError("NOT_FOUND", 404, "Group not found");
        }
        const isMember = group.members.some((memberId) => memberId.toString() === req.userId);
        if (!isMember) {
            throw new errors_1.AppError("UNAUTHORIZED", 403, "User is not a group member");
        }
        const body = req.body;
        const context = body?.context ?? {};
        const softStartAt = new Date();
        const session = await (0, repository_2.createGroupSession)({
            groupId: new mongodb_1.ObjectId(groupId),
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
    });
    app.get("/api/groups/:groupId/sessions/:sessionId", { preHandler: [auth_1.requireAuth] }, async (req) => {
        const { groupId, sessionId } = req.params;
        if (!mongodb_1.ObjectId.isValid(groupId) || !mongodb_1.ObjectId.isValid(sessionId)) {
            throw new errors_1.AppError("INVALID_INPUT", 400, "Invalid group/session id");
        }
        const group = await (0, repository_1.findGroupById)(new mongodb_1.ObjectId(groupId));
        if (!group) {
            throw new errors_1.AppError("NOT_FOUND", 404, "Group not found");
        }
        const isMember = group.members.some((memberId) => memberId.toString() === req.userId);
        if (!isMember) {
            throw new errors_1.AppError("UNAUTHORIZED", 403, "User is not a group member");
        }
        const session = await (0, repository_2.findGroupSessionById)(new mongodb_1.ObjectId(sessionId));
        if (!session || session.groupId.toString() !== groupId) {
            throw new errors_1.AppError("NOT_FOUND", 404, "Group session not found");
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
    });
    app.post("/api/groups/:groupId/sessions/:sessionId/softstart", { preHandler: [auth_1.requireAuth] }, async (req) => {
        const { groupId, sessionId } = req.params;
        if (!mongodb_1.ObjectId.isValid(groupId) || !mongodb_1.ObjectId.isValid(sessionId)) {
            throw new errors_1.AppError("INVALID_INPUT", 400, "Invalid group/session id");
        }
        const group = await (0, repository_1.findGroupById)(new mongodb_1.ObjectId(groupId));
        if (!group) {
            throw new errors_1.AppError("NOT_FOUND", 404, "Group not found");
        }
        const isMember = group.members.some((memberId) => memberId.toString() === req.userId);
        if (!isMember) {
            throw new errors_1.AppError("UNAUTHORIZED", 403, "User is not a group member");
        }
        const session = await (0, repository_2.findGroupSessionById)(new mongodb_1.ObjectId(sessionId));
        if (!session || session.groupId.toString() !== groupId) {
            throw new errors_1.AppError("NOT_FOUND", 404, "Group session not found");
        }
        const body = req.body;
        const timeoutMinutes = Number(body?.timeoutMinutes ?? 10);
        const safeTimeout = Math.max(1, Math.min(timeoutMinutes, 30));
        const softStartAt = session.softStartAt ?? new Date();
        await (0, repository_2.updateGroupSessionById)(session._id, {
            softStartAt,
            softStartTimeoutMinutes: safeTimeout,
            status: session.status ?? "pending"
        });
        return {
            softStartAt,
            timeoutMinutes: safeTimeout
        };
    });
    app.post("/api/groups/:groupId/sessions/:sessionId/start", { preHandler: [auth_1.requireAuth] }, async (req) => {
        const { groupId, sessionId } = req.params;
        if (!mongodb_1.ObjectId.isValid(groupId) || !mongodb_1.ObjectId.isValid(sessionId)) {
            throw new errors_1.AppError("INVALID_INPUT", 400, "Invalid group/session id");
        }
        const group = await (0, repository_1.findGroupById)(new mongodb_1.ObjectId(groupId));
        if (!group) {
            throw new errors_1.AppError("NOT_FOUND", 404, "Group not found");
        }
        if (group.hostId?.toString() !== req.userId) {
            throw new errors_1.AppError("UNAUTHORIZED", 403, "Only host can start session");
        }
        const session = await (0, repository_2.findGroupSessionById)(new mongodb_1.ObjectId(sessionId));
        if (!session || session.groupId.toString() !== groupId) {
            throw new errors_1.AppError("NOT_FOUND", 404, "Group session not found");
        }
        const startedAt = new Date();
        await (0, repository_2.updateGroupSessionById)(session._id, {
            status: "started",
            startedAt
        });
        return { ok: true, startedAt };
    });
    app.get("/api/groups/:groupId/sessions/:sessionId/softstart/status", { preHandler: [auth_1.requireAuth] }, async (req) => {
        const { groupId, sessionId } = req.params;
        if (!mongodb_1.ObjectId.isValid(groupId) || !mongodb_1.ObjectId.isValid(sessionId)) {
            throw new errors_1.AppError("INVALID_INPUT", 400, "Invalid group/session id");
        }
        const group = await (0, repository_1.findGroupById)(new mongodb_1.ObjectId(groupId));
        if (!group) {
            throw new errors_1.AppError("NOT_FOUND", 404, "Group not found");
        }
        const isMember = group.members.some((memberId) => memberId.toString() === req.userId);
        if (!isMember) {
            throw new errors_1.AppError("UNAUTHORIZED", 403, "User is not a group member");
        }
        const session = await (0, repository_2.findGroupSessionById)(new mongodb_1.ObjectId(sessionId));
        if (!session || session.groupId.toString() !== groupId) {
            throw new errors_1.AppError("NOT_FOUND", 404, "Group session not found");
        }
        const dayStart = getDayStartUTC();
        const members = await Promise.all(group.members.map(async (memberId) => {
            const latest = await (0, repository_3.getLatestQuestionnaireEvent)(memberId);
            const completed = latest?.createdAt
                ? latest.createdAt >= dayStart
                : false;
            return {
                userId: memberId.toString(),
                completed,
                lastCompletedAt: latest?.createdAt ?? null
            };
        }));
        const completedCount = members.filter((m) => m.completed).length;
        const allComplete = completedCount === members.length;
        const timeoutMinutes = session.softStartTimeoutMinutes ?? 10;
        const softStartAt = session.softStartAt ?? new Date(session.createdAt);
        const timeoutAt = new Date(softStartAt.getTime() + timeoutMinutes * 60 * 1000);
        const now = new Date();
        const timedOut = now >= timeoutAt;
        let ready = allComplete || timedOut;
        let reason = "pending";
        if (allComplete)
            reason = "all_complete";
        else if (timedOut)
            reason = "timeout";
        if (ready && session.status !== "started") {
            await (0, repository_2.updateGroupSessionById)(session._id, {
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
    });
}
function getDayStartUTC() {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
