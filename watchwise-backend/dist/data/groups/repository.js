"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findGroupById = findGroupById;
const mongodb_1 = require("../../config/mongodb");
function collection() {
    return (0, mongodb_1.getDb)().collection("groups");
}
async function findGroupById(groupId) {
    return collection().findOne({ _id: groupId });
}
