import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

export const getHealth = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    logger.warn("/health endpoint hit");
    res.json({ status: "ok" });
  } catch (error) {
    logger.error("Error with Health Controller");
    next(error);
  }
};
