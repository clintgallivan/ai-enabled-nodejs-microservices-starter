import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import { PrismaClient } from "../../generated/prisma";
import jwt, { JwtPayload } from "jsonwebtoken";
import { expiresInToSeconds } from "utils/assertions";
import {
  RegisterRequest,
  LoginRequest,
  RefreshTokenRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  VerifyEmailRequest,
  ResendVerificationRequest,
} from "utils/schemas/authSchemas";
import { AuthenticatedRequest, LoginResponse, RefreshResponse } from "../types/auth";
import { blacklistToken } from "services/redis/jwtBlacklist";
import { config } from "../config";
import logger from "../utils/logger";
import {
  storeRefreshToken,
  getUserIdForRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokensForUser,
  revokeRefreshTokenBySession,
} from "services/redis/refreshTokens";
import crypto from "node:crypto";
import { authTokenService } from "services/authTokenService";
import { emailQueueService } from "services/emailQueueService";

function generateRandomToken(bytes: number = 48): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

const prisma = new PrismaClient();

export const registerUser = async (
  req: Request<{}, {}, RegisterRequest>,
  res: Response,
  next: NextFunction
) => {
  try {
    // Validation is now handled by Zod middleware
    const { email, password } = req.body;
    // Check if user already exists
    const existingUser = await prisma.users.findUnique({ where: { email } });
    if (existingUser) {
      logger.warn("Registration attempt with existing email", { email });
      return res.status(409).json({ error: "User already exists." });
    }
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    // Create user
    const user = await prisma.users.create({
      data: {
        email,
        password_hash: passwordHash,
        plan_tier: "free",
        created_at: new Date(),
      },
    });
    logger.info("User registered successfully", {
      userId: user.id,
      email: user.email,
      planTier: user.plan_tier,
      userAgent: req.headers["user-agent"],
      ip: req.ip || req.socket.remoteAddress,
    });

    // Issue tokens on registration (same shape as login)
    const sessionId = crypto.randomUUID();
    const token = jwt.sign(
      { userId: user.id, email: user.email, planTier: user.plan_tier, role: user.role, sessionId },
      config.jwtSecret,
      { expiresIn: config.accessTokenExpiresIn }
    );
    const refreshToken = generateRandomToken();
    await storeRefreshToken(
      user.id,
      sessionId,
      refreshToken,
      expiresInToSeconds(config.refreshTokenExpiresIn)
    );

    // Send email verification email (optional - don't block registration if it fails)
    try {
      const { token: verifyToken } = await authTokenService.createToken({
        userId: user.id,
        tokenType: "email_verify",
        expiresInMs: expiresInToSeconds(config.emailVerifyTokenExpiresIn),
      });
      await emailQueueService.sendEmailVerification(email, verifyToken, undefined, true);
      logger.info("Email verification queued on registration", { email });
    } catch (emailError) {
      // Don't fail registration if email sending fails
      logger.warn("Failed to send verification email on registration", {
        error: emailError instanceof Error ? emailError.message : "Unknown error",
        email,
      });
    }

    const responseBody: LoginResponse = {
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        planTier: user.plan_tier,
        role: user.role,
        createdAt: user.created_at,
      },
    };
    return res.status(201).json(responseBody);
  } catch (error) {
    logger.error("Registration failed", { error, email: req.body.email });
    next(error);
    return;
  }
};

export const loginUser = async (
  req: Request<{}, {}, LoginRequest>,
  res: Response,
  next: NextFunction
) => {
  try {
    // Validation is now handled by Zod middleware
    const { email, password } = req.body;
    // Find user by email
    const user = await prisma.users.findUnique({ where: { email } });
    if (!user) {
      logger.warn("Login attempt with non-existent email", { email });
      return res.status(401).json({ error: "Invalid credentials." });
    }
    // Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      logger.warn("Login attempt with incorrect password", { email, userId: user.id });
      return res.status(401).json({ error: "Invalid credentials." });
    }
    // Generate JWT
    const sessionId = crypto.randomUUID();
    const token = jwt.sign(
      { userId: user.id, email: user.email, planTier: user.plan_tier, role: user.role, sessionId },
      config.jwtSecret,
      { expiresIn: config.accessTokenExpiresIn }
    );
    // Generate refresh token and store in Redis for this session
    const refreshToken = generateRandomToken();
    await storeRefreshToken(
      user.id,
      sessionId,
      refreshToken,
      expiresInToSeconds(config.refreshTokenExpiresIn)
    );

    logger.info("User logged in successfully", {
      userId: user.id,
      email: user.email,
      role: user.role,
      userAgent: req.headers["user-agent"],
      ip: req.ip || req.socket.remoteAddress,
    });
    // Return both the token and the user object (omit sensitive fields)
    const responseBody: LoginResponse = {
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        planTier: user.plan_tier,
        role: user.role,
        createdAt: user.created_at,
        // add any other non-sensitive fields you want to expose
      },
    };
    return res.status(200).json(responseBody);
  } catch (error) {
    logger.error("Login failed", { error, email: req.body.email });
    next(error);
    return;
  }
};

