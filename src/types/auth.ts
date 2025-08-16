import { Request } from "express";
import { z } from "zod";

// Authenticated request interface
export interface AuthenticatedRequest extends Request {
  user?: {
    userId?: string;
    email?: string;
    role?: string;
    sessionId?: string;
    [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any -- JWT claims can be any type
  };
}

// Response schemas with Zod for type safety
export const UserResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  planTier: z.string(), // Always set in registration and has DB default
  role: z.string(),
  createdAt: z.date(),
});

export const LoginResponseSchema = z.object({
  token: z.string(),
  refreshToken: z.string(),
  user: UserResponseSchema,
});

export const RefreshResponseSchema = z.object({
  token: z.string(),
  refreshToken: z.string(),
});

// Export inferred types
export type UserResponse = z.infer<typeof UserResponseSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;
