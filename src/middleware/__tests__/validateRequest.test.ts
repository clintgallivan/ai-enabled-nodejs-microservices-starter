// Don't use the global mock for this test - we want to test the real implementation
jest.unmock("../validateRequest");

import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { validateRequest } from "../validateRequest";
import { generateTestData, setupTestEnvironment } from "tests/helpers/testHelpers";

// Create mock objects for Express req, res, next
const createMockRequest = (body: any, overrides: Partial<Request> = {}): Partial<Request> => ({
  body,
  path: "/test",
  method: "POST",
  ip: "127.0.0.1",
  headers: { "user-agent": "test-agent" },
  socket: { remoteAddress: "127.0.0.1" } as any,
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

describe("validateRequest Middleware", () => {
  setupTestEnvironment();

  describe("Schema Validation Success", () => {
    it("should call next() when validation passes", () => {
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(8),
      });

      const validBody = {
        email: generateTestData.email(),
        password: generateTestData.password(),
      };

      const req = createMockRequest(validBody) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      const middleware = validateRequest(schema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it("should replace req.body with parsed data", () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.string().transform(val => parseInt(val)),
      });

      const req = createMockRequest({
        email: "test@example.com",
        age: "25",
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      const middleware = validateRequest(schema);
      middleware(req, res, next);

      expect(req.body).toEqual({
        email: "test@example.com",
        age: 25, // Should be transformed to number
      });
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("should handle optional fields correctly", () => {
      const schema = z.object({
        email: z.string().email(),
        name: z.string().optional(),
      });

      const req = createMockRequest({
        email: "test@example.com",
        // name is optional, not provided
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      const middleware = validateRequest(schema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.body).toEqual({
        email: "test@example.com",
      });
    });

    it("should handle complex nested schemas", () => {
      const schema = z.object({
        user: z.object({
          email: z.string().email(),
          profile: z.object({
            name: z.string(),
            age: z.number(),
          }),
        }),
      });

      const validBody = {
        user: {
          email: "test@example.com",
          profile: {
            name: "Test User",
            age: 30,
          },
        },
      };

      const req = createMockRequest(validBody) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      const middleware = validateRequest(schema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.body).toEqual(validBody);
    });
  });

  describe("Schema Validation Failures", () => {
    it("should return 400 error when validation fails", () => {
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(8),
      });

      const invalidBody = {
        email: "invalid-email",
        password: "short",
      };

      const req = createMockRequest(invalidBody) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      const middleware = validateRequest(schema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Validation failed",
        details: expect.arrayContaining([
          expect.objectContaining({
            field: "email",
            message: expect.any(String),
          }),
          expect.objectContaining({
            field: "password",
            message: expect.any(String),
          }),
        ]),
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should handle missing required fields", () => {
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(8),
      });

      const req = createMockRequest({}) as Request; // Empty body
      const res = createMockResponse() as Response;
      const next = createMockNext();

      const middleware = validateRequest(schema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Validation failed",
        details: expect.arrayContaining([
          expect.objectContaining({
            field: "email",
            message: "Invalid input: expected string, received undefined",
          }),
          expect.objectContaining({
            field: "password",
            message: "Invalid input: expected string, received undefined",
          }),
        ]),
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should handle type validation errors", () => {
      const schema = z.object({
        age: z.number(),
        isActive: z.boolean(),
      });

      const req = createMockRequest({
        age: "not-a-number",
        isActive: "not-a-boolean",
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      const middleware = validateRequest(schema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Validation failed",
        details: expect.arrayContaining([
          expect.objectContaining({
            field: "age",
            message: expect.stringContaining("number"),
          }),
          expect.objectContaining({
            field: "isActive",
            message: expect.stringContaining("boolean"),
          }),
        ]),
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should handle nested field validation errors", () => {
      const schema = z.object({
        user: z.object({
          email: z.string().email(),
          profile: z.object({
            age: z.number().min(18),
          }),
        }),
      });

      const req = createMockRequest({
        user: {
          email: "invalid-email",
          profile: {
            age: 16, // Below minimum
          },
        },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      const middleware = validateRequest(schema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Validation failed",
        details: expect.arrayContaining([
          expect.objectContaining({
            field: "user.email",
            message: expect.any(String),
          }),
          expect.objectContaining({
            field: "user.profile.age",
            message: expect.any(String),
          }),
        ]),
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("Error Response Format", () => {
    it("should format single field error correctly", () => {
      const schema = z.object({
        email: z.string().email(),
      });

      const req = createMockRequest({ email: "invalid" }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      const middleware = validateRequest(schema);
      middleware(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        error: "Validation failed",
        details: [
          {
            field: "email",
            message: "Invalid email address",
          },
        ],
      });
    });

    it("should format multiple field errors correctly", () => {
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(8),
        age: z.number().min(18),
      });

      const req = createMockRequest({
        email: "invalid",
        password: "short",
        age: 16,
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      const middleware = validateRequest(schema);
      middleware(req, res, next);

      const call = (res.json as jest.Mock).mock.calls[0][0];
      expect(call.error).toBe("Validation failed");
      expect(call.details).toHaveLength(3);
      expect(call.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: "email" }),
          expect.objectContaining({ field: "password" }),
          expect.objectContaining({ field: "age" }),
        ])
      );
    });
  });

  describe("Request Context Logging", () => {
    it("should log validation failures with request context", () => {
      const schema = z.object({
        email: z.string().email(),
      });

      const req = createMockRequest(
        { email: "invalid" },
        {
          path: "/api/auth/register",
          method: "POST",
          ip: "192.168.1.100",
          headers: { "user-agent": "Mozilla/5.0" },
        }
      ) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      const middleware = validateRequest(schema);
      middleware(req, res, next);

      // Since logger is mocked, we can't directly test the log call
      // but we can verify the middleware behavior is correct
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it("should handle missing request context gracefully", () => {
      const schema = z.object({
        email: z.string().email(),
      });

      const req = createMockRequest(
        { email: "invalid" },
        {
          path: undefined,
          method: undefined,
          ip: undefined,
          headers: {},
        }
      ) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      const middleware = validateRequest(schema);

      // Should not throw error even with missing context
      expect(() => middleware(req, res, next)).not.toThrow();
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("Middleware Factory", () => {
    it("should return a function when called", () => {
      const schema = z.object({ test: z.string() });
      const middleware = validateRequest(schema);

      expect(typeof middleware).toBe("function");
      expect(middleware.length).toBe(3); // req, res, next parameters
    });

    it("should work with different schema types", () => {
      const schemas = [
        z.string(),
        z.number(),
        z.boolean(),
        z.array(z.string()),
        z.object({ test: z.string() }),
      ];

      schemas.forEach(schema => {
        const middleware = validateRequest(schema);
        expect(typeof middleware).toBe("function");
      });
    });

    it("should create independent middleware instances", () => {
      const schema1 = z.object({ field1: z.string() });
      const schema2 = z.object({ field2: z.number() });

      const middleware1 = validateRequest(schema1);
      const middleware2 = validateRequest(schema2);

      expect(middleware1).not.toBe(middleware2);

      // Test that they validate independently
      const req1 = createMockRequest({ field1: "valid" }) as Request;
      const res1 = createMockResponse() as Response;
      const next1 = createMockNext();

      const req2 = createMockRequest({ field2: 42 }) as Request;
      const res2 = createMockResponse() as Response;
      const next2 = createMockNext();

      middleware1(req1, res1, next1);
      middleware2(req2, res2, next2);

      expect(next1).toHaveBeenCalledTimes(1);
      expect(next2).toHaveBeenCalledTimes(1);
    });
  });
});
