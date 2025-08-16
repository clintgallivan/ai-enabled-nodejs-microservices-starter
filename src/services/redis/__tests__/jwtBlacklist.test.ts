// Mock Redis client explicitly for this test file
jest.mock("services/redis/redisClient", () => require("../__mocks__/redisClient.mock").default);

import { blacklistToken, isTokenBlacklisted } from "../jwtBlacklist";
import mockRedisClient from "../__mocks__/redisClient.mock";
import { generateTestData, setupTestEnvironment } from "tests/helpers/testHelpers";

describe("JWT Blacklist Service", () => {
  setupTestEnvironment();

  describe("blacklistToken", () => {
    it("should successfully blacklist a token with TTL", async () => {
      const token = generateTestData.token();
      const ttl = 3600; // 1 hour

      mockRedisClient.set.mockResolvedValue("OK");

      await blacklistToken(token, ttl);

      expect(mockRedisClient.set).toHaveBeenCalledWith(`bl_${token}`, "blacklisted", { EX: ttl });
    });

    it("should handle different TTL values", async () => {
      const token = generateTestData.token();
      const ttlValues = [300, 1800, 3600, 86400]; // 5m, 30m, 1h, 24h

      mockRedisClient.set.mockResolvedValue("OK");

      for (const ttl of ttlValues) {
        await blacklistToken(token, ttl);

        expect(mockRedisClient.set).toHaveBeenCalledWith(`bl_${token}`, "blacklisted", { EX: ttl });
      }

      expect(mockRedisClient.set).toHaveBeenCalledTimes(ttlValues.length);
    });

    it("should handle Redis errors and rethrow", async () => {
      const token = generateTestData.token();
      const ttl = 3600;
      const redisError = new Error("Redis connection failed");

      mockRedisClient.set.mockRejectedValue(redisError);

      await expect(blacklistToken(token, ttl)).rejects.toThrow("Redis connection failed");

      expect(mockRedisClient.set).toHaveBeenCalledWith(`bl_${token}`, "blacklisted", { EX: ttl });
    });

    it("should use correct key prefix for blacklisted tokens", async () => {
      const token = "test-jwt-token-123";
      const ttl = 1800;

      mockRedisClient.set.mockResolvedValue("OK");

      await blacklistToken(token, ttl);

      expect(mockRedisClient.set).toHaveBeenCalledWith("bl_test-jwt-token-123", "blacklisted", {
        EX: ttl,
      });
    });

    it("should handle zero TTL", async () => {
      const token = generateTestData.token();
      const ttl = 0;

      mockRedisClient.set.mockResolvedValue("OK");

      await blacklistToken(token, ttl);

      expect(mockRedisClient.set).toHaveBeenCalledWith(`bl_${token}`, "blacklisted", { EX: ttl });
    });

    it("should handle empty token string", async () => {
      const token = "";
      const ttl = 3600;

      mockRedisClient.set.mockResolvedValue("OK");

      await blacklistToken(token, ttl);

      expect(mockRedisClient.set).toHaveBeenCalledWith("bl_", "blacklisted", { EX: ttl });
    });
  });

  describe("isTokenBlacklisted", () => {
    it("should return true for blacklisted token", async () => {
      const token = generateTestData.token();

      mockRedisClient.get.mockResolvedValue("blacklisted");

      const result = await isTokenBlacklisted(token);

      expect(result).toBe(true);
      expect(mockRedisClient.get).toHaveBeenCalledWith(`bl_${token}`);
    });

    it("should return false for non-blacklisted token", async () => {
      const token = generateTestData.token();

      mockRedisClient.get.mockResolvedValue(null);

      const result = await isTokenBlacklisted(token);

      expect(result).toBe(false);
      expect(mockRedisClient.get).toHaveBeenCalledWith(`bl_${token}`);
    });

    it("should return false for expired blacklisted token", async () => {
      const token = generateTestData.token();

      // When a key expires, Redis returns null
      mockRedisClient.get.mockResolvedValue(null);

      const result = await isTokenBlacklisted(token);

      expect(result).toBe(false);
      expect(mockRedisClient.get).toHaveBeenCalledWith(`bl_${token}`);
    });

    it("should return false when Redis throws an error (graceful degradation)", async () => {
      const token = generateTestData.token();
      const redisError = new Error("Redis timeout");

      mockRedisClient.get.mockRejectedValue(redisError);

      const result = await isTokenBlacklisted(token);

      expect(result).toBe(false);
      expect(mockRedisClient.get).toHaveBeenCalledWith(`bl_${token}`);
    });

    it("should handle different token formats", async () => {
      const tokens = [
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9", // JWT format
        "simple-token-123",
        "token_with_underscores",
        "token-with-dashes",
        "12345678901234567890",
      ];

      mockRedisClient.get.mockResolvedValue("blacklisted");

      for (const token of tokens) {
        const result = await isTokenBlacklisted(token);

        expect(result).toBe(true);
        expect(mockRedisClient.get).toHaveBeenCalledWith(`bl_${token}`);
      }

      expect(mockRedisClient.get).toHaveBeenCalledTimes(tokens.length);
    });

    it("should use correct key prefix when checking blacklist", async () => {
      const token = "test-jwt-token-456";

      mockRedisClient.get.mockResolvedValue("blacklisted");

      await isTokenBlacklisted(token);

      expect(mockRedisClient.get).toHaveBeenCalledWith("bl_test-jwt-token-456");
    });

    it("should handle empty token string", async () => {
      const token = "";

      mockRedisClient.get.mockResolvedValue(null);

      const result = await isTokenBlacklisted(token);

      expect(result).toBe(false);
      expect(mockRedisClient.get).toHaveBeenCalledWith("bl_");
    });
  });

  describe("Integration Scenarios", () => {
    it("should blacklist and then correctly identify blacklisted token", async () => {
      const token = generateTestData.token();
      const ttl = 1800;

      // First blacklist the token
      mockRedisClient.set.mockResolvedValue("OK");
      await blacklistToken(token, ttl);

      // Then check if it's blacklisted
      mockRedisClient.get.mockResolvedValue("blacklisted");
      const isBlacklisted = await isTokenBlacklisted(token);

      expect(isBlacklisted).toBe(true);
      expect(mockRedisClient.set).toHaveBeenCalledWith(`bl_${token}`, "blacklisted", { EX: ttl });
      expect(mockRedisClient.get).toHaveBeenCalledWith(`bl_${token}`);
    });

    it("should handle concurrent blacklist operations", async () => {
      const tokens = [generateTestData.token(), generateTestData.token(), generateTestData.token()];
      const ttl = 3600;

      mockRedisClient.set.mockResolvedValue("OK");

      // Blacklist multiple tokens concurrently
      await Promise.all(tokens.map(token => blacklistToken(token, ttl)));

      expect(mockRedisClient.set).toHaveBeenCalledTimes(3);
      tokens.forEach(token => {
        expect(mockRedisClient.set).toHaveBeenCalledWith(`bl_${token}`, "blacklisted", { EX: ttl });
      });
    });

    it("should handle mixed blacklist check operations", async () => {
      const blacklistedToken = generateTestData.token();
      const validToken = generateTestData.token();

      mockRedisClient.get
        .mockResolvedValueOnce("blacklisted") // First call - blacklisted
        .mockResolvedValueOnce(null); // Second call - not blacklisted

      const [isBlacklistedResult, isValidResult] = await Promise.all([
        isTokenBlacklisted(blacklistedToken),
        isTokenBlacklisted(validToken),
      ]);

      expect(isBlacklistedResult).toBe(true);
      expect(isValidResult).toBe(false);
      expect(mockRedisClient.get).toHaveBeenCalledTimes(2);
    });
  });
});
