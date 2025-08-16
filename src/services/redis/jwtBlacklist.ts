import redis from "services/redis/redisClient";
import logger from "../../utils/logger";

/**
 * Add a JWT to the blacklist with a TTL matching its expiry.
 */
export async function blacklistToken(token: string, ttl: number) {
  try {
    await redis.set(`bl_${token}`, "blacklisted", { EX: ttl });
  } catch (error) {
    logger.error("Failed to blacklist token:", { error, ttl });
    throw error;
  }
}
/**
 * Check if a JWT is blacklisted.
 */
export async function isTokenBlacklisted(token: string): Promise<boolean> {
  try {
    const result = await redis.get(`bl_${token}`);
    return result === "blacklisted";
  } catch (error) {
    logger.error("Failed to check token blacklist:", { error });
    return false; // If Redis is down, assume token is not blacklisted
  }
}
