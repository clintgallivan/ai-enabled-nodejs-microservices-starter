import { Request, Response, NextFunction } from "express";

export const getHome = jest
  .fn()
  .mockImplementation(async (_req: Request, res: Response, _next: NextFunction) => {
    res.json({
      success: true,
      message: "Welcome to Node.js Microservices Starter API",
      data: {
        service: "nodejs-microservices-starter",
        version: "1.0.0",
        environment: "test",
        status: "operational",
        timestamp: new Date().toISOString(),
        endpoints: {
          auth: {
            register: "POST /v1/auth/register",
            login: "POST /v1/auth/login",
            logout: "POST /v1/auth/logout",
            refresh: "POST /v1/auth/refresh-token",
            healthToken: "GET /v1/auth/health-token",
            logsToken: "GET /v1/auth/logs-token",
          },
        },
      },
    });
  });

// Helper utilities for controlling mock behavior
export const mockHomeControllerBehavior = {
  // Make getHome throw an error
  throwError: () => {
    getHome.mockImplementationOnce(async (_req: Request, _res: Response, next: NextFunction) => {
      next(new Error("Home controller error"));
    });
  },

  // Reset mock to default behavior
  reset: () => {
    jest.clearAllMocks();
  },

  // Get call count
  getCallCount: () => getHome.mock.calls.length,

  // Get last call
  getLastCall: () => {
    const calls = getHome.mock.calls;
    return calls[calls.length - 1];
  },
};
