import redis from "services/redis/redisClient";
import logger from "utils/logger";

const PREFIX = "rt_"; // token -> userId
const USER_SET_PREFIX = "rtu_"; // per-user set of refresh tokens
const TOKEN_TO_SESSION = "rts_"; // token -> sessionId
const SESSION_TO_TOKEN = "srt_"; // sessionId -> token

export async function storeRefreshToken(
  userId: string,
  sessionId: string,
  token: string,
  ttlSeconds: number
): Promise<void> {
  try {
    // token -> userId
    await redis.set(`${PREFIX}${token}`, userId, { EX: ttlSeconds });
    // token -> sessionId
    await redis.set(`${TOKEN_TO_SESSION}${token}`, sessionId, { EX: ttlSeconds });
    // sessionId -> token
    await redis.set(`${SESSION_TO_TOKEN}${sessionId}`, token, { EX: ttlSeconds });
    // track token in user's set for bulk revoke
    await redis.sAdd(`${USER_SET_PREFIX}${userId}`, token);
    // align set TTL approximately with token TTL (best effort)
    await redis.expire(`${USER_SET_PREFIX}${userId}`, ttlSeconds);
  } catch (error) {
    logger.error("Failed to store refresh token", { error, userId });
    throw error;
  }
}

export async function getUserIdForRefreshToken(token: string): Promise<string | null> {
  try {
    const userId = await redis.get(`${PREFIX}${token}`);
    return userId || null;
  } catch (error) {
    logger.error("Failed to read refresh token", { error });
    return null;
  }
}

export async function getSessionIdForRefreshToken(token: string): Promise<string | null> {
  try {
    const sid = await redis.get(`${TOKEN_TO_SESSION}${token}`);
    return sid || null;
  } catch (error) {
    logger.error("Failed to read session id for refresh token", { error });
    return null;
  }
}

export async function getRefreshTokenForSession(sessionId: string): Promise<string | null> {
  try {
    const t = await redis.get(`${SESSION_TO_TOKEN}${sessionId}`);
    return t || null;
  } catch (error) {
    logger.error("Failed to read refresh token for session", { error });
    return null;
  }
}

export async function revokeRefreshToken(token: string): Promise<void> {
  try {
    const tokenKey = `${PREFIX}${token}`;
    const userId = await redis.get(tokenKey);
    const sessionId = await redis.get(`${TOKEN_TO_SESSION}${token}`);

    await redis.del(tokenKey);
    await redis.del(`${TOKEN_TO_SESSION}${token}`);
    if (sessionId) await redis.del(`${SESSION_TO_TOKEN}${sessionId}`);

    if (userId) {
      await redis.sRem(`${USER_SET_PREFIX}${userId}`, token);
    }
  } catch (error) {
    logger.error("Failed to revoke refresh token", { error });
    // Non-fatal
  }
}

export async function revokeRefreshTokenBySession(sessionId: string): Promise<void> {
  try {
    const token = await getRefreshTokenForSession(sessionId);
    if (token) {
      await revokeRefreshToken(token);
    }
  } catch (error) {
    logger.error("Failed to revoke refresh token by session", { error, sessionId });
  }
}

export async function revokeAllRefreshTokensForUser(userId: string): Promise<void> {
  try {
    const setKey = `${USER_SET_PREFIX}${userId}`;
    const tokens = await redis.sMembers(setKey);
    if (tokens && tokens.length > 0) {
      for (const t of tokens) {
        const sid = await redis.get(`${TOKEN_TO_SESSION}${t}`);
        await redis.del(`${PREFIX}${t}`);
        await redis.del(`${TOKEN_TO_SESSION}${t}`);
        if (sid) await redis.del(`${SESSION_TO_TOKEN}${sid}`);
        await redis.sRem(setKey, t);
      }
      await redis.del(setKey); // cleanup set key
    }
  } catch (error) {
    logger.error("Failed to revoke all refresh tokens for user", { error, userId });
  }
}
