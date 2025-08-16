import { Request, Response, NextFunction } from "express";

export const getLogs = jest
  .fn()
  .mockImplementation(async (_req: Request, res: Response, _next: NextFunction) => {
    // Mock successful file download
    res.download = jest.fn().mockImplementation((_path, _filename, callback) => {
      if (callback) callback(null);
    });
    res.download("/mock/path/server.log", "server.log", () => {});
  });

// Helper utilities for controlling mock behavior
export const mockLogsControllerBehavior = {
  // Make getLogs return file not found error
  fileNotFound: () => {
    getLogs.mockImplementationOnce(async (_req: Request, res: Response) => {
      res.status(500).json({ error: "File path not found" });
    });
  },

  // Make getLogs throw an error
  throwError: () => {
    getLogs.mockImplementationOnce(async (_req: Request, _res: Response, next: NextFunction) => {
      next(new Error("Logs download failed"));
    });
  },

  // Reset mock to default behavior
  reset: () => {
    jest.clearAllMocks();
  },

  // Get call count
  getCallCount: () => getLogs.mock.calls.length,

  // Get last call
  getLastCall: () => {
    const calls = getLogs.mock.calls;
    return calls[calls.length - 1];
  },
};
