"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.credentialAuthService = void 0;
const bcryptjs_1 = require("bcryptjs");
const prisma_1 = require("../config/prisma");
const FALLBACK_PASSWORD_HASH = (0, bcryptjs_1.hashSync)("unavailable-account-password", 12);
exports.credentialAuthService = {
    async authenticate({ username, password }) {
        const user = await prisma_1.prisma.user.findUnique({
            where: { username: username.toLowerCase() },
            select: {
                id: true,
                username: true,
                email: true,
                name: true,
                avatarUrl: true,
                passwordHash: true,
            },
        });
        const passwordMatches = await (0, bcryptjs_1.compare)(password, user?.passwordHash ?? FALLBACK_PASSWORD_HASH);
        if (!user?.passwordHash || !passwordMatches) {
            return null;
        }
        const { passwordHash: _passwordHash, ...publicUser } = user;
        return publicUser;
    },
};