export const refreshAccessToken = async (
  req: Request<{}, {}, RefreshTokenRequest>,
  res: Response,
  next: NextFunction
) => {
  try {
    // Validation is now handled by Zod middleware
    const { refreshToken } = req.body;

    const userId = await getUserIdForRefreshToken(refreshToken);
    if (!userId) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    // Rotate: revoke old, issue new refresh token
    await revokeRefreshToken(refreshToken);
    const rotatedSessionId = crypto.randomUUID();
    const newRefreshToken = generateRandomToken();
    await storeRefreshToken(
      userId,
      rotatedSessionId,
      newRefreshToken,
      expiresInToSeconds(config.refreshTokenExpiresIn)
    );

    // Fetch user to embed role/planTier
    const user = await prisma.users.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Issue new access token
    const newAccessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        planTier: user.plan_tier,
        role: user.role,
        sessionId: rotatedSessionId,
      },
      config.jwtSecret,
      { expiresIn: config.accessTokenExpiresIn }
    );

    const responseBody: RefreshResponse = {
      token: newAccessToken,
      refreshToken: newRefreshToken,
    };

    logger.info("Access token refreshed", { userId });
    return res.status(200).json(responseBody);
  } catch (error) {
    logger.error("Refresh token exchange failed", { error });
    next(error);
    return;
  }
};

export const logoutUser = async (req: AuthenticatedRequest, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No token provided" });

  const token = authHeader.split(" ")[1];

  try {
    // Since the middleware already verified the token, we can trust req.user
    // But we still need to get the expiration time for blacklisting
    const decoded = jwt.decode(token) as JwtPayload | null;

    if (!decoded || typeof decoded !== "object" || typeof decoded.exp !== "number") {
      return res.status(400).json({ error: "Invalid token format" });
    }

    const exp = decoded.exp; // in seconds
    const now = Math.floor(Date.now() / 1000);
    const ttl = exp - now;

    if (ttl > 0) {
      try {
        await blacklistToken(token, ttl);
      } catch (redisError) {
        logger.error("Failed to blacklist access token, continuing logout", {
          error: redisError,
          userId: req.user?.userId,
        });
      }
    }

    // Revoke refresh tokens
    const revokeAll = req.query.all === "true";
    if (req.user?.userId) {
      try {
        if (revokeAll) {
          await revokeAllRefreshTokensForUser(req.user.userId);
          logger.info("All refresh tokens revoked for user on logout", { userId: req.user.userId });
        } else if (req.user?.sessionId) {
          await revokeRefreshTokenBySession(req.user.sessionId);
          logger.info("Current session refresh token revoked on logout", {
            userId: req.user.userId,
            sessionId: req.user.sessionId,
          });
        }
      } catch (rtErr) {
        logger.error("Failed to revoke refresh token(s) on logout", {
          error: rtErr,
          userId: req.user.userId,
        });
      }
    }

    logger.info("User logged out successfully", {
      userId: req.user?.userId,
      email: req.user?.email,
      userAgent: req.headers["user-agent"],
      ip: req.ip || req.socket.remoteAddress,
    });

    return res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    logger.error("Logout error:", { error: err, userId: req.user?.userId });
    return res.status(400).json({ error: "Invalid token" });
  }
};

// Only allow admins to get these tokens
export const getHealthToken = (req: AuthenticatedRequest, res: Response) => {
  // Only allow admins
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden: Admins only" });
  }
  const token = jwt.sign({ type: "health" }, config.healthSecret, {
    expiresIn: config.healthTokenExpiresIn,
  });
  return res.json({ token });
};

export const getLogsToken = (req: AuthenticatedRequest, res: Response) => {
  // Only allow admins
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden: Admins only" });
  }
  const token = jwt.sign({ type: "logs" }, config.logSecret, {
    expiresIn: config.logsTokenExpiresIn,
  });
  return res.json({ token });
};

