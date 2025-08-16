import { getEnvVar } from "./env";
import { validateMsFormat } from "utils/assertions";
import ms from "ms";

export type NodeEnvOptions = "production" | "development" | "staging";

export type Config = {
  nodeEnv: NodeEnvOptions;
  allowedOrigins: string[];
  port: string;

  // SECRETS
  healthSecret: string;
  logSecret: string;
  jwtSecret: string;

  // TOKEN TTL's - validated ms() time formats
  refreshTokenExpiresIn: ms.StringValue;
  accessTokenExpiresIn: ms.StringValue;
  healthTokenExpiresIn: ms.StringValue;
  logsTokenExpiresIn: ms.StringValue;

  // AUTH TOKEN TTL's - for password reset and email verification
  passwordResetTokenExpiresIn: ms.StringValue;
  emailVerifyTokenExpiresIn: ms.StringValue;

  // RATE LIMITING - requests per window
  generalRateLimit: number;
  authRateLimit: number;
  passwordRateLimit: number;
  publicRateLimit: number;
  adminRateLimit: number;

  // RATE LIMITING - time windows in milliseconds
  generalRateLimitWindow: ms.StringValue;
  authRateLimitWindow: ms.StringValue;
  passwordRateLimitWindow: ms.StringValue;
  publicRateLimitWindow: ms.StringValue;
  adminRateLimitWindow: ms.StringValue;
};

// Export configurations
export const config: Config = {
  // CONFIGS
  nodeEnv: getEnvVar("NODE_ENV") as NodeEnvOptions,
  allowedOrigins: getEnvVar("ALLOWED_ORIGINS").split(",").filter(Boolean),
  port: getEnvVar("PORT"),

  // SECRETS
  healthSecret: getEnvVar("HEALTH_SECRET"),
  logSecret: getEnvVar("LOGS_SECRET"),
  jwtSecret: getEnvVar("JWT_SECRET"),

  // TOKEN TTL's - validated as ms() compatible formats
  refreshTokenExpiresIn: validateMsFormat(
    getEnvVar("REFRESH_TOKEN_EXPIRES_IN"),
    "REFRESH_TOKEN_EXPIRES_IN"
  ),
  accessTokenExpiresIn: validateMsFormat(
    getEnvVar("ACCESS_TOKEN_EXPIRES_IN"),
    "ACCESS_TOKEN_EXPIRES_IN"
  ),
  healthTokenExpiresIn: validateMsFormat(
    getEnvVar("HEALTH_TOKEN_EXPIRES_IN"),
    "HEALTH_TOKEN_EXPIRES_IN"
  ),
  logsTokenExpiresIn: validateMsFormat(getEnvVar("LOGS_TOKEN_EXPIRES_IN"), "LOGS_TOKEN_EXPIRES_IN"),

  // AUTH TOKEN TTL's - for password reset and email verification
  passwordResetTokenExpiresIn: validateMsFormat(
    getEnvVar("PASSWORD_RESET_TOKEN_EXPIRES_IN"),
    "PASSWORD_RESET_TOKEN_EXPIRES_IN"
  ),
  emailVerifyTokenExpiresIn: validateMsFormat(
    getEnvVar("EMAIL_VERIFY_TOKEN_EXPIRES_IN"),
    "EMAIL_VERIFY_TOKEN_EXPIRES_IN"
  ),

  // RATE LIMITING - requests per window
  generalRateLimit: parseInt(getEnvVar("GENERAL_RATE_LIMIT")),
  authRateLimit: parseInt(getEnvVar("AUTH_RATE_LIMIT")),
  passwordRateLimit: parseInt(getEnvVar("PASSWORD_RATE_LIMIT")),
  publicRateLimit: parseInt(getEnvVar("PUBLIC_RATE_LIMIT")),
  adminRateLimit: parseInt(getEnvVar("ADMIN_RATE_LIMIT")),

  // RATE LIMITING - time windows converted to milliseconds
  generalRateLimitWindow: validateMsFormat(
    getEnvVar("GENERAL_RATE_LIMIT_WINDOW"),
    "GENERAL_RATE_LIMIT_WINDOW"
  ),
  authRateLimitWindow: validateMsFormat(
    getEnvVar("AUTH_RATE_LIMIT_WINDOW"),
    "AUTH_RATE_LIMIT_WINDOW"
  ),
  passwordRateLimitWindow: validateMsFormat(
    getEnvVar("PASSWORD_RATE_LIMIT_WINDOW"),
    "PASSWORD_RATE_LIMIT_WINDOW"
  ),
  publicRateLimitWindow: validateMsFormat(
    getEnvVar("PUBLIC_RATE_LIMIT_WINDOW"),
    "PUBLIC_RATE_LIMIT_WINDOW"
  ),
  adminRateLimitWindow: validateMsFormat(
    getEnvVar("ADMIN_RATE_LIMIT_WINDOW"),
    "ADMIN_RATE_LIMIT_WINDOW"
  ),
};
