import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { authConfig } from "../config/auth";

const algorithm = "aes-256-gcm";
const key = createHash("sha256")
  .update(`${authConfig.sessionSecret}:gmail-credentials:v1`)
  .digest();

export function encryptJson(value: unknown) {
  const initializationVector = randomBytes(12);
  const cipher = createCipheriv(algorithm, key, initializationVector);
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

export function decryptJson<T>(encryptedValue: string): T {
  const [version, initializationVector, authenticationTag, encrypted] =
    encryptedValue.split(".");
  if (
    version !== "v1" ||
    !initializationVector ||
    !authenticationTag ||
    !encrypted
  ) {
    throw new Error("Encrypted value has an unsupported format");
  }

  const decipher = createDecipheriv(
    algorithm,
    key,
    Buffer.from(initializationVector, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(authenticationTag, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString("utf8")) as T;
}
