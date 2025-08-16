import { Request, Response, NextFunction } from "express";

/**
 * Mock errorHandler middleware for testing
 * By default, it handles errors by returning 500 with "Internal Server Error"
 * Can be overridden in tests to simulate different error handling behaviors
 */
export const errorHandler = jest
  .fn()
  .mockImplementation((err: any, _req: Request, res: Response, _next: NextFunction) => {
    // Default behavior: return 500 with standard error message
    const status = (err && err.status) || 500;
    res.status(status).json({
      success: false,
      message: "Internal Server Error",
    });
  });

/**
 * Helper functions for controlling mock behavior in tests
 */
export const mockErrorHandlerBehavior = {
  /**
   * Use default error handling behavior (default)
   */
  useDefaultBehavior: () => {
    errorHandler.mockImplementation(
      (err: any, _req: Request, res: Response, _next: NextFunction) => {
        const status = (err && err.status) || 500;
        res.status(status).json({
          success: false,
          message: "Internal Server Error",
        });
      }
    );
  },

  /**
   * Always return specific status and message regardless of error
   */
  alwaysReturn: (status: number, message: string) => {
    errorHandler.mockImplementation(
      (_err: any, _req: Request, res: Response, _next: NextFunction) => {
        res.status(status).json({
          success: false,
          message,
        });
      }
    );
  },

  /**
   * Return custom response format
   */
  returnCustomFormat: (status: number, response: any) => {
    errorHandler.mockImplementation(
      (_err: any, _req: Request, res: Response, _next: NextFunction) => {
        res.status(status).json(response);
      }
    );
  },

  /**
   * Simulate error handler throwing an error (edge case)
   */
  throwError: (errorToThrow: Error) => {
    errorHandler.mockImplementation(() => {
      throw errorToThrow;
    });
  },

  /**
   * Don't send any response (edge case for testing)
   */
  noResponse: () => {
    errorHandler.mockImplementation(
      (_err: any, _req: Request, _res: Response, _next: NextFunction) => {
        // Do nothing - don't send response
      }
    );
  },

  /**
   * Capture and store the error for inspection
   */
  captureError: () => {
    let capturedError: any = null;

    errorHandler.mockImplementation(
      (err: any, _req: Request, res: Response, _next: NextFunction) => {
        capturedError = err;
        const status = (err && err.status) || 500;
        res.status(status).json({
          success: false,
          message: "Internal Server Error",
        });
      }
    );

    return {
      getCapturedError: () => capturedError,
      clearCapturedError: () => {
        capturedError = null;
      },
    };
  },

  /**
   * Reset to default behavior
   */
  reset: () => {
    errorHandler.mockClear();
    mockErrorHandlerBehavior.useDefaultBehavior();
  },

  /**
   * Get the number of times the error handler was called
   */
  getCallCount: () => errorHandler.mock.calls.length,

  /**
   * Get all captured errors from calls
   */
  getAllErrors: () => errorHandler.mock.calls.map(call => call[0]),

  /**
   * Get the last error that was handled
   */
  getLastError: () => {
    const calls = errorHandler.mock.calls;
    return calls.length > 0 ? calls[calls.length - 1][0] : null;
  },

  /**
   * Check if a specific error was handled
   */
  wasErrorHandled: (errorMessage: string) => {
    return errorHandler.mock.calls.some(call => {
      const err = call[0];
      return err && (err.message === errorMessage || err === errorMessage);
    });
  },
};

// Set default behavior
mockErrorHandlerBehavior.useDefaultBehavior();
