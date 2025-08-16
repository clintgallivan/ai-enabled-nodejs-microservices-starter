import { Request, Response, NextFunction } from "express";

// Simple mock implementations for route testing
export const registerUser = jest
  .fn()
  .mockImplementation(async (req: Request, res: Response, _next: NextFunction) => {
    res.status(201).json({
      token: "mock-access-token",
      refreshToken: "mock-refresh-token",
      user: {
        id: "mock-user-id",
        email: req.body.email,
        planTier: "free",
        role: "user",
        createdAt: new Date().toISOString(),
      },
    });
  });

export const loginUser = jest
  .fn()
  .mockImplementation(async (req: Request, res: Response, _next: NextFunction) => {
    res.status(200).json({
      token: "mock-access-token",
      refreshToken: "mock-refresh-token",
      user: {
        id: "mock-user-id",
        email: req.body.email,
        planTier: "free",
        role: "user",
        createdAt: new Date().toISOString(),
      },
    });
  });

export const refreshAccessToken = jest
  .fn()
  .mockImplementation(async (_req: Request, res: Response, _next: NextFunction) => {
    res.status(200).json({
      token: "mock-new-access-token",
      refreshToken: "mock-new-refresh-token",
    });
  });

export const logoutUser = jest.fn().mockImplementation(async (_req: Request, res: Response) => {
  res.status(200).json({ message: "Logged out successfully" });
});

export const getHealthToken = jest.fn().mockImplementation((_req: Request, res: Response) => {
  res.json({ token: "mock-health-token" });
});

export const getLogsToken = jest.fn().mockImplementation((_req: Request, res: Response) => {
  res.json({ token: "mock-logs-token" });
});

// New password reset and email verification mocks
export const forgotPassword = jest
  .fn()
  .mockImplementation(async (_req: Request, res: Response, _next: NextFunction) => {
    res.status(200).json({
      message: "If an account with that email exists, we've sent a password reset link.",
    });
  });

export const resetPassword = jest
  .fn()
  .mockImplementation(async (_req: Request, res: Response, _next: NextFunction) => {
    res.status(200).json({
      message: "Password reset successful. Please log in with your new password.",
    });
  });

export const changePassword = jest
  .fn()
  .mockImplementation(async (_req: Request, res: Response, _next: NextFunction) => {
    res.status(200).json({
      message: "Password changed successfully.",
    });
  });

export const verifyEmail = jest
  .fn()
  .mockImplementation(async (_req: Request, res: Response, _next: NextFunction) => {
    res.status(200).json({
      message: "Email verified successfully.",
    });
  });

export const resendVerification = jest
  .fn()
  .mockImplementation(async (_req: Request, res: Response, _next: NextFunction) => {
    res.status(200).json({
      message:
        "If an account with that email exists and is unverified, we've sent a verification email.",
    });
  });
