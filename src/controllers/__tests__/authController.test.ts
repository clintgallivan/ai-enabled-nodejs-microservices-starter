// Don't use the global mock for this test - we want to test the real implementation
jest.unmock("../authController");

// Create the mock prisma instance
const mockPrismaInstance = {
  users: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

// Mock all external dependencies
jest.mock("../../../generated/prisma", () => ({
  PrismaClient: jest.fn(() => mockPrismaInstance),
}));
jest.mock("bcrypt", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));
jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(),
  decode: jest.fn(),
}));
jest.mock("node:crypto", () => ({
  randomUUID: jest.fn(),
  randomBytes: jest.fn(),
}));
jest.mock("services/redis/jwtBlacklist");
jest.mock("services/redis/refreshTokens");
jest.mock("utils/assertions");

import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { blacklistToken } from "services/redis/jwtBlacklist";
import {
  storeRefreshToken,
  getUserIdForRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokensForUser,
  revokeRefreshTokenBySession,
} from "services/redis/refreshTokens";
import { expiresInToSeconds } from "utils/assertions";
import {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  getHealthToken,
  getLogsToken,
} from "../authController";
import { AuthenticatedRequest } from "../../types/auth";
import { generateTestData, setupTestEnvironment } from "tests/helpers/testHelpers";

// Type the mocked modules
const mockPrisma = mockPrismaInstance; // Use the instance created above

const mockBcrypt = bcrypt as any;
const mockJwt = jwt as any;
const mockCrypto = crypto as any;
const mockBlacklistToken = blacklistToken as jest.MockedFunction<typeof blacklistToken>;
const mockStoreRefreshToken = storeRefreshToken as jest.MockedFunction<typeof storeRefreshToken>;
const mockGetUserIdForRefreshToken = getUserIdForRefreshToken as jest.MockedFunction<
  typeof getUserIdForRefreshToken
>;
const mockRevokeRefreshToken = revokeRefreshToken as jest.MockedFunction<typeof revokeRefreshToken>;
const mockRevokeAllRefreshTokensForUser = revokeAllRefreshTokensForUser as jest.MockedFunction<
  typeof revokeAllRefreshTokensForUser
>;
const mockRevokeRefreshTokenBySession = revokeRefreshTokenBySession as jest.MockedFunction<
  typeof revokeRefreshTokenBySession
>;
const mockExpiresInToSeconds = expiresInToSeconds as jest.MockedFunction<typeof expiresInToSeconds>;

// Helper functions to create mock Express objects
const createMockRequest = (body: any = {}, overrides: Partial<Request> = {}): Partial<Request> => ({
  body,
  headers: { "user-agent": "test-agent" },
  ip: "127.0.0.1",
  socket: { remoteAddress: "127.0.0.1" } as any,
  ...overrides,
});

const createMockAuthenticatedRequest = (
  user: any = { userId: "test-user-id", email: "test@example.com", role: "user" },
  overrides: Partial<AuthenticatedRequest> = {}
): Partial<AuthenticatedRequest> => ({
  ...createMockRequest(),
  user,
  ...overrides,
});

const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
};

const createMockNext = (): NextFunction => jest.fn();

