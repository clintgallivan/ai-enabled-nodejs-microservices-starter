/**
 * Simple test helpers and utilities
 * Keep it simple and readable for boilerplate use
 */

/**
 * Generate realistic test data
 */
export const generateTestData = {
  userId: () => `user-${Math.random().toString(36).substring(2, 11)}`,
  sessionId: () => `session-${Math.random().toString(36).substring(2, 11)}`,
  refreshToken: () => `refresh-${Math.random().toString(36).substring(2, 18)}`,
  accessToken: () => `jwt.${Math.random().toString(36).substring(2, 18)}.signature`,
  token: () => `token-${Math.random().toString(36).substring(2, 16)}`,
  email: () => `test-${Math.random().toString(36).substring(2, 7)}@example.com`,
  password: () => `Password123!${Math.random().toString(36).substring(2, 6)}`,
};

/**
 * Simple test setup
 */
export const setupTestEnvironment = () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });
};
