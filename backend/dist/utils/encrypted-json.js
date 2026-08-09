"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptJson = encryptJson;
exports.decryptJson = decryptJson;
const node_crypto_1 = require("node:crypto");
const auth_1 = require("../config/auth");
const algorithm = "aes-256-gcm";
const key = (0, node_crypto_1.createHash)("sha256")
    .update(`${auth_1.authConfig.sessionSecret}:gmail-credentials:v1`)
    .digest();
function encryptJson(value) {
    const initializationVector = (0, node_crypto_1.randomBytes)(12);
    const cipher = (0, node_crypto_1.createCipheriv)(algorithm, key, initializationVector);
    const encrypted = Buffer.concat([
        cipher.update(JSON.stringify(value), "utf8"),
        cipher.final(),
    ]);
    const authenticationTag = cipher.getAuthTag();
    return [
        "v1",
        initializationVector.toString("base64url"),
        authenticationTag.toString("base64url"),
        encrypted.toString("base64url"),
    ].join(".");
}
function decryptJson(encryptedValue) {
    const [version, initializationVector, authenticationTag, encrypted] = encryptedValue.split(".");
    if (version !== "v1" ||
        !initializationVector ||
        !authenticationTag ||
        !encrypted) {
        throw new Error("Encrypted value has an unsupported format");
    }
    const decipher = (0, node_crypto_1.createDecipheriv)(algorithm, key, Buffer.from(initializationVector, "base64url"));
    decipher.setAuthTag(Buffer.from(authenticationTag, "base64url"));
    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encrypted, "base64url")),
        decipher.final(),
    ]);
    return JSON.parse(decrypted.toString("utf8"));
}
