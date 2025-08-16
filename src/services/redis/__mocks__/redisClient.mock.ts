/**
 * Mock Redis client for testing
 * Follows Jest __mocks__ convention
 */
export const createMockRedis = () => ({
  // String operations
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),

  // Set operations
  sAdd: jest.fn(),
  sMembers: jest.fn(),
  sRem: jest.fn(),
  sCard: jest.fn(),

  // Connection
  connect: jest.fn(),
  disconnect: jest.fn(),
  ping: jest.fn(),

  // Utility methods for tests
  flushAll: jest.fn(),
  flushDb: jest.fn(),
});

export type MockRedis = ReturnType<typeof createMockRedis>;

/**
 * Helper to reset all Redis mock calls
 */
export const resetRedisMocks = (mockRedis: MockRedis) => {
  Object.values(mockRedis).forEach(mockFn => {
    if (jest.isMockFunction(mockFn)) {
      mockFn.mockReset();
    }
  });
};

/**
 * Common Redis mock responses
 */
export const redisMockResponses = {
  success: "OK",
  notFound: null,
  exists: 1,
  notExists: 0,
  setAdded: 1,
  setNotAdded: 0,
  keyDeleted: 1,
  keyNotDeleted: 0,
};

/**
 * Default mock Redis client instance
 */
const mockRedisClient = createMockRedis();

export default mockRedisClient;
