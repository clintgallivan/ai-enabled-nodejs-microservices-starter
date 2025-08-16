import { Request, Response, NextFunction } from "express";
import { z } from "zod";

/**
 * Mock validateRequest middleware for testing
 * By default, it just calls next() to pass through validation
 * Can be overridden in tests to simulate validation failures
 */
export const validateRequest = jest.fn().mockImplementation(<T extends z.ZodSchema>(_schema: T) => {
  return jest.fn().mockImplementation((_req: Request, _res: Response, next: NextFunction) => {
    // Default behavior: validation passes
    next();
  });
});

/**
 * Helper functions for controlling mock behavior in tests
 */
export const mockValidateRequestBehavior = {
  /**
   * Make validation pass (default behavior)
   */
  passValidation: () => {
    validateRequest.mockImplementation(<T extends z.ZodSchema>(_schema: T) => {
      return jest.fn().mockImplementation((_req: Request, _res: Response, next: NextFunction) => {
        next();
      });
    });
  },

  /**
   * Make validation fail with specific errors
   */
  failValidation: (errors: Array<{ field: string; message: string }>) => {
    validateRequest.mockImplementation(<T extends z.ZodSchema>(_schema: T) => {
      return jest.fn().mockImplementation((_req: Request, res: Response, _next: NextFunction) => {
        res.status(400).json({
          error: "Validation failed",
          details: errors,
        });
      });
    });
  },

  /**
   * Make validation fail with a single field error
   */
  failWithSingleError: (field: string, message: string) => {
    mockValidateRequestBehavior.failValidation([{ field, message }]);
  },

  /**
   * Make validation transform and pass data
   */
  passWithTransformation: (transformedData: any) => {
    validateRequest.mockImplementation(<T extends z.ZodSchema>(_schema: T) => {
      return jest.fn().mockImplementation((req: Request, _res: Response, next: NextFunction) => {
        req.body = transformedData;
        next();
      });
    });
  },

  /**
   * Reset to default behavior (validation passes)
   */
  reset: () => {
    validateRequest.mockClear();
    mockValidateRequestBehavior.passValidation();
  },
};

// Set default behavior
mockValidateRequestBehavior.passValidation();
