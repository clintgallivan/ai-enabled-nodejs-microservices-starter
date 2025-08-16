import { Request, Response, NextFunction } from "express";
import logger, { LOGS_FILE_PATH } from "../utils/logger";

export const getLogs = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    if (LOGS_FILE_PATH) {
      // Send the file for download

      logger.warn("/log endpoint hit");
      res.download(LOGS_FILE_PATH, "server.log", err => {
        if (err) {
          logger.error("Error sending file:", err.toString());
          return next(err);
        }
      });
    } else {
      res.status(500).json({ error: "File path not found" });
    }
  } catch (error) {
    next(error);
  }
};
