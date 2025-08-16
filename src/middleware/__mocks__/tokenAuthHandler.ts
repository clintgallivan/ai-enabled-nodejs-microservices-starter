import { Request, Response, NextFunction } from "express";

// Define the AuthenticatedRequest interface to match the real one
export interface AuthenticatedRequest extends Request {
  user?: {
    userId?: string;
    email?: string;
    role?: string;
    [key: string]: any;
  };
}

/**
 * Mock tokenAuthHandler middleware for testing
 * By default, it passes authentication and sets a mock user
 * Can be overridden in tests to simulate authentication failures
 */
export const tokenAuthHandler = jest
  .fn()
  .mockImplementation((req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    // Default behavior: authentication passes with mock user
    req.user = {
      userId: "mock-user-id",
      email: "mock@example.com",
      role: "user",
    };
    next();
  });

/**
 * Helper functions for controlling mock behavior in tests
 */
export const mockTokenAuthHandlerBehavior = {
  /**
   * Make authentication pass with default mock user (default behavior)
   */
  passAuthentication: (mockUser?: Partial<AuthenticatedRequest["user"]>) => {
    tokenAuthHandler.mockImplementation(
      (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
        req.user = {
          userId: "mock-user-id",
          email: "mock@example.com",
          role: "user",
          ...mockUser,
        };
        next();
      }
    );
  },

  /**
   * Make authentication fail with 401 Invalid Credentials
   */
  failAuthentication: (message: string = "Invalid Credentials") => {
    tokenAuthHandler.mockImplementation(
      (_req: AuthenticatedRequest, res: Response, _next: NextFunction) => {
        res.status(401).json({
          success: false,
          message,
        });
      }
    );
  },

  /**
   * Make authentication fail with specific status and response
   */
  failWithCustomResponse: (status: number, response: any) => {
    tokenAuthHandler.mockImplementation(
      (_req: AuthenticatedRequest, res: Response, _next: NextFunction) => {
        res.status(status).json(response);
      }
    );
  },

  /**
   * Make authentication fail due to blacklisted token
   */
  failWithBlacklistedToken: () => {
    tokenAuthHandler.mockImplementation(
      (_req: AuthenticatedRequest, res: Response, _next: NextFunction) => {
        res.status(401).json({
          success: false,
          message: "Token has been revoked",
        });
      }
    );
  },

  /**
   * Make authentication pass with specific user data
   */
  passWithUser: (userData: AuthenticatedRequest["user"]) => {
    tokenAuthHandler.mockImplementation(
      (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
        req.user = userData;
        next();
      }
    );
  },

  /**
   * Make authentication pass with admin user
   */
  passWithAdminUser: () => {
    mockTokenAuthHandlerBehavior.passWithUser({
      userId: "admin-user-id",
      email: "admin@example.com",
      role: "admin",
    });
  },

  /**
   * Make authentication pass without setting user (edge case)
   */
  passWithoutUser: () => {
    tokenAuthHandler.mockImplementation(
      (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
        // Don't set req.user
        next();
      }
    );
  },

  /**
   * Reset to default behavior (authentication passes with mock user)
   */
  reset: () => {
    tokenAuthHandler.mockClear();
    mockTokenAuthHandlerBehavior.passAuthentication();
  },

  /**
   * Get the number of times the middleware was called
   */
  getCallCount: () => tokenAuthHandler.mock.calls.length,

  /**
   * Get the arguments from the last call
   */
  getLastCall: () => tokenAuthHandler.mock.calls[tokenAuthHandler.mock.calls.length - 1],
};

// Set default behavior
mockTokenAuthHandlerBehavior.passAuthentication();
