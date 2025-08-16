/**
 * Global test setup - automatically mocks common dependencies
 * This runs before all tests
 */

// Mock common dependencies that require env vars
jest.mock("../config");
jest.mock("../utils/logger");

// Mock middleware used in routes
jest.mock("../middleware/validateRequest");
jest.mock("../middleware/tokenAuthHandler");
jest.mock("../middleware/errorHandler");

// Mock Redis client globally using the exact import path from code
jest.mock("services/redis/redisClient");