describe("authController", () => {
  setupTestEnvironment();

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup default mock implementations
    mockExpiresInToSeconds.mockReturnValue(3600);
    mockCrypto.randomUUID.mockReturnValue("mock-session-id");
    mockCrypto.randomBytes.mockReturnValue({
      toString: jest.fn().mockReturnValue("mock-random-token"),
    });
    mockJwt.sign.mockReturnValue("mock-jwt-token");
    mockJwt.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });
    mockBcrypt.hash.mockResolvedValue("hashed-password");
    mockBcrypt.compare.mockResolvedValue(true);
  });

  describe("registerUser", () => {
    it("should successfully register a new user", async () => {
      const userData = {
        id: generateTestData.userId(),
        email: generateTestData.email(),
        password_hash: "hashed-password",
        plan_tier: "free",
        role: "user",
        created_at: new Date(),
      };

      mockPrisma.users.findUnique.mockResolvedValue(null); // User doesn't exist
      mockPrisma.users.create.mockResolvedValue(userData);

      const req = createMockRequest({
        email: userData.email,
        password: "ValidPassword123!",
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await registerUser(req, res, next);

      expect(mockPrisma.users.findUnique).toHaveBeenCalledWith({
        where: { email: userData.email },
      });
      expect(mockBcrypt.hash).toHaveBeenCalledWith("ValidPassword123!", 10);
      expect(mockPrisma.users.create).toHaveBeenCalledWith({
        data: {
          email: userData.email,
          password_hash: "hashed-password",
          plan_tier: "free",
          created_at: expect.any(Date),
        },
      });
      expect(mockJwt.sign).toHaveBeenCalled();
      expect(mockStoreRefreshToken).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        token: "mock-jwt-token",
        refreshToken: expect.any(String),
        user: {
          id: userData.id,
          email: userData.email,
          planTier: userData.plan_tier,
          role: userData.role,
          createdAt: userData.created_at,
        },
      });
    });

    it("should return 409 if user already exists", async () => {
      const existingUser = {
        id: generateTestData.userId(),
        email: generateTestData.email(),
      };

      mockPrisma.users.findUnique.mockResolvedValue(existingUser);

      const req = createMockRequest({
        email: existingUser.email,
        password: "ValidPassword123!",
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await registerUser(req, res, next);

      expect(mockPrisma.users.findUnique).toHaveBeenCalledWith({
        where: { email: existingUser.email },
      });
      expect(mockPrisma.users.create).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ error: "User already exists." });
    });

    it("should handle database errors", async () => {
      const dbError = new Error("Database connection failed");
      mockPrisma.users.findUnique.mockRejectedValue(dbError);

      const req = createMockRequest({
        email: generateTestData.email(),
        password: "ValidPassword123!",
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await registerUser(req, res, next);

      expect(next).toHaveBeenCalledWith(dbError);
    });
  });

  describe("loginUser", () => {
    it("should successfully login a user with valid credentials", async () => {
      const userData = {
        id: generateTestData.userId(),
        email: generateTestData.email(),
        password_hash: "hashed-password",
        plan_tier: "free",
        role: "user",
        created_at: new Date(),
      };

      mockPrisma.users.findUnique.mockResolvedValue(userData);
      mockBcrypt.compare.mockResolvedValue(true);

      const req = createMockRequest({
        email: userData.email,
        password: "ValidPassword123!",
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await loginUser(req, res, next);

      expect(mockPrisma.users.findUnique).toHaveBeenCalledWith({
        where: { email: userData.email },
      });
      expect(mockBcrypt.compare).toHaveBeenCalledWith("ValidPassword123!", userData.password_hash);
      expect(mockJwt.sign).toHaveBeenCalled();
      expect(mockStoreRefreshToken).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        token: "mock-jwt-token",
        refreshToken: expect.any(String),
        user: {
          id: userData.id,
          email: userData.email,
          planTier: userData.plan_tier,
          role: userData.role,
          createdAt: userData.created_at,
        },
      });
    });

    it("should return 401 for non-existent user", async () => {
      mockPrisma.users.findUnique.mockResolvedValue(null);

      const req = createMockRequest({
        email: generateTestData.email(),
        password: "ValidPassword123!",
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await loginUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid credentials." });
    });

    it("should return 401 for invalid password", async () => {
      const userData = {
        id: generateTestData.userId(),
        email: generateTestData.email(),
        password_hash: "hashed-password",
      };

      mockPrisma.users.findUnique.mockResolvedValue(userData);
      mockBcrypt.compare.mockResolvedValue(false);

      const req = createMockRequest({
        email: userData.email,
        password: "WrongPassword123!",
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await loginUser(req, res, next);

      expect(mockBcrypt.compare).toHaveBeenCalledWith("WrongPassword123!", userData.password_hash);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid credentials." });
    });
  });

  describe("refreshAccessToken", () => {
    it("should successfully refresh access token", async () => {
      const userId = generateTestData.userId();
      const userData = {
        id: userId,
        email: generateTestData.email(),
        plan_tier: "free",
        role: "user",
      };

      mockGetUserIdForRefreshToken.mockResolvedValue(userId);
      mockPrisma.users.findUnique.mockResolvedValue(userData);

      const req = createMockRequest({
        refreshToken: "valid-refresh-token",
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await refreshAccessToken(req, res, next);

      expect(mockGetUserIdForRefreshToken).toHaveBeenCalledWith("valid-refresh-token");
      expect(mockRevokeRefreshToken).toHaveBeenCalledWith("valid-refresh-token");
      expect(mockStoreRefreshToken).toHaveBeenCalled();
      expect(mockJwt.sign).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        token: "mock-jwt-token",
        refreshToken: expect.any(String),
      });
    });

    it("should return 401 for invalid refresh token", async () => {
      mockGetUserIdForRefreshToken.mockResolvedValue(null);

      const req = createMockRequest({
        refreshToken: "invalid-refresh-token",
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await refreshAccessToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid refresh token" });
    });

    it("should return 404 if user not found after valid refresh token", async () => {
      const userId = generateTestData.userId();

      mockGetUserIdForRefreshToken.mockResolvedValue(userId);
      mockPrisma.users.findUnique.mockResolvedValue(null);

      const req = createMockRequest({
        refreshToken: "valid-refresh-token",
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await refreshAccessToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "User not found" });
    });
  });

  describe("logoutUser", () => {
    it("should successfully logout user with single session", async () => {
      const user = {
        userId: generateTestData.userId(),
        email: generateTestData.email(),
        sessionId: "test-session-id",
      };

      const req = createMockAuthenticatedRequest(user, {
        headers: { authorization: "Bearer mock-token" },
        query: {},
      }) as AuthenticatedRequest;
      const res = createMockResponse() as Response;

      // Setup jwt.decode to return a valid token with expiration
      mockJwt.decode.mockReturnValue({
        exp: Math.floor(Date.now() / 1000) + 3600,
        userId: user.userId,
        sessionId: user.sessionId,
      });

      await logoutUser(req, res);

      expect(mockBlacklistToken).toHaveBeenCalled();
      expect(mockRevokeRefreshTokenBySession).toHaveBeenCalledWith("test-session-id");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: "Logged out successfully" });
    });

    it("should logout all sessions when all=true", async () => {
      const user = {
        userId: generateTestData.userId(),
        email: generateTestData.email(),
        sessionId: "test-session-id",
      };

      const req = createMockAuthenticatedRequest(user, {
        headers: { authorization: "Bearer mock-token" },
        query: { all: "true" },
      }) as AuthenticatedRequest;
      const res = createMockResponse() as Response;

      await logoutUser(req, res);

      expect(mockBlacklistToken).toHaveBeenCalled();
      expect(mockRevokeAllRefreshTokensForUser).toHaveBeenCalledWith(user.userId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: "Logged out successfully" });
    });

    it("should return 401 if no token provided", async () => {
      const req = createMockAuthenticatedRequest(undefined, {
        headers: {},
      }) as AuthenticatedRequest;
      const res = createMockResponse() as Response;

      await logoutUser(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "No token provided" });
    });

    it("should handle invalid token format", async () => {
      mockJwt.decode.mockReturnValue(null);

      const req = createMockAuthenticatedRequest(undefined, {
        headers: { authorization: "Bearer invalid-token" },
      }) as AuthenticatedRequest;
      const res = createMockResponse() as Response;

      await logoutUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid token format" });
    });
  });

  describe("getHealthToken", () => {
    it("should return health token for admin user", () => {
      const adminUser = {
        userId: generateTestData.userId(),
        email: "admin@example.com",
        role: "admin",
      };

      const req = createMockAuthenticatedRequest(adminUser) as AuthenticatedRequest;
      const res = createMockResponse() as Response;

      getHealthToken(req, res);

      expect(mockJwt.sign).toHaveBeenCalledWith({ type: "health" }, expect.any(String), {
        expiresIn: expect.any(String),
      });
      expect(res.json).toHaveBeenCalledWith({ token: "mock-jwt-token" });
    });

    it("should return 403 for non-admin user", () => {
      const regularUser = {
        userId: generateTestData.userId(),
        email: "user@example.com",
        role: "user",
      };

      const req = createMockAuthenticatedRequest(regularUser) as AuthenticatedRequest;
      const res = createMockResponse() as Response;

      getHealthToken(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: "Forbidden: Admins only" });
    });

    it("should return 403 if no user in request", () => {
      const req = createMockAuthenticatedRequest(undefined) as AuthenticatedRequest;
      const res = createMockResponse() as Response;

      getHealthToken(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: "Forbidden: Admins only" });
    });
  });

  describe("getLogsToken", () => {
    it("should return logs token for admin user", () => {
      const adminUser = {
        userId: generateTestData.userId(),
        email: "admin@example.com",
        role: "admin",
      };

      const req = createMockAuthenticatedRequest(adminUser) as AuthenticatedRequest;
      const res = createMockResponse() as Response;

      getLogsToken(req, res);

      expect(mockJwt.sign).toHaveBeenCalledWith({ type: "logs" }, expect.any(String), {
        expiresIn: expect.any(String),
      });
      expect(res.json).toHaveBeenCalledWith({ token: "mock-jwt-token" });
    });

    it("should return 403 for non-admin user", () => {
      const regularUser = {
        userId: generateTestData.userId(),
        email: "user@example.com",
        role: "user",
      };

      const req = createMockAuthenticatedRequest(regularUser) as AuthenticatedRequest;
      const res = createMockResponse() as Response;

      getLogsToken(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: "Forbidden: Admins only" });
    });
  });

  describe("Error Handling", () => {
    it("should handle bcrypt errors in registration", async () => {
      const bcryptError = new Error("Bcrypt failed");
      mockPrisma.users.findUnique.mockResolvedValue(null);
      mockBcrypt.hash.mockRejectedValue(bcryptError);

      const req = createMockRequest({
        email: generateTestData.email(),
        password: "ValidPassword123!",
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await registerUser(req, res, next);

      expect(next).toHaveBeenCalledWith(bcryptError);
    });

    it("should handle Redis errors gracefully in logout", async () => {
      const redisError = new Error("Redis connection failed");
      mockBlacklistToken.mockRejectedValue(redisError);
      mockRevokeRefreshTokenBySession.mockRejectedValue(redisError);

      const user = {
        userId: generateTestData.userId(),
        email: generateTestData.email(),
        sessionId: "test-session-id",
      };

      const req = createMockAuthenticatedRequest(user, {
        headers: { authorization: "Bearer mock-token" },
        query: {},
      }) as AuthenticatedRequest;
      const res = createMockResponse() as Response;

      // Setup jwt.decode to return a valid token
      mockJwt.decode.mockReturnValue({
        exp: Math.floor(Date.now() / 1000) + 3600,
        userId: user.userId,
        sessionId: user.sessionId,
      });

      await logoutUser(req, res);

      // Should still complete logout even if Redis fails
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: "Logged out successfully" });
    });
  });
});
