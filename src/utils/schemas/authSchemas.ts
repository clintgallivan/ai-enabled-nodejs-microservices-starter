import { z } from "zod";

// Strong password validation - matches your current isStrongPassword logic
const strongPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .regex(/[a-z]/, "Password must include at least one lowercase letter")
  .regex(/[A-Z]/, "Password must include at least one uppercase letter")
  .regex(/\d/, "Password must include at least one number")
  .regex(/[@$!%*?&]/, "Password must include at least one symbol (@$!%*?&)");

export const RegisterSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: strongPasswordSchema,
});

export const LoginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

// Password reset schemas
export const ForgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: strongPasswordSchema,
});

// Change password schema
export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: strongPasswordSchema,
});

// Email verification schemas
export const VerifyEmailSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

export const ResendVerificationSchema = z.object({
  email: z.string().email("Invalid email address"),
});

// Export types
export type RegisterRequest = z.infer<typeof RegisterSchema>;
export type LoginRequest = z.infer<typeof LoginSchema>;
export type RefreshTokenRequest = z.infer<typeof RefreshTokenSchema>;
export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordRequest = z.infer<typeof ResetPasswordSchema>;
export type ChangePasswordRequest = z.infer<typeof ChangePasswordSchema>;
export type VerifyEmailRequest = z.infer<typeof VerifyEmailSchema>;
export type ResendVerificationRequest = z.infer<typeof ResendVerificationSchema>;
