/**
 * Mock config for tests - avoids requiring environment variables
 */
export const config = {
  nodeEnv: "development" as const,
  allowedOrigins: ["http://localhost:3000"],
  port: "3000",

  // SECRETS
  healthSecret: "test-health-secret",
  logSecret: "test-log-secret",
  jwtSecret: "test-jwt-secret",

  // TOKEN TTL's
  refreshTokenExpiresIn: "7d" as const,
  accessTokenExpiresIn: "15m" as const,
  healthTokenExpiresIn: "1h" as const,
  logsTokenExpiresIn: "1h" as const,

  // RATE LIMITING - requests per window (test-friendly values)
  generalRateLimit: 1000,
  authRateLimit: 50,
  passwordRateLimit: 10,
  publicRateLimit: 100,
  adminRateLimit: 50,

  // RATE LIMITING WINDOWS - ms() compatible formats
  generalRateLimitWindow: "15m" as const,
  authRateLimitWindow: "15m" as const,
  passwordRateLimitWindow: "1h" as const,
  publicRateLimitWindow: "1m" as const,
  adminRateLimitWindow: "5m" as const,
};
