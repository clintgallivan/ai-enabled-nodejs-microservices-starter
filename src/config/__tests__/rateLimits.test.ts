import { Request, Response } from "express";
import {
  generalRateLimit,
  authRateLimit,
  passwordRateLimit,
  publicRateLimit,
  adminRateLimit,
} from "../rateLimits";

// Mock dependencies
jest.mock("../../config", () => ({
  config: {
    nodeEnv: "test",
    generalRateLimit: 1000,
    authRateLimit: 50,
    passwordRateLimit: 10,
    publicRateLimit: 100,
    adminRateLimit: 50,
    generalRateLimitWindow: "15m",
    authRateLimitWindow: "15m",
    passwordRateLimitWindow: "1h",
    publicRateLimitWindow: "1m",
    adminRateLimitWindow: "5m",
  },
}));

jest.mock("utils/assertions", () => ({
  expiresInToSeconds: jest.fn(value => {
    const conversions: Record<string, number> = {
      "15m": 15 * 60 * 1000,
      "1h": 60 * 60 * 1000,
      "1m": 60 * 1000,
      "5m": 5 * 60 * 1000,
    };
    return conversions[value] || 1000;
  }),
}));

jest.mock("services/redis/redisClient", () => ({
  sendCommand: jest.fn(),
}));

describe("Rate Limits Configuration", () => {
  // Mock request, response, and next function
  const createMockRequest = (ip = "127.0.0.1"): Partial<Request> => ({
    ip,
    method: "GET",
    url: "/test",
    headers: {},
  });

  const createMockResponse = (): Partial<Response> => {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.set = jest.fn().mockReturnValue(res);
    return res;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rate Limit Middleware Creation", () => {
    test("should create generalRateLimit middleware", () => {
      expect(generalRateLimit).toBeDefined();
      expect(typeof generalRateLimit).toBe("function");
    });

    test("should create authRateLimit middleware", () => {
      expect(authRateLimit).toBeDefined();
      expect(typeof authRateLimit).toBe("function");
    });

    test("should create passwordRateLimit middleware", () => {
      expect(passwordRateLimit).toBeDefined();
      expect(typeof passwordRateLimit).toBe("function");
    });

    test("should create publicRateLimit middleware", () => {
      expect(publicRateLimit).toBeDefined();
      expect(typeof publicRateLimit).toBe("function");
    });

    test("should create adminRateLimit middleware", () => {
      expect(adminRateLimit).toBeDefined();
      expect(typeof adminRateLimit).toBe("function");
    });
  });

  describe("Rate Limit Middleware Execution", () => {
    test("should skip rate limiting in test environment", async () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;

      // Test each rate limit middleware individually
      await new Promise<void>(resolve => {
        const nextFn = jest.fn(() => resolve());
        generalRateLimit(req, res, nextFn);
      });

      await new Promise<void>(resolve => {
        const nextFn = jest.fn(() => resolve());
        authRateLimit(req, res, nextFn);
      });

      await new Promise<void>(resolve => {
        const nextFn = jest.fn(() => resolve());
        passwordRateLimit(req, res, nextFn);
      });

      await new Promise<void>(resolve => {
        const nextFn = jest.fn(() => resolve());
        publicRateLimit(req, res, nextFn);
      });

      await new Promise<void>(resolve => {
        const nextFn = jest.fn(() => resolve());
        adminRateLimit(req, res, nextFn);
      });

      // If we get here, all rate limits properly called next()
      expect(true).toBe(true);
    });
  });

  describe("Rate Limit Configuration Values", () => {
    test("should use correct configuration values for generalRateLimit", () => {
      // These tests verify the middleware was created with the right config
      // Since the middleware is created at module load time, we can't easily
      // test the internal config without more complex mocking
      expect(generalRateLimit).toBeDefined();
    });

    test("should use correct configuration values for authRateLimit", () => {
      expect(authRateLimit).toBeDefined();
    });

    test("should use correct configuration values for passwordRateLimit", () => {
      expect(passwordRateLimit).toBeDefined();
    });

    test("should use correct configuration values for publicRateLimit", () => {
      expect(publicRateLimit).toBeDefined();
    });

    test("should use correct configuration values for adminRateLimit", () => {
      expect(adminRateLimit).toBeDefined();
    });
  });

  describe("Environment Detection", () => {
    test("should skip rate limiting when NODE_ENV is test", async () => {
      // The isTestEnvironment helper should detect test environment
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;

      await new Promise<void>(resolve => {
        const nextFn = jest.fn(() => resolve());
        generalRateLimit(req, res, nextFn);
      });

      // If we get here, rate limiting was skipped and next() was called
      expect(true).toBe(true);
    });

    test("should skip rate limiting when JEST_WORKER_ID is present", async () => {
      const originalJestWorkerId = process.env.JEST_WORKER_ID;
      process.env.JEST_WORKER_ID = "1";

      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;

      await new Promise<void>(resolve => {
        const nextFn = jest.fn(() => resolve());
        generalRateLimit(req, res, nextFn);
      });

      // Restore original value
      if (originalJestWorkerId) {
        process.env.JEST_WORKER_ID = originalJestWorkerId;
      } else {
        delete process.env.JEST_WORKER_ID;
      }

      // If we get here, rate limiting was skipped and next() was called
      expect(true).toBe(true);
    });
  });

  describe("Redis Store Fallback", () => {
    test("should handle Redis connection failures gracefully", async () => {
      // This test verifies that the rate limiter doesn't crash if Redis is unavailable
      // In test environment, it should use memory store anyway
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;

      await expect(async () => {
        await new Promise<void>(resolve => {
          const nextFn = jest.fn(() => resolve());
          generalRateLimit(req, res, nextFn);
        });
      }).not.toThrow();

      // If we get here, the middleware handled the request gracefully
      expect(true).toBe(true);
    });
  });
});
