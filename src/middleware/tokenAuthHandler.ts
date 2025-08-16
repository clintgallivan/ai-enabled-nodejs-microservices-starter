import { Request, Response, NextFunction } from "express";
import { config } from "../config";
import logger from "../utils/logger";
import jwt from "jsonwebtoken";
import { isTokenBlacklisted } from "../services/redis/jwtBlacklist";

export interface AuthenticatedRequest extends Request {
  user?: {
    userId?: string;
    email?: string;
    role?: string;
    [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any -- JWT claims can be any type
  };
}

export const tokenAuthHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const path = req.baseUrl;

  let expectedSecret;
  if (path === "/v1/health") {
    expectedSecret = config.healthSecret;
  } else if (path === "/v1/logs") {
    expectedSecret = config.logSecret;
  } else {
    expectedSecret = config.jwtSecret;
  }

  const requestToken = authHeader?.split(" ")[1];

  if (!authHeader?.startsWith("Bearer ") || !requestToken || !expectedSecret) {
    logger.error(`Authenticating Credentials, Path: ${path}. Token: ${requestToken}`);
    res.status(401).json({
      success: false,
      message: "Invalid Credentials",
    });
    return;
  }

  try {
    // Verify and decode the token
    const decoded = jwt.verify(requestToken, expectedSecret);
    if (typeof decoded === "object" && decoded !== null) {
      req.user = decoded;
    } else {
      req.user = undefined;
    }

    // Check if token is blacklisted (only for regular JWT tokens, not health/logs tokens)
    if (expectedSecret === config.jwtSecret) {
      const isBlacklisted = await isTokenBlacklisted(requestToken);
      if (isBlacklisted) {
        logger.error(`Blacklisted token used, Path: ${path}`);
        res.status(401).json({
          success: false,
          message: "Token has been revoked",
        });
        return;
      }
    }
  } catch {
    logger.error(`JWT verification failed, Path: ${path}. Token: ${requestToken}`);
    res.status(401).json({
      success: false,
      message: "Invalid Credentials",
    });
    return;
  }

  next();
};