// Password Reset Controllers
export const forgotPassword = async (
  req: Request<{}, {}, ForgotPasswordRequest>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;

    // Find user by email
    const user = await prisma.users.findUnique({ where: { email } });

    // Always return success to prevent email enumeration attacks
    if (!user) {
      logger.warn("Password reset attempt for non-existent email", { email });
      return res.json({
        message: "If an account with that email exists, we've sent a password reset link.",
      });
    }

    // Revoke any existing password reset tokens for this user
    await authTokenService.revokeUserTokens(user.id, "password_reset");

    // Create new password reset token (1 hour expiry)
    const { token: resetToken } = await authTokenService.createToken({
      userId: user.id,
      tokenType: "password_reset",
      expiresInMs: expiresInToSeconds(config.passwordResetTokenExpiresIn),
    });

    // Send reset email with plain token
    await emailQueueService.sendPasswordResetEmail(email, resetToken);

    logger.info("Password reset email sent", { email });

    return res.json({
      message: "If an account with that email exists, we've sent a password reset link.",
    });
  } catch (error) {
    logger.error("Error in forgotPassword", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    next(error);
    return;
  }
};

export const resetPassword = async (
  req: Request<{}, {}, ResetPasswordRequest>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token, password } = req.body;

    // Find and validate the reset token
    const tokenData = await authTokenService.findValidToken(token, "password_reset");

    if (!tokenData) {
      return res.status(400).json({
        error: "Invalid or expired password reset token.",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update password
    await prisma.users.update({
      where: { id: tokenData.userId },
      data: {
        password_hash: hashedPassword,
      },
    });

    // Consume the reset token (delete it)
    await authTokenService.consumeToken(tokenData.id);

    // Revoke all existing refresh tokens for security
    await revokeAllRefreshTokensForUser(tokenData.userId);

    logger.info("Password reset successful", {
      userId: tokenData.userId,
      email: tokenData.user.email,
    });

    return res.json({
      message: "Password reset successful. Please log in with your new password.",
    });
  } catch (error) {
    logger.error("Error in resetPassword", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    next(error);
    return;
  }
};

export const changePassword = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { currentPassword, newPassword } = req.body as ChangePasswordRequest;
    const userId = req.user!.userId;

    // Get current user
    const user = await prisma.users.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      logger.warn("Change password attempt with incorrect current password", {
        userId,
        email: user.email,
      });
      return res.status(400).json({ error: "Current password is incorrect." });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.users.update({
      where: { id: userId },
      data: { password_hash: hashedNewPassword },
    });

    // Revoke all other refresh tokens (except current session)
    if (req.user?.sessionId) {
      await revokeRefreshTokenBySession(req.user.sessionId);
    }

    logger.info("Password changed successfully", { userId, email: user.email });

    return res.json({ message: "Password changed successfully." });
  } catch (error) {
    logger.error("Error in changePassword", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    next(error);
    return;
  }
};

// Email Verification Controllers
export const verifyEmail = async (
  req: Request<{}, {}, VerifyEmailRequest>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token } = req.body;

    // Find and validate the verification token
    const tokenData = await authTokenService.findValidToken(token, "email_verify");

    if (!tokenData) {
      return res.status(400).json({
        error: "Invalid or expired email verification token.",
      });
    }

    // Mark email as verified
    await prisma.users.update({
      where: { id: tokenData.userId },
      data: {
        email_verified: true,
      },
    });

    // Consume the verification token (delete it)
    await authTokenService.consumeToken(tokenData.id);

    logger.info("Email verified successfully", {
      userId: tokenData.userId,
      email: tokenData.user.email,
    });

    return res.json({ message: "Email verified successfully." });
  } catch (error) {
    logger.error("Error in verifyEmail", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    next(error);
    return;
  }
};

export const resendVerification = async (
  req: Request<{}, {}, ResendVerificationRequest>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;

    // Find user by email
    const user = await prisma.users.findUnique({ where: { email } });

    if (!user) {
      // Don't reveal if email exists to prevent enumeration
      return res.json({
        message:
          "If an account with that email exists and is unverified, we've sent a verification email.",
      });
    }

    if (user.email_verified) {
      return res.status(400).json({
        error: "Email is already verified.",
      });
    }

    // Revoke any existing email verification tokens for this user
    await authTokenService.revokeUserTokens(user.id, "email_verify");

    // Create new email verification token (24 hours expiry)
    const { token: verifyToken } = await authTokenService.createToken({
      userId: user.id,
      tokenType: "email_verify",
      expiresInMs: expiresInToSeconds(config.emailVerifyTokenExpiresIn),
    });

    // Send verification email with plain token
    await emailQueueService.sendEmailVerification(email, verifyToken);

    logger.info("Email verification resent", { email });

    return res.json({
      message:
        "If an account with that email exists and is unverified, we've sent a verification email.",
    });
  } catch (error) {
    logger.error("Error in resendVerification", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    next(error);
    return;
  }
};
