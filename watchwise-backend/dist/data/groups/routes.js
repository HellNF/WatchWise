"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.groupRoutes = groupRoutes;
const mongodb_1 = require("mongodb");
const auth_1 = require("../../middleware/auth");
const errors_1 = require("../../common/errors");
const repository_1 = require("./repository");
const JOIN_CODE_LENGTH = 8;
const JOIN_CODE_TTL_MINUTES = 60;
async function groupRoutes(app) {
    app.get("/api/groups", { preHandler: [auth_1.requireAuth] }, async (req) => {
        const groups = await (0, repository_1.findGroupsByMember)(new mongodb_1.ObjectId(req.userId));
        return groups.map((group) => ({
            id: group._id.toString(),
            name: group.name,
            members: group.members.map((m) => m.toString()),
            hostId: group.hostId?.toString(),
            joinCode: group.joinCode,
            joinCodeExpiresAt: group.joinCodeExpiresAt,
            status: group.status
        }));
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
        const hostId = new mongodb_1.ObjectId(req.userId);
        const members = Array.from(new Set([hostId.toString(), ...memberIds])).map((id) => new mongodb_1.ObjectId(id));
        const { code, expiresAt } = generateJoinCode();
        const group = await (0, repository_1.createGroup)({
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
    });
    app.get("/api/groups/:groupId", { preHandler: [auth_1.requireAuth] }, async (req) => {
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
        return {
            id: group._id.toString(),
            name: group.name,
            members: group.members.map((m) => m.toString()),
            hostId: group.hostId?.toString(),
            joinCode: group.joinCode,
            joinCodeExpiresAt: group.joinCodeExpiresAt,
            status: group.status
        };
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
        await (0, repository_1.addGroupMember)(group._id, new mongodb_1.ObjectId(req.userId));
        return {
            ok: true,
            groupId: group._id.toString()
        };
    });
    app.delete("/api/groups/:groupId/members/me", { preHandler: [auth_1.requireAuth] }, async (req) => {
        const { groupId } = req.params;
        if (!mongodb_1.ObjectId.isValid(groupId)) {
            throw new errors_1.AppError("INVALID_INPUT", 400, "Invalid group id");
        }
        const groupObjectId = new mongodb_1.ObjectId(groupId);
        const userObjectId = new mongodb_1.ObjectId(req.userId);
        const group = await (0, repository_1.findGroupById)(groupObjectId);
        if (!group) {
            throw new errors_1.AppError("NOT_FOUND", 404, "Group not found");
        }
        const isMember = group.members.some((memberId) => memberId.equals(userObjectId));
        if (!isMember) {
            throw new errors_1.AppError("UNAUTHORIZED", 403, "User is not a group member");
        }
        const remainingMembers = group.members.filter((memberId) => !memberId.equals(userObjectId));
        await (0, repository_1.removeGroupMember)(group._id, userObjectId);
        if (group.hostId?.equals(userObjectId)) {
            const newHostId = remainingMembers[0];
            await (0, repository_1.setGroupHost)(group._id, newHostId);
        }
        return { ok: true };
    });
    app.post("/api/groups/:groupId/join-code", { preHandler: [auth_1.requireAuth] }, async (req) => {
        const { groupId } = req.params;
        if (!mongodb_1.ObjectId.isValid(groupId)) {
            throw new errors_1.AppError("INVALID_INPUT", 400, "Invalid group id");
        }
        const group = await (0, repository_1.findGroupById)(new mongodb_1.ObjectId(groupId));
        if (!group) {
            throw new errors_1.AppError("NOT_FOUND", 404, "Group not found");
        }
        if (group.hostId?.toString() !== req.userId) {
            throw new errors_1.AppError("UNAUTHORIZED", 403, "Only host can regenerate code");
        }
        const { code, expiresAt } = generateJoinCode();
        await (0, repository_1.updateGroupJoinCode)(group._id, code, expiresAt);
        return {
            joinCode: code,
            joinCodeExpiresAt: expiresAt
        };
    });
    app.post("/api/groups/:groupId/lock", { preHandler: [auth_1.requireAuth] }, async (req) => {
        const { groupId } = req.params;
        if (!mongodb_1.ObjectId.isValid(groupId)) {
            throw new errors_1.AppError("INVALID_INPUT", 400, "Invalid group id");
        }
        const group = await (0, repository_1.findGroupById)(new mongodb_1.ObjectId(groupId));
        if (!group) {
            throw new errors_1.AppError("NOT_FOUND", 404, "Group not found");
        }
        if (group.hostId?.toString() !== req.userId) {
            throw new errors_1.AppError("UNAUTHORIZED", 403, "Only host can lock group");
        }
        await (0, repository_1.updateGroupStatus)(group._id, "locked");
        return { ok: true };
    });
    app.post("/api/groups/:groupId/unlock", { preHandler: [auth_1.requireAuth] }, async (req) => {
        const { groupId } = req.params;
        if (!mongodb_1.ObjectId.isValid(groupId)) {
            throw new errors_1.AppError("INVALID_INPUT", 400, "Invalid group id");
        }
        const group = await (0, repository_1.findGroupById)(new mongodb_1.ObjectId(groupId));
        if (!group) {
            throw new errors_1.AppError("NOT_FOUND", 404, "Group not found");
        }
        if (group.hostId?.toString() !== req.userId) {
            throw new errors_1.AppError("UNAUTHORIZED", 403, "Only host can unlock group");
        }
        await (0, repository_1.updateGroupStatus)(group._id, "open");
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
