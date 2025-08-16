// Don't use the global mock for this test - we want to test the real implementation
jest.unmock("../errorHandler");

import { Request, Response, NextFunction } from "express";
import { errorHandler } from "../errorHandler";
import { setupTestEnvironment } from "tests/helpers/testHelpers";

// Create mock objects for Express req, res, next
const createMockRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
  method: "POST",
  path: "/api/test",
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

describe("errorHandler Middleware", () => {
  setupTestEnvironment();

  describe("Error Response Format", () => {
    it("should return 500 status for errors without status", () => {
      const error = new Error("Something went wrong");
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Internal Server Error",
      });
    });

    it("should use custom status when provided on error object", () => {
      const error = new Error("Unauthorized") as Error & { status: number };
      error.status = 401;

      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Internal Server Error",
      });
    });

    it("should use custom status for different error codes", () => {
      const testCases = [
        { status: 400, description: "Bad Request" },
        { status: 403, description: "Forbidden" },
        { status: 404, description: "Not Found" },
        { status: 422, description: "Unprocessable Entity" },
        { status: 429, description: "Too Many Requests" },
      ];

      testCases.forEach(({ status }) => {
        const error = new Error("Test error") as Error & { status: number };
        error.status = status;

        const req = createMockRequest() as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        errorHandler(error, req, res, next);

        expect(res.status).toHaveBeenCalledWith(status);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: "Internal Server Error",
        });
      });
    });

    it('should always return "Internal Server Error" message regardless of original error message', () => {
      const sensitiveMessages = [
        "Database connection failed: password123",
        "API key invalid: sk-123456789",
        "User not found in database users_table",
        "JWT secret exposed: super-secret-key",
      ];

      sensitiveMessages.forEach(message => {
        const error = new Error(message);
        const req = createMockRequest() as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        errorHandler(error, req, res, next);

        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: "Internal Server Error", // Never expose the original message
        });
      });
    });
  });

  describe("Error Types", () => {
    it("should handle standard Error objects", () => {
      const error = new Error("Standard error");
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Internal Server Error",
      });
    });

    it("should handle custom error objects with status", () => {
      const error = {
        message: "Custom error",
        status: 418,
        customField: "custom value",
      };

      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(418);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Internal Server Error",
      });
    });

    it("should handle string errors", () => {
      const error = "String error message";
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Internal Server Error",
      });
    });

    it("should handle null/undefined errors", () => {
      const testCases = [null, undefined];

      testCases.forEach(error => {
        const req = createMockRequest() as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        errorHandler(error, req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: "Internal Server Error",
        });
      });
    });

    it("should handle errors with zero status", () => {
      const error = new Error("Test error") as Error & { status: number };
      error.status = 0;

      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500); // Should fallback to 500 when status is falsy
    });
  });

  describe("Security Considerations", () => {
    it("should not expose sensitive error details in response", () => {
      const sensitiveError = new Error("Database password is: admin123");
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      errorHandler(sensitiveError, req, res, next);

      const responseCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseCall.message).toBe("Internal Server Error");
      expect(responseCall.message).not.toContain("admin123");
      expect(responseCall.message).not.toContain("password");
    });

    it("should not expose stack traces in response", () => {
      const error = new Error("Test error with stack");
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      errorHandler(error, req, res, next);

      const responseCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseCall).not.toHaveProperty("stack");
      expect(responseCall).not.toHaveProperty("trace");
    });

    it("should not expose internal error properties in response", () => {
      const error = {
        message: "Test error",
        status: 400,
        internalCode: "ERR_DB_CONNECTION",
        sqlQuery: 'SELECT * FROM users WHERE password = "secret"',
        debugInfo: { connectionString: "mongodb://admin:pass@localhost" },
      };

      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      errorHandler(error, req, res, next);

      const responseCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseCall).toEqual({
        success: false,
        message: "Internal Server Error",
      });
      expect(responseCall).not.toHaveProperty("internalCode");
      expect(responseCall).not.toHaveProperty("sqlQuery");
      expect(responseCall).not.toHaveProperty("debugInfo");
    });
  });

  describe("Middleware Behavior", () => {
    it("should not call next() since it's the final error handler", () => {
      const error = new Error("Test error");
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      errorHandler(error, req, res, next);

      expect(next).not.toHaveBeenCalled();
    });

    it("should handle multiple calls correctly", () => {
      const req = createMockRequest() as Request;
      const res1 = createMockResponse() as Response;
      const res2 = createMockResponse() as Response;
      const next = createMockNext();

      errorHandler(new Error("First error"), req, res1, next);
      errorHandler(new Error("Second error"), req, res2, next);

      expect(res1.status).toHaveBeenCalledWith(500);
      expect(res2.status).toHaveBeenCalledWith(500);
      expect(res1.json).toHaveBeenCalledTimes(1);
      expect(res2.json).toHaveBeenCalledTimes(1);
    });
  });

  describe("Error Logging", () => {
    it("should log the error to logger", () => {
      // Since logger is mocked globally, we can't directly test the log call
      // but we can verify the error handler doesn't throw when logging
      const error = new Error("Test error for logging");
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      expect(() => {
        errorHandler(error, req, res, next);
      }).not.toThrow();

      // Verify the response was still sent correctly
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Internal Server Error",
      });
    });
  });
});
