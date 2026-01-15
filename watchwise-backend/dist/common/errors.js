"use strict";
// src/common/errors.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
class AppError extends Error {
    code;
    status;
    constructor(code, status, message) {
        super(message);
        this.code = code;
        this.status = status;
    }
}
exports.AppError = AppError;
