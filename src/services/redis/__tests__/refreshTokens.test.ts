// Mock the redis client with explicit path matching the import
jest.mock("services/redis/redisClient", () => require("../__mocks__/redisClient.mock").default);

import {
  storeRefreshToken,
  getUserIdForRefreshToken,
  getSessionIdForRefreshToken,
  getRefreshTokenForSession,
  revokeRefreshToken,
  revokeRefreshTokenBySession,
  revokeAllRefreshTokensForUser,
} from "../refreshTokens";
import { generateTestData, setupTestEnvironment } from "tests/helpers/testHelpers";
import mockRedis from "../__mocks__/redisClient.mock";

describe("Refresh Token Service", () => {
  setupTestEnvironment();

  describe("storeRefreshToken", () => {
    it("should store refresh token with all required mappings", async () => {
      const userId = generateTestData.userId();
      const sessionId = generateTestData.sessionId();
      const token = generateTestData.refreshToken();
      const ttlSeconds = 3600;

      mockRedis.set.mockResolvedValue("OK");
      mockRedis.sAdd.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      await storeRefreshToken(userId, sessionId, token, ttlSeconds);

      // Should store refresh token with all mappings
      // Should set token -> userId
      expect(mockRedis.set).toHaveBeenCalledWith(`rt_${token}`, userId, { EX: ttlSeconds });

      // Should set token -> sessionId
      expect(mockRedis.set).toHaveBeenCalledWith(`rts_${token}`, sessionId, { EX: ttlSeconds });

      // Should set sessionId -> token
      expect(mockRedis.set).toHaveBeenCalledWith(`srt_${sessionId}`, token, { EX: ttlSeconds });

      // Should add token to user's set
      expect(mockRedis.sAdd).toHaveBeenCalledWith(`rtu_${userId}`, token);

      // Should set expiry on user set
      expect(mockRedis.expire).toHaveBeenCalledWith(`rtu_${userId}`, ttlSeconds);
    });

    it("should handle Redis errors gracefully", async () => {
      const userId = "user-123";
      const sessionId = "session-456";
      const token = "refresh-token-789";
      const ttlSeconds = 3600;

      mockRedis.set.mockRejectedValue(new Error("Redis connection failed"));

      await expect(storeRefreshToken(userId, sessionId, token, ttlSeconds)).rejects.toThrow(
        "Redis connection failed"
      );
    });
  });

  describe("getUserIdForRefreshToken", () => {
    it("should retrieve userId for valid token", async () => {
      const token = "refresh-token-789";
      const expectedUserId = "user-123";

      mockRedis.get.mockResolvedValue(expectedUserId);

      const result = await getUserIdForRefreshToken(token);

      expect(mockRedis.get).toHaveBeenCalledWith("rt_refresh-token-789");
      expect(result).toBe(expectedUserId);
    });

    it("should return null for invalid token", async () => {
      const token = "invalid-token";

      mockRedis.get.mockResolvedValue(null);

      const result = await getUserIdForRefreshToken(token);

      expect(result).toBeNull();
    });

    it("should handle Redis errors", async () => {
      const token = "refresh-token-789";

      mockRedis.get.mockRejectedValue(new Error("Redis error"));

      const result = await getUserIdForRefreshToken(token);

      expect(result).toBeNull();
    });
  });

  describe("getSessionIdForRefreshToken", () => {
    it("should retrieve sessionId for valid token", async () => {
      const token = "refresh-token-789";
      const expectedSessionId = "session-456";

      mockRedis.get.mockResolvedValue(expectedSessionId);

      const result = await getSessionIdForRefreshToken(token);

      expect(mockRedis.get).toHaveBeenCalledWith("rts_refresh-token-789");
      expect(result).toBe(expectedSessionId);
    });

    it("should return null for invalid token", async () => {
      const token = "invalid-token";

      mockRedis.get.mockResolvedValue(null);

      const result = await getSessionIdForRefreshToken(token);

      expect(result).toBeNull();
    });
  });

  describe("getRefreshTokenForSession", () => {
    it("should retrieve token for valid sessionId", async () => {
      const sessionId = "session-456";
      const expectedToken = "refresh-token-789";

      mockRedis.get.mockResolvedValue(expectedToken);

      const result = await getRefreshTokenForSession(sessionId);

      expect(mockRedis.get).toHaveBeenCalledWith("srt_session-456");
      expect(result).toBe(expectedToken);
    });

    it("should return null for invalid sessionId", async () => {
      const sessionId = "invalid-session";

      mockRedis.get.mockResolvedValue(null);

      const result = await getRefreshTokenForSession(sessionId);

      expect(result).toBeNull();
    });
  });

  describe("revokeRefreshToken", () => {
    it("should revoke refresh token and clean up all mappings", async () => {
      const token = "refresh-token-789";
      const userId = "user-123";
      const sessionId = "session-456";

      // Mock getting userId and sessionId for the token
      mockRedis.get
        .mockResolvedValueOnce(userId) // getUserIdForRefreshToken
        .mockResolvedValueOnce(sessionId); // getSessionIdForRefreshToken

      mockRedis.del.mockResolvedValue(1);
      mockRedis.sRem.mockResolvedValue(1);

      await revokeRefreshToken(token);

      // Should delete token -> userId mapping
      expect(mockRedis.del).toHaveBeenCalledWith("rt_refresh-token-789");

      // Should delete token -> sessionId mapping
      expect(mockRedis.del).toHaveBeenCalledWith("rts_refresh-token-789");

      // Should delete sessionId -> token mapping
      expect(mockRedis.del).toHaveBeenCalledWith("srt_session-456");

      // Should remove token from user's set
      expect(mockRedis.sRem).toHaveBeenCalledWith("rtu_user-123", token);
    });

    it("should handle missing token gracefully", async () => {
      const token = "nonexistent-token";

      mockRedis.get.mockResolvedValue(null);

      // Should not throw error
      await expect(revokeRefreshToken(token)).resolves.not.toThrow();
    });
  });

  describe("revokeRefreshTokenBySession", () => {
    it("should revoke token by sessionId", async () => {
      const sessionId = "session-456";
      const token = "refresh-token-789";

      mockRedis.get.mockResolvedValue(token);
      mockRedis.del.mockResolvedValue(1);

      await revokeRefreshTokenBySession(sessionId);

      // Should get token for session
      expect(mockRedis.get).toHaveBeenCalledWith("srt_session-456");
    });

    it("should handle missing session gracefully", async () => {
      const sessionId = "nonexistent-session";

      mockRedis.get.mockResolvedValue(null);

      await expect(revokeRefreshTokenBySession(sessionId)).resolves.not.toThrow();
    });
  });

  describe("revokeAllRefreshTokensForUser", () => {
    it("should revoke all refresh tokens for a user", async () => {
      const userId = "user-123";
      const tokens = ["token1", "token2", "token3"];

      mockRedis.sMembers.mockResolvedValue(tokens);
      mockRedis.get.mockResolvedValue("session-456"); // Mock sessionId for each token
      mockRedis.del.mockResolvedValue(1);
      mockRedis.sRem.mockResolvedValue(1);

      await revokeAllRefreshTokensForUser(userId);

      // Should get all tokens for user
      expect(mockRedis.sMembers).toHaveBeenCalledWith("rtu_user-123");

      // Should delete user's token set
      expect(mockRedis.del).toHaveBeenCalledWith("rtu_user-123");

      // Should call revokeRefreshToken for each token (indirectly tested via del calls)
      expect(mockRedis.del).toHaveBeenCalledTimes(1 + tokens.length * 3); // user set + (3 mappings per token)
    });

    it("should handle user with no tokens", async () => {
      const userId = "user-with-no-tokens";

      mockRedis.sMembers.mockResolvedValue([]);

      await expect(revokeAllRefreshTokensForUser(userId)).resolves.not.toThrow();

      // Should get the user's token set
      expect(mockRedis.sMembers).toHaveBeenCalledWith("rtu_user-with-no-tokens");

      // Should NOT delete anything since there are no tokens
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it("should handle Redis errors during bulk revocation", async () => {
      const userId = "user-123";

      mockRedis.sMembers.mockRejectedValue(new Error("Redis error"));

      // Should not throw, should log error instead
      await expect(revokeAllRefreshTokensForUser(userId)).resolves.not.toThrow();
    });
  });

  describe("Token rotation workflow", () => {
    it("should support complete token rotation", async () => {
      const userId = "user-123";
      const oldSessionId = "old-session";
      const newSessionId = "new-session";
      const oldToken = "old-token";
      const newToken = "new-token";
      const ttlSeconds = 3600;

      // Store old token
      mockRedis.set.mockResolvedValue("OK");
      mockRedis.sAdd.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      await storeRefreshToken(userId, oldSessionId, oldToken, ttlSeconds);

      // Revoke old token
      mockRedis.get
        .mockResolvedValueOnce(userId) // getUserIdForRefreshToken
        .mockResolvedValueOnce(oldSessionId); // getSessionIdForRefreshToken
      mockRedis.del.mockResolvedValue(1);
      mockRedis.sRem.mockResolvedValue(1);

      await revokeRefreshToken(oldToken);

      // Store new token
      await storeRefreshToken(userId, newSessionId, newToken, ttlSeconds);

      // Verify workflow completed without errors
      expect(mockRedis.set).toHaveBeenCalledTimes(6); // 3 sets per token
      expect(mockRedis.del).toHaveBeenCalledTimes(3); // 3 deletes for old token
    });
  });
});
