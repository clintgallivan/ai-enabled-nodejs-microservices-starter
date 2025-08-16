// Mock implementation of authTokenService for testing

export const authTokenService = {
  createToken: jest.fn().mockResolvedValue({
    token: "mock-token-123",
    tokenData: {
      id: "mock-token-id",
      userId: "mock-user-id",
      tokenType: "password_reset",
      tokenHash: "mock-hash",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: new Date(),
    },
  }),

  findValidToken: jest.fn().mockResolvedValue({
    id: "mock-token-id",
    userId: "mock-user-id",
    tokenType: "password_reset",
    tokenHash: "mock-hash",
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    createdAt: new Date(),
    user: {
      id: "mock-user-id",
      email: "test@example.com",
    },
  }),

  consumeToken: jest.fn().mockResolvedValue(undefined),

  revokeUserTokens: jest.fn().mockResolvedValue(undefined),
};
