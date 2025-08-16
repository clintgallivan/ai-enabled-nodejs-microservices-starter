import { PrismaClient } from "../../generated/prisma";
import { generateSecureToken, hashToken } from "utils/crypto";
import logger from "utils/logger";

const prisma = new PrismaClient();

export type TokenType = "password_reset" | "email_verify";

export interface CreateTokenOptions {
  userId: string;
  tokenType: TokenType;
  expiresInMs: number;
}

export interface TokenData {
  id: string;
  userId: string;
  tokenType: TokenType;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * Service for managing authentication tokens
 */
class AuthTokenService {
  /**
   * Create a new auth token
   * @param options Token creation options
   * @returns Object with plain token and token data
   */
  async createToken(options: CreateTokenOptions): Promise<{ token: string; tokenData: TokenData }> {
    const { userId, tokenType, expiresInMs } = options;

    // Generate secure token
    const plainToken = generateSecureToken();
    const hashedToken = hashToken(plainToken);
    const expiresAt = new Date(Date.now() + expiresInMs);

    // Store hashed token in database
    const tokenData = await prisma.auth_tokens.create({
      data: {
        user_id: userId,
        token_type: tokenType,
        token_hash: hashedToken,
        expires_at: expiresAt,
      },
    });

    logger.info("Auth token created", {
      userId,
      tokenType,
      expiresAt,
      tokenId: tokenData.id,
    });

    return {
      token: plainToken,
      tokenData: {
        id: tokenData.id,
        userId: tokenData.user_id,
        tokenType: tokenData.token_type as TokenType,
        tokenHash: tokenData.token_hash,
        expiresAt: tokenData.expires_at,
        createdAt: tokenData.created_at,
      },
    };
  }

  /**
   * Find and validate a token
   * @param plainToken The plain text token
   * @param tokenType The expected token type
   * @returns Token data with user info if valid, null if invalid/expired
   */
  async findValidToken(
    plainToken: string,
    tokenType: TokenType
  ): Promise<(TokenData & { user: { id: string; email: string } }) | null> {
    const hashedToken = hashToken(plainToken);

    // Find token that matches hash, type, and hasn't expired
    const tokenRecord = await prisma.auth_tokens.findFirst({
      where: {
        token_hash: hashedToken,
        token_type: tokenType,
        expires_at: {
          gt: new Date(), // Not expired
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!tokenRecord) {
      return null;
    }

    return {
      id: tokenRecord.id,
      userId: tokenRecord.user_id,
      tokenType: tokenRecord.token_type as TokenType,
      tokenHash: tokenRecord.token_hash,
      expiresAt: tokenRecord.expires_at,
      createdAt: tokenRecord.created_at,
      user: tokenRecord.user,
    };
  }

  /**
   * Consume (delete) a token after successful use
   * @param tokenId The token ID to delete
   */
  async consumeToken(tokenId: string): Promise<void> {
    await prisma.auth_tokens.delete({
      where: { id: tokenId },
    });

    logger.info("Auth token consumed", { tokenId });
  }

  /**
   * Revoke all tokens of a specific type for a user
   * @param userId The user ID
   * @param tokenType The token type to revoke
   */
  async revokeUserTokens(userId: string, tokenType: TokenType): Promise<void> {
    const result = await prisma.auth_tokens.deleteMany({
      where: {
        user_id: userId,
        token_type: tokenType,
      },
    });

    logger.info("User tokens revoked", {
      userId,
      tokenType,
      count: result.count,
    });
  }
}

export const authTokenService = new AuthTokenService();
