"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.groupRoutes = groupRoutes;
const auth_1 = require("../../middleware/auth");
const errors_1 = require("../../common/errors");
const repository_1 = require("./repository");
const JOIN_CODE_LENGTH = 8;
const JOIN_CODE_TTL_MINUTES = 60;
function serializeGroup(group) {
    if (!group)
        return null;
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
async function groupRoutes(app) {
    app.get("/api/groups", { preHandler: [auth_1.requireAuth] }, async (req) => {
        const groups = await (0, repository_1.findGroupsByMember)(req.userId);
        return groups.map(serializeGroup);
    });
    app.post("/api/groups", { preHandler: [auth_1.requireAuth] }, async (req) => {
        const body = req.body;
        const name = String(body?.name ?? "").trim();
        const memberIds = Array.isArray(body?.memberIds)
            ? body.memberIds.map((id) => String(id)).filter(Boolean)
            : [];
        if (!name) {
            throw new errors_1.AppError("INVALID_INPUT", 400, "Missing group name");
        }
        const { code, expiresAt } = generateJoinCode();
        const group = await (0, repository_1.createGroup)({
            name,
            hostId: req.userId,
            joinCode: code,
            joinCodeExpiresAt: expiresAt,
            status: "open"
        });
        const allMemberIds = Array.from(new Set([req.userId, ...memberIds]));
        for (const memberId of allMemberIds) {
            await (0, repository_1.addGroupMember)(group.id, memberId);
        }
        const fullGroup = await (0, repository_1.findGroupById)(group.id);
        return serializeGroup(fullGroup);
    });
    app.get("/api/groups/:groupId", { preHandler: [auth_1.requireAuth] }, async (req) => {
        const { groupId } = req.params;
        const group = await (0, repository_1.findGroupById)(groupId);
        if (!group) {
            throw new errors_1.AppError("NOT_FOUND", 404, "Group not found");
        }
        if (!group.members.includes(req.userId)) {
            throw new errors_1.AppError("UNAUTHORIZED", 403, "User is not a group member");
        }
        return serializeGroup(group);
    });
    app.post("/api/groups/join", { preHandler: [auth_1.requireAuth] }, async (req) => {
        const body = req.body;
        const code = String(body?.code ?? "").trim().toUpperCase();
        if (!code) {
            throw new errors_1.AppError("INVALID_INPUT", 400, "Missing join code");
        }
        const group = await (0, repository_1.findGroupByJoinCode)(code);
        if (!group) {
            throw new errors_1.AppError("NOT_FOUND", 404, "Group not found");
        }
        if (group.status === "locked" || group.status === "closed") {
            throw new errors_1.AppError("UNAUTHORIZED", 403, "Group is not open to join");
        }
        if (group.joinCodeExpiresAt && group.joinCodeExpiresAt < new Date()) {
            throw new errors_1.AppError("UNAUTHORIZED", 403, "Join code expired");
        }
        await (0, repository_1.addGroupMember)(group.id, req.userId);
        return {
            ok: true,
            groupId: group.id
        };
    });
    app.delete("/api/groups/:groupId/members/me", { preHandler: [auth_1.requireAuth] }, async (req) => {
        const { groupId } = req.params;
        const group = await (0, repository_1.findGroupById)(groupId);
        if (!group) {
            throw new errors_1.AppError("NOT_FOUND", 404, "Group not found");
        }
        if (!group.members.includes(req.userId)) {
            throw new errors_1.AppError("UNAUTHORIZED", 403, "User is not a group member");
        }
        const remainingMembers = group.members.filter((id) => id !== req.userId);
        await (0, repository_1.removeGroupMember)(group.id, req.userId);
        if (group.hostId === req.userId) {
            await (0, repository_1.setGroupHost)(group.id, remainingMembers[0]);
        }
        return { ok: true };
    });
    app.post("/api/groups/:groupId/join-code", { preHandler: [auth_1.requireAuth] }, async (req) => {
        const { groupId } = req.params;
        const group = await (0, repository_1.findGroupById)(groupId);
        if (!group) {
            throw new errors_1.AppError("NOT_FOUND", 404, "Group not found");
        }
        if (group.hostId !== req.userId) {
            throw new errors_1.AppError("UNAUTHORIZED", 403, "Only host can regenerate code");
        }
        const { code, expiresAt } = generateJoinCode();
        await (0, repository_1.updateGroupJoinCode)(group.id, code, expiresAt);
        return {
            joinCode: code,
            joinCodeExpiresAt: expiresAt
        };
    });
    app.post("/api/groups/:groupId/lock", { preHandler: [auth_1.requireAuth] }, async (req) => {
        const { groupId } = req.params;
        const group = await (0, repository_1.findGroupById)(groupId);
        if (!group) {
            throw new errors_1.AppError("NOT_FOUND", 404, "Group not found");
        }
        if (group.hostId !== req.userId) {
            throw new errors_1.AppError("UNAUTHORIZED", 403, "Only host can lock group");
        }
        await (0, repository_1.updateGroupStatus)(group.id, "locked");
        return { ok: true };
    });
    app.post("/api/groups/:groupId/unlock", { preHandler: [auth_1.requireAuth] }, async (req) => {
        const { groupId } = req.params;
        const group = await (0, repository_1.findGroupById)(groupId);
        if (!group) {
            throw new errors_1.AppError("NOT_FOUND", 404, "Group not found");
        }
        if (group.hostId !== req.userId) {
            throw new errors_1.AppError("UNAUTHORIZED", 403, "Only host can unlock group");
        }
        await (0, repository_1.updateGroupStatus)(group.id, "open");
        return { ok: true };
    });
}
function generateJoinCode() {
    const code = Array.from({ length: JOIN_CODE_LENGTH }, () => {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        return chars[Math.floor(Math.random() * chars.length)];
    }).join("");
    const expiresAt = new Date(Date.now() + JOIN_CODE_TTL_MINUTES * 60 * 1000);
    return { code, expiresAt };
}
