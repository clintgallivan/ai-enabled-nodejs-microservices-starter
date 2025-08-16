import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  getHealthToken,
  getLogsToken,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  changePassword,
  verifyEmail,
  resendVerification,
} from "controllers/authController";
import { tokenAuthHandler } from "middleware/tokenAuthHandler";
import { validateRequest } from "middleware/validateRequest";
import {
  RegisterSchema,
  LoginSchema,
  RefreshTokenSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  ChangePasswordSchema,
  VerifyEmailSchema,
  ResendVerificationSchema,
} from "utils/schemas/authSchemas";
import { authRateLimit, adminRateLimit, passwordRateLimit } from "config/rateLimits";

const router = Router();

router.post("/register", authRateLimit, validateRequest(RegisterSchema), registerUser);
router.post("/login", passwordRateLimit, validateRequest(LoginSchema), loginUser);
router.post(
  "/refresh-token",
  authRateLimit,
  validateRequest(RefreshTokenSchema),
  refreshAccessToken
);

// Password reset routes (public)
router.post(
  "/forgot-password",
  passwordRateLimit,
  validateRequest(ForgotPasswordSchema),
  forgotPassword
);
router.post(
  "/reset-password",
  passwordRateLimit,
  validateRequest(ResetPasswordSchema),
  resetPassword
);

// Email verification routes (public)
router.post("/verify-email", authRateLimit, validateRequest(VerifyEmailSchema), verifyEmail);
router.post(
  "/resend-verification",
  authRateLimit,
  validateRequest(ResendVerificationSchema),
  resendVerification
);

// Protect these routes so only authenticated users can access them
router.post("/logout", tokenAuthHandler, logoutUser);
router.post(
  "/change-password",
  passwordRateLimit,
  tokenAuthHandler,
  validateRequest(ChangePasswordSchema),
  changePassword
);
router.get("/health-token", adminRateLimit, tokenAuthHandler, getHealthToken);
router.get("/logs-token", adminRateLimit, tokenAuthHandler, getLogsToken);

export default router;
