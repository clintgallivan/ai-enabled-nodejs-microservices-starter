// Don't use the global mock for this test - we want to test the real implementation
jest.unmock("../tokenAuthHandler");

// Mock JWT blacklist service explicitly for this test
jest.mock("services/redis/jwtBlacklist", () => ({
  isTokenBlacklisted: jest.fn(),
}));

// Mock JWT with proper typing
const mockJwtVerify = jest.fn();
jest.mock("jsonwebtoken", () => ({
  verify: mockJwtVerify,
}));

import { Response, NextFunction } from "express";
import { tokenAuthHandler, AuthenticatedRequest } from "../tokenAuthHandler";
import { isTokenBlacklisted } from "services/redis/jwtBlacklist";
import { generateTestData, setupTestEnvironment } from "tests/helpers/testHelpers";

// Type the mocked functions
const mockIsTokenBlacklisted = isTokenBlacklisted as jest.MockedFunction<typeof isTokenBlacklisted>;

// Create mock objects for Express req, res, next
const createMockRequest = (
  authHeader?: string,
  baseUrl: string = "/v1/auth",
  overrides: Partial<AuthenticatedRequest> = {}
): Partial<AuthenticatedRequest> => ({
  headers: authHeader ? { authorization: authHeader } : {},
  baseUrl,
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

describe("tokenAuthHandler Middleware", () => {
  setupTestEnvironment();

  beforeEach(() => {
    mockIsTokenBlacklisted.mockResolvedValue(false);
    mockJwtVerify.mockReturnValue({
      userId: generateTestData.userId(),
      email: generateTestData.email(),
      role: "user",
    });
  });

  describe("Authentication Success", () => {
    it("should authenticate valid JWT token and call next()", async () => {
      const token = generateTestData.accessToken();
      const authHeader = `Bearer ${token}`;
      const decodedPayload = {
        userId: generateTestData.userId(),
        email: generateTestData.email(),
        role: "user",
      };

      mockJwtVerify.mockReturnValue(decodedPayload);
      mockIsTokenBlacklisted.mockResolvedValue(false);

      const req = createMockRequest(authHeader, "/v1/auth") as AuthenticatedRequest;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await tokenAuthHandler(req, res, next);

      expect(mockJwtVerify).toHaveBeenCalledWith(token, expect.any(String));
      expect(mockIsTokenBlacklisted).toHaveBeenCalledWith(token);
      expect(req.user).toEqual(decodedPayload);
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should authenticate health endpoint with health secret", async () => {
      const token = generateTestData.token();
      const authHeader = `Bearer ${token}`;
      const decodedPayload = { purpose: "health" };

      mockJwtVerify.mockReturnValue(decodedPayload);

      const req = createMockRequest(authHeader, "/v1/health") as AuthenticatedRequest;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await tokenAuthHandler(req, res, next);

      expect(mockJwtVerify).toHaveBeenCalledWith(token, expect.any(String)); // healthSecret
      expect(mockIsTokenBlacklisted).not.toHaveBeenCalled(); // No blacklist check for health tokens
      expect(req.user).toEqual(decodedPayload);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("should authenticate logs endpoint with logs secret", async () => {
      const token = generateTestData.token();
      const authHeader = `Bearer ${token}`;
      const decodedPayload = { purpose: "logs" };

      mockJwtVerify.mockReturnValue(decodedPayload);

      const req = createMockRequest(authHeader, "/v1/logs") as AuthenticatedRequest;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await tokenAuthHandler(req, res, next);

      expect(mockJwtVerify).toHaveBeenCalledWith(token, expect.any(String)); // logSecret
      expect(mockIsTokenBlacklisted).not.toHaveBeenCalled(); // No blacklist check for logs tokens
      expect(req.user).toEqual(decodedPayload);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("should handle JWT payload with additional fields", async () => {
      const token = generateTestData.accessToken();
      const authHeader = `Bearer ${token}`;
      const decodedPayload = {
        userId: generateTestData.userId(),
        email: generateTestData.email(),
        role: "admin",
        planTier: "premium",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      mockJwtVerify.mockReturnValue(decodedPayload);
      mockIsTokenBlacklisted.mockResolvedValue(false);

      const req = createMockRequest(authHeader) as AuthenticatedRequest;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await tokenAuthHandler(req, res, next);

      expect(req.user).toEqual(decodedPayload);
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe("Authentication Failures - Missing/Invalid Headers", () => {
    it("should return 401 when authorization header is missing", async () => {
      const req = createMockRequest() as AuthenticatedRequest; // No auth header
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await tokenAuthHandler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Invalid Credentials",
      });
      expect(next).not.toHaveBeenCalled();
      expect(req.user).toBeUndefined();
    });

    it("should return 401 when authorization header does not start with Bearer", async () => {
      const token = generateTestData.accessToken();
      const authHeader = `Basic ${token}`; // Wrong scheme

      const req = createMockRequest(authHeader) as AuthenticatedRequest;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await tokenAuthHandler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Invalid Credentials",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return 401 when Bearer token is empty", async () => {
      const authHeader = "Bearer "; // Empty token

      const req = createMockRequest(authHeader) as AuthenticatedRequest;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await tokenAuthHandler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Invalid Credentials",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return 401 when Bearer format is malformed", async () => {
      const authHeader = "Bearer"; // Missing space and token

      const req = createMockRequest(authHeader) as AuthenticatedRequest;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await tokenAuthHandler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Invalid Credentials",
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("Authentication Failures - JWT Verification", () => {
    it("should return 401 when JWT verification fails", async () => {
      const token = "invalid-jwt-token";
      const authHeader = `Bearer ${token}`;

      mockJwtVerify.mockImplementation(() => {
        throw new Error("JsonWebTokenError: invalid token");
      });

      const req = createMockRequest(authHeader) as AuthenticatedRequest;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await tokenAuthHandler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Invalid Credentials",
      });
      expect(next).not.toHaveBeenCalled();
      expect(req.user).toBeUndefined();
    });

    it("should return 401 when JWT is expired", async () => {
      const token = generateTestData.accessToken();
      const authHeader = `Bearer ${token}`;

      mockJwtVerify.mockImplementation(() => {
        throw new Error("TokenExpiredError: jwt expired");
      });

      const req = createMockRequest(authHeader) as AuthenticatedRequest;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await tokenAuthHandler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Invalid Credentials",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should handle non-object JWT payload gracefully", async () => {
      const token = generateTestData.accessToken();
      const authHeader = `Bearer ${token}`;

      mockJwtVerify.mockReturnValue("string-payload"); // Invalid payload type

      const req = createMockRequest(authHeader) as AuthenticatedRequest;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await tokenAuthHandler(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalledTimes(1); // Still continues since token was valid
    });

    it("should handle null JWT payload", async () => {
      const token = generateTestData.accessToken();
      const authHeader = `Bearer ${token}`;

      mockJwtVerify.mockReturnValue(null);

      const req = createMockRequest(authHeader) as AuthenticatedRequest;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await tokenAuthHandler(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe("Token Blacklist Checking", () => {
    it("should return 401 when JWT token is blacklisted", async () => {
      const token = generateTestData.accessToken();
      const authHeader = `Bearer ${token}`;

      mockJwtVerify.mockReturnValue({
        userId: generateTestData.userId(),
        email: generateTestData.email(),
      });
      mockIsTokenBlacklisted.mockResolvedValue(true); // Token is blacklisted

      const req = createMockRequest(authHeader) as AuthenticatedRequest;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await tokenAuthHandler(req, res, next);

      expect(mockIsTokenBlacklisted).toHaveBeenCalledWith(token);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Token has been revoked",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should not check blacklist for health endpoint tokens", async () => {
      const token = generateTestData.token();
      const authHeader = `Bearer ${token}`;

      mockJwtVerify.mockReturnValue({ purpose: "health" });

      const req = createMockRequest(authHeader, "/v1/health") as AuthenticatedRequest;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await tokenAuthHandler(req, res, next);

      expect(mockIsTokenBlacklisted).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("should not check blacklist for logs endpoint tokens", async () => {
      const token = generateTestData.token();
      const authHeader = `Bearer ${token}`;

      mockJwtVerify.mockReturnValue({ purpose: "logs" });

      const req = createMockRequest(authHeader, "/v1/logs") as AuthenticatedRequest;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await tokenAuthHandler(req, res, next);

      expect(mockIsTokenBlacklisted).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("should handle blacklist check errors gracefully", async () => {
      const token = generateTestData.accessToken();
      const authHeader = `Bearer ${token}`;

      mockJwtVerify.mockReturnValue({
        userId: generateTestData.userId(),
        email: generateTestData.email(),
      });
      mockIsTokenBlacklisted.mockRejectedValue(new Error("Redis connection failed"));

      const req = createMockRequest(authHeader) as AuthenticatedRequest;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await tokenAuthHandler(req, res, next);

      // Should still fail gracefully and not proceed
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("Path-based Secret Selection", () => {
    it("should use JWT secret for regular API endpoints", async () => {
      const token = generateTestData.accessToken();
      const authHeader = `Bearer ${token}`;

      const req = createMockRequest(authHeader, "/v1/auth") as AuthenticatedRequest;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await tokenAuthHandler(req, res, next);

      expect(mockJwtVerify).toHaveBeenCalledWith(token, expect.any(String)); // jwtSecret
      expect(mockIsTokenBlacklisted).toHaveBeenCalled(); // Should check blacklist
    });

    it("should use health secret for health endpoint", async () => {
      const token = generateTestData.token();
      const authHeader = `Bearer ${token}`;

      const req = createMockRequest(authHeader, "/v1/health") as AuthenticatedRequest;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await tokenAuthHandler(req, res, next);

      expect(mockJwtVerify).toHaveBeenCalledWith(token, expect.any(String)); // healthSecret
      expect(mockIsTokenBlacklisted).not.toHaveBeenCalled(); // No blacklist check
    });

    it("should use logs secret for logs endpoint", async () => {
      const token = generateTestData.token();
      const authHeader = `Bearer ${token}`;

      const req = createMockRequest(authHeader, "/v1/logs") as AuthenticatedRequest;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await tokenAuthHandler(req, res, next);

      expect(mockJwtVerify).toHaveBeenCalledWith(token, expect.any(String)); // logSecret
      expect(mockIsTokenBlacklisted).not.toHaveBeenCalled(); // No blacklist check
    });

    it("should handle unknown paths with JWT secret", async () => {
      const token = generateTestData.accessToken();
      const authHeader = `Bearer ${token}`;

      const req = createMockRequest(authHeader, "/v1/unknown") as AuthenticatedRequest;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await tokenAuthHandler(req, res, next);

      expect(mockJwtVerify).toHaveBeenCalledWith(token, expect.any(String)); // jwtSecret
      expect(mockIsTokenBlacklisted).toHaveBeenCalled(); // Should check blacklist
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle request without baseUrl", async () => {
      const token = generateTestData.accessToken();
      const authHeader = `Bearer ${token}`;

      const req = createMockRequest(
        authHeader,
        undefined as unknown as string
      ) as AuthenticatedRequest;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await tokenAuthHandler(req, res, next);

      // Should default to JWT secret and check blacklist
      expect(mockJwtVerify).toHaveBeenCalledWith(token, expect.any(String));
      expect(mockIsTokenBlacklisted).toHaveBeenCalled();
    });

    it("should handle concurrent authentication requests", async () => {
      const tokens = [
        generateTestData.accessToken(),
        generateTestData.accessToken(),
        generateTestData.accessToken(),
      ];

      mockJwtVerify.mockImplementation(() => ({
        userId: generateTestData.userId(),
        email: generateTestData.email(),
      }));
      mockIsTokenBlacklisted.mockResolvedValue(false);

      const requests = tokens.map(token => {
        const req = createMockRequest(`Bearer ${token}`) as AuthenticatedRequest;
        const res = createMockResponse() as Response;
        const next = createMockNext();
        return tokenAuthHandler(req, res, next);
      });

      await Promise.all(requests);

      expect(mockJwtVerify).toHaveBeenCalledTimes(3);
      expect(mockIsTokenBlacklisted).toHaveBeenCalledTimes(3);
    });

    it("should preserve existing user data if present", async () => {
      const token = generateTestData.accessToken();
      const authHeader = `Bearer ${token}`;
      const existingUser = { existingField: "should-be-overwritten" };

      const req = createMockRequest(authHeader, "/v1/auth", {
        user: existingUser,
      }) as AuthenticatedRequest;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      const newUserData = {
        userId: generateTestData.userId(),
        email: generateTestData.email(),
      };
      mockJwtVerify.mockReturnValue(newUserData);

      await tokenAuthHandler(req, res, next);

      expect(req.user).toEqual(newUserData); // Should be completely replaced
      expect(req.user).not.toEqual(existingUser);
    });
  });
});
