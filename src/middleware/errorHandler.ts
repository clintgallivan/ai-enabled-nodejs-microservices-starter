import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  // Can use err.message to show a better message but then custom create Error object.
  // To not expose raw error messages.
  logger.error(err);

  // Handle null/undefined errors safely
  const status = (err && err.status) || 500;

  res.status(status).json({
    success: false,
    message: "Internal Server Error",
  });
};
