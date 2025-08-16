import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import redisClient from "services/redis/redisClient";
import { config } from "./index";
import { expiresInToSeconds } from "utils/assertions";
import logger from "utils/logger";

// Helper to detect if we're in a test environment
const isTestEnvironment = () => {
  return process.env.JEST_WORKER_ID !== undefined;
};

// Create Redis store for distributed rate limiting
const createRedisStore = () => {
  if (isTestEnvironment()) {
    // Use memory store for tests to avoid Redis dependency
    return undefined; // Uses default memory store
  }

  try {
    return new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    });
  } catch (error) {
    // Fallback to memory store if Redis connection fails
    logger.warn("Rate limiting falling back to memory store", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return undefined;
  }
};

// General API rate limit - applies to most endpoints
export const generalRateLimit = rateLimit({
  windowMs: expiresInToSeconds(config.generalRateLimitWindow),
  max: config.generalRateLimit,
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  store: createRedisStore(),
  // Skip rate limiting for tests and development
  skip: _req => isTestEnvironment(),
});

// Strict rate limit for auth endpoints (login, register)
export const authRateLimit = rateLimit({
  windowMs: expiresInToSeconds(config.authRateLimitWindow),
  max: config.authRateLimit,
  message: {
    error: "Too many authentication attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore(),
  skip: _req => isTestEnvironment(),
  // Apply only to POST requests (login/register attempts)
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Very strict rate limit for password-related endpoints
export const passwordRateLimit = rateLimit({
  windowMs: expiresInToSeconds(config.passwordRateLimitWindow),
  max: config.passwordRateLimit,
  message: {
    error: "Too many password-related requests, please try again in an hour.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore(),
  skip: _req => isTestEnvironment(),
});

// Lenient rate limit for public endpoints (health, home)
export const publicRateLimit = rateLimit({
  windowMs: expiresInToSeconds(config.publicRateLimitWindow),
  max: config.publicRateLimit,
  message: {
    error: "Too many requests, please slow down.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore(),
  skip: _req => isTestEnvironment(),
});

// Rate limit for admin endpoints (logs, health tokens)
export const adminRateLimit = rateLimit({
  windowMs: expiresInToSeconds(config.adminRateLimitWindow),
  max: config.adminRateLimit,
  message: {
    error: "Too many admin requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore(),
  skip: _req => isTestEnvironment(),
});
