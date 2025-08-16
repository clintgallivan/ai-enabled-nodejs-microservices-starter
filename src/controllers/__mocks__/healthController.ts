import { Request, Response, NextFunction } from "express";

export const getHealth = jest
  .fn()
  .mockImplementation(async (_req: Request, res: Response, _next: NextFunction) => {
    res.json({ status: "ok" });
  });

// Helper utilities for controlling mock behavior
export const mockHealthControllerBehavior = {
  // Make getHealth throw an error
  throwError: () => {
    getHealth.mockImplementationOnce(async (_req: Request, _res: Response, next: NextFunction) => {
      next(new Error("Health check failed"));
    });
  },

  // Reset mock to default behavior
  reset: () => {
    jest.clearAllMocks();
  },

  // Get call count
  getCallCount: () => getHealth.mock.calls.length,

  // Get last call
  getLastCall: () => {
    const calls = getHealth.mock.calls;
    return calls[calls.length - 1];
  },
};
