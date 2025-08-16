module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/*.test.ts',
    '**/*.spec.ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts', // Exclude server startup file
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^utils/(.*)$': '<rootDir>/src/utils/$1',
    '^controllers/(.*)$': '<rootDir>/src/controllers/$1',
    '^middleware/(.*)$': '<rootDir>/src/middleware/$1',
    '^services/(.*)$': '<rootDir>/src/services/$1',
    '^config/(.*)$': '<rootDir>/src/config/$1',
    '^types/(.*)$': '<rootDir>/src/types/$1',
    '^tests/(.*)$': '<rootDir>/src/tests/$1',
  },
  testTimeout: 10000, // 10 seconds for integration tests
  verbose: true,
  // Automatically use __mocks__ folders
  clearMocks: true,
  restoreMocks: true,
  // Global setup for common mocks
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
}; 