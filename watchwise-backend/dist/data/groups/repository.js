"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findGroupById = findGroupById;
exports.findGroupsByMember = findGroupsByMember;
exports.findGroupByJoinCode = findGroupByJoinCode;
exports.createGroup = createGroup;
exports.addGroupMember = addGroupMember;
exports.removeGroupMember = removeGroupMember;
exports.setGroupHost = setGroupHost;
exports.updateGroupJoinCode = updateGroupJoinCode;
exports.updateGroupStatus = updateGroupStatus;
const mongodb_1 = require("mongodb");
const mongodb_2 = require("../../config/mongodb");
function collection() {
    return (0, mongodb_2.getDb)().collection("groups");
}
async function findGroupById(groupId) {
    return collection().findOne({ _id: groupId });
}
async function findGroupsByMember(memberId) {
    return collection()
        .find({ members: memberId })
        .sort({ createdAt: -1 })
        .toArray();
}
async function findGroupByJoinCode(joinCode) {
    return collection().findOne({ joinCode });
}
async function createGroup(group) {
    const now = new Date();
    const document = {
        _id: new mongodb_1.ObjectId(),
        createdAt: now,
        ...group
    };
    await collection().insertOne(document);
    return document;
}
async function addGroupMember(groupId, userId) {
    await collection().updateOne({ _id: groupId }, { $addToSet: { members: userId } });
}
async function removeGroupMember(groupId, userId) {
    await collection().updateOne({ _id: groupId }, { $pull: { members: userId } });
    const group = await collection().findOne({ _id: groupId }, { projection: { members: 1 } });
    if (!group || group.members.length === 0) {
        await collection().deleteOne({ _id: groupId });
        await (0, mongodb_2.getDb)()
            .collection("groupSessions")
            .deleteMany({ groupId });
    }
}
async function setGroupHost(groupId, hostId) {
    await collection().updateOne({ _id: groupId }, hostId
        ? { $set: { hostId } }
        : { $unset: { hostId: 1 } });
}
async function updateGroupJoinCode(groupId, joinCode, expiresAt) {
    await collection().updateOne({ _id: groupId }, {
        $set: {
            joinCode,
            joinCodeExpiresAt: expiresAt
        }
    });
}
async function updateGroupStatus(groupId, status) {
    await collection().updateOne({ _id: groupId }, { $set: { status } });
}
