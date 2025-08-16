import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";

const prisma = new PrismaClient();

export type TokenType = "password_reset" | "email_verify";

/**
 * Simplified auth token service for cleanup operations only
 * This is specifically for the cleanup microservice
 */
class AuthTokenService {
  /**
   * Clean up expired tokens (should be run periodically)
   * @returns Number of tokens cleaned up
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await prisma.auth_tokens.deleteMany({
      where: {
        expires_at: {
          lt: new Date(), // Expired
        },
      },
    });

    if (result.count > 0) {
      logger.info("Expired tokens cleaned up", { count: result.count });
    }

    return result.count;
  }

  /**
   * Get token statistics
   */
  async getTokenStats(): Promise<{
    total: number;
    byType: Record<TokenType, number>;
    expired: number;
  }> {
    const now = new Date();

    const [total, passwordReset, emailVerify, expired] = await Promise.all([
      prisma.auth_tokens.count(),
      prisma.auth_tokens.count({ where: { token_type: "password_reset" } }),
      prisma.auth_tokens.count({ where: { token_type: "email_verify" } }),
      prisma.auth_tokens.count({ where: { expires_at: { lt: now } } }),
    ]);

    return {
      total,
      byType: {
        password_reset: passwordReset,
        email_verify: emailVerify,
      },
      expired,
    };
  }

  /**
   * Clean up tokens older than a certain age (regardless of expiration)
   * Useful for removing very old tokens that may have been orphaned
   * @param maxAgeMs Maximum age in milliseconds (default: 30 days)
   */
  async cleanupOldTokens(maxAgeMs: number = 30 * 24 * 60 * 60 * 1000): Promise<number> {
    const cutoffDate = new Date(Date.now() - maxAgeMs);

    const result = await prisma.auth_tokens.deleteMany({
      where: {
        created_at: {
          lt: cutoffDate,
        },
      },
    });

    if (result.count > 0) {
      logger.info("Old tokens cleaned up", {
        count: result.count,
        cutoffDate: cutoffDate.toISOString(),
      });
    }

    return result.count;
  }

  /**
   * Get database health check
   */
  async healthCheck(): Promise<{ healthy: boolean; message: string }> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { healthy: true, message: "Database connection healthy" };
    } catch (error) {
      return {
        healthy: false,
        message: `Database connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }
}

export const authTokenService = new AuthTokenService();
