"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaSessionStore = void 0;
const express_session_1 = __importDefault(require("express-session"));
const prisma_1 = require("../config/prisma");
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
function expiresAt(sessionData) {
    const cookieExpiry = sessionData.cookie.expires;
    return cookieExpiry ? new Date(cookieExpiry) : new Date(Date.now() + DEFAULT_TTL_MS);
}
class PrismaSessionStore extends express_session_1.default.Store {
    get(sessionId, callback) {
        prisma_1.prisma.session
            .findUnique({ where: { id: sessionId } })
            .then(async (record) => {
            if (!record)
                return callback(null, null);
            if (record.expiresAt <= new Date()) {
                await prisma_1.prisma.session.deleteMany({ where: { id: sessionId } });
                return callback(null, null);
            }
            callback(null, JSON.parse(record.data));
        })
            .catch(callback);
    }
    set(sessionId, sessionData, callback) {
        prisma_1.prisma.session
            .upsert({
            where: { id: sessionId },
            create: {
                id: sessionId,
                data: JSON.stringify(sessionData),
                expiresAt: expiresAt(sessionData),
            },
            update: {
                data: JSON.stringify(sessionData),
                expiresAt: expiresAt(sessionData),
            },
        })
            .then(() => callback?.())
            .catch((error) => callback?.(error));
    }
    destroy(sessionId, callback) {
        prisma_1.prisma.session
            .deleteMany({ where: { id: sessionId } })
            .then(() => callback?.())
            .catch((error) => callback?.(error));
    }
    touch(sessionId, sessionData, callback) {
        prisma_1.prisma.session
            .updateMany({
            where: { id: sessionId },
            data: { expiresAt: expiresAt(sessionData) },
        })
            .then(() => callback?.())
            .catch((error) => callback?.(error));
    }
}
exports.PrismaSessionStore = PrismaSessionStore;
