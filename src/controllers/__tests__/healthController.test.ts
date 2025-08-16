import { Request, Response, NextFunction } from "express";
import { getHealth } from "../healthController";
import { setupTestEnvironment } from "tests/helpers/testHelpers";

// Mock logger
jest.mock("../../utils/logger", () => ({
  warn: jest.fn(),
  error: jest.fn(),
}));

import logger from "../../utils/logger";
const mockLogger = logger as any;

describe("healthController", () => {
  setupTestEnvironment();

  const createMockRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
    ...overrides,
  });

  const createMockResponse = (): Partial<Response> => {
    const res: Partial<Response> = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
    };
    return res;
  };

  const createMockNext = (): NextFunction => jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getHealth", () => {
    it("should return health status ok", async () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await getHealth(req, res, next);

      expect(mockLogger.warn).toHaveBeenCalledWith("/health endpoint hit");
      expect(res.json).toHaveBeenCalledWith({ status: "ok" });
      expect(next).not.toHaveBeenCalled();
    });

    it("should not call res.status (defaults to 200)", async () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await getHealth(req, res, next);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ status: "ok" });
    });

    it("should handle errors and call next", async () => {
      const error = new Error("Health check failed");
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      // Mock res.json to throw an error
      (res.json as jest.Mock).mockImplementation(() => {
        throw error;
      });

      await getHealth(req, res, next);

      expect(mockLogger.error).toHaveBeenCalledWith("Error with Health Controller");
      expect(next).toHaveBeenCalledWith(error);
    });

    it("should be idempotent", async () => {
      const req = createMockRequest() as Request;
      const res1 = createMockResponse() as Response;
      const res2 = createMockResponse() as Response;
      const next = createMockNext();

      await getHealth(req, res1, next);
      await getHealth(req, res2, next);

      expect(res1.json).toHaveBeenCalledWith({ status: "ok" });
      expect(res2.json).toHaveBeenCalledWith({ status: "ok" });
      expect(mockLogger.warn).toHaveBeenCalledTimes(2);
    });

    it("should return JSON serializable response", async () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await getHealth(req, res, next);

      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(() => JSON.stringify(responseData)).not.toThrow();
      expect(responseData).toEqual({ status: "ok" });
    });

    it("should ignore request parameters", async () => {
      const req = createMockRequest({
        params: { id: "123" },
        query: { test: "value" },
        body: { data: "something" },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await getHealth(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ status: "ok" });
      expect(mockLogger.warn).toHaveBeenCalledWith("/health endpoint hit");
    });
  });
});
