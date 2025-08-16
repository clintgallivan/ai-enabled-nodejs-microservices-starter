import { Request, Response, NextFunction } from "express";
import { getLogs } from "../logsController";
import { setupTestEnvironment } from "tests/helpers/testHelpers";

// Mock logger and LOGS_FILE_PATH - using a factory function to avoid hoisting issues
jest.mock("../../utils/logger", () => {
  const mockModule = {
    warn: jest.fn(),
    error: jest.fn(),
    LOGS_FILE_PATH: "/mock/path/to/server.log",
    default: {
      warn: jest.fn(),
      error: jest.fn(),
    },
  };
  return mockModule;
});

import logger from "../../utils/logger";
const mockLogger = logger as jest.Mocked<typeof logger>;

// Get reference to the mocked module so we can modify LOGS_FILE_PATH
const mockLoggerModule = jest.mocked(require("../../utils/logger"));

describe("logsController", () => {
  setupTestEnvironment();

  const createMockRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
    ...overrides,
  });

  const createMockResponse = (): Partial<Response> => {
    const res: Partial<Response> = {
      download: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    return res;
  };

  const createMockNext = (): NextFunction => jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset LOGS_FILE_PATH to default mock value
    mockLoggerModule.LOGS_FILE_PATH = "/mock/path/to/server.log";
  });

  describe("getLogs", () => {
    it("should download logs file successfully", async () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      // Mock successful download
      (res.download as jest.Mock).mockImplementation((_path, _filename, callback) => {
        if (callback) callback(null); // No error
      });

      await getLogs(req, res, next);

      expect(mockLogger.warn).toHaveBeenCalledWith("/log endpoint hit");
      expect(res.download).toHaveBeenCalledWith(
        "/mock/path/to/server.log",
        "server.log",
        expect.any(Function)
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("should handle download errors", async () => {
      const downloadError = new Error("File not found");
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      // Mock download error
      (res.download as jest.Mock).mockImplementation((_path, _filename, callback) => {
        if (callback) callback(downloadError);
      });

      await getLogs(req, res, next);

      expect(mockLogger.warn).toHaveBeenCalledWith("/log endpoint hit");
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error sending file:",
        downloadError.toString()
      );
      expect(next).toHaveBeenCalledWith(downloadError);
    });

    it("should return 500 when LOGS_FILE_PATH is not available", async () => {
      // Mock LOGS_FILE_PATH as undefined
      mockLoggerModule.LOGS_FILE_PATH = undefined;

      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await getLogs(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "File path not found" });
      expect(res.download).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it("should return 500 when LOGS_FILE_PATH is null", async () => {
      // Mock LOGS_FILE_PATH as null
      mockLoggerModule.LOGS_FILE_PATH = null;

      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await getLogs(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "File path not found" });
      expect(res.download).not.toHaveBeenCalled();
    });

    it("should return 500 when LOGS_FILE_PATH is empty string", async () => {
      // Mock LOGS_FILE_PATH as empty string
      mockLoggerModule.LOGS_FILE_PATH = "";

      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await getLogs(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "File path not found" });
      expect(res.download).not.toHaveBeenCalled();
    });

    it("should handle unexpected errors and call next", async () => {
      const unexpectedError = new Error("Unexpected error");
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      // Mock res.download to throw an unexpected error
      (res.download as jest.Mock).mockImplementation(() => {
        throw unexpectedError;
      });

      await getLogs(req, res, next);

      expect(next).toHaveBeenCalledWith(unexpectedError);
    });

    it("should use correct filename for download", async () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      // Mock successful download
      (res.download as jest.Mock).mockImplementation((_path, _filename, callback) => {
        if (callback) callback(null);
      });

      await getLogs(req, res, next);

      expect(res.download).toHaveBeenCalledWith(
        expect.any(String),
        "server.log", // Should always be "server.log"
        expect.any(Function)
      );
    });

    it("should ignore request parameters", async () => {
      const req = createMockRequest({
        params: { id: "123" },
        query: { test: "value" },
        body: { data: "something" },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      // Mock successful download
      (res.download as jest.Mock).mockImplementation((_path, _filename, callback) => {
        if (callback) callback(null);
      });

      await getLogs(req, res, next);

      expect(res.download).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith("/log endpoint hit");
    });

    it("should handle download without callback", async () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      // Mock download without callback (should not crash)
      (res.download as jest.Mock).mockImplementation((_path, _filename, _callback) => {
        // Simulate download method that doesn't call callback immediately
      });

      await getLogs(req, res, next);

      expect(res.download).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith("/log endpoint hit");
    });
  });
});
