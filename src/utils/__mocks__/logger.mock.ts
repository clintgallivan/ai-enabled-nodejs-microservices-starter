/**
 * Mock logger for testing
 * Follows Jest __mocks__ convention
 */
export const createMockLogger = () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
});

export type MockLogger = ReturnType<typeof createMockLogger>;

/**
 * Helper to reset all logger mock calls
 */
export const resetLoggerMocks = (mockLogger: MockLogger) => {
  Object.values(mockLogger).forEach(mockFn => {
    if (jest.isMockFunction(mockFn)) {
      mockFn.mockReset();
    }
  });
};

/**
 * Helper to check if logger was called with specific level and message
 */
export const expectLoggerCalled = (
  mockLogger: MockLogger,
  level: keyof MockLogger,
  messageContains: string,
  metadata?: object
) => {
  const calls = mockLogger[level].mock.calls;
  const matchingCall = calls.find(call => {
    const message = call[0];
    const meta = call[1];

    const messageMatches = typeof message === "string" && message.includes(messageContains);
    const metadataMatches =
      !metadata ||
      (meta && Object.keys(metadata).every(key => meta[key] === (metadata as any)[key]));

    return messageMatches && metadataMatches;
  });

  expect(matchingCall).toBeDefined();
};

/**
 * Default mock logger instance
 */
const mockLogger = createMockLogger();

export default mockLogger;
