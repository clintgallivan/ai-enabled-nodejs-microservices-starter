import crypto from "crypto";

/**
 * Generate a cryptographically secure random token
 * @param length - The length of the token in bytes (default: 32)
 * @returns A hex string token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

/**
 * Generate a secure hash of a token for database storage
 * @param token - The plain text token
 * @returns SHA256 hash of the token
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Compare a plain text token with its hashed version
 * @param plainToken - The plain text token
 * @param hashedToken - The hashed token from database
 * @returns True if tokens match
 */
export function verifyToken(plainToken: string, hashedToken: string): boolean {
  const hashedPlainToken = hashToken(plainToken);
  return crypto.timingSafeEqual(Buffer.from(hashedPlainToken), Buffer.from(hashedToken));
}
