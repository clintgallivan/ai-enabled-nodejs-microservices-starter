import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import logger from "../utils/logger";

/**
 * Middleware factory for validating request bodies with Zod schemas
 */
export function validateRequest<T extends z.ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      // Extract field-specific errors
      const errors = result.error.issues.map(issue => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      logger.warn("Request validation failed", {
        path: req.path,
        method: req.method,
        errors,
        body: req.body,
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.headers["user-agent"],
      });

      res.status(400).json({
        error: "Validation failed",
        details: errors,
      });
      return;
    }

    // Replace req.body with parsed/validated data
    req.body = result.data;
    next();
  };
}
