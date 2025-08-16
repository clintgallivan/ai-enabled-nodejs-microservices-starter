import { UserResponseSchema, LoginResponseSchema, RefreshResponseSchema } from "../auth";

describe("Auth Response Schemas", () => {
  describe("UserResponseSchema", () => {
    it("should accept valid user response data", () => {
      const validUserData = {
        id: "user-123",
        email: "test@example.com",
        planTier: "free",
        role: "user",
        createdAt: new Date("2024-01-01"),
      };

      const result = UserResponseSchema.safeParse(validUserData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validUserData);
      }
    });

    it("should require planTier (no longer nullable)", () => {
      const userDataWithoutPlanTier = {
        id: "user-123",
        email: "test@example.com",
        // missing planTier
        role: "admin",
        createdAt: new Date(),
      };

      const result = UserResponseSchema.safeParse(userDataWithoutPlanTier);
      expect(result.success).toBe(false); // Should fail because planTier is required
    });

    it("should reject invalid user data", () => {
      const invalidData = [
        {
          id: 123,
          email: "test@example.com",
          planTier: "free",
          role: "user",
          createdAt: new Date(),
        }, // id should be string
        { id: "user-123", planTier: "free", role: "user", createdAt: new Date() }, // missing email
        { id: "user-123", email: "test@example.com", role: "user", createdAt: new Date() }, // missing planTier
        { id: "user-123", email: "test@example.com", planTier: "free", role: "user" }, // missing createdAt (now required)
        {}, // missing all required fields
      ];

      invalidData.forEach(data => {
        const result = UserResponseSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    it("should accept any string as email (no format validation in response)", () => {
      const dataWithStringEmail = {
        id: "user-123",
        email: "not-an-email-format", // Response schema only checks for string
        planTier: "free",
        role: "user",
        createdAt: new Date(),
      };

      const result = UserResponseSchema.safeParse(dataWithStringEmail);
      expect(result.success).toBe(true); // Should pass because response schema is lenient
    });
  });

  describe("LoginResponseSchema", () => {
    it("should accept valid login response data", () => {
      const validLoginResponse = {
        token: "jwt.access.token",
        refreshToken: "refresh.token.value",
        user: {
          id: "user-123",
          email: "test@example.com",
          planTier: "premium",
          role: "user",
          createdAt: new Date("2024-01-01"),
        },
      };

      const result = LoginResponseSchema.safeParse(validLoginResponse);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.token).toBe("jwt.access.token");
        expect(result.data.refreshToken).toBe("refresh.token.value");
        expect(result.data.user.email).toBe("test@example.com");
      }
    });

    it("should require all fields in login response", () => {
      const incompleteData = [
        {
          refreshToken: "refresh.token",
          user: {
            id: "user-123",
            email: "test@example.com",
            planTier: "free",
            role: "user",
            createdAt: new Date(),
          },
        }, // missing token
        {
          token: "jwt.token",
          user: {
            id: "user-123",
            email: "test@example.com",
            planTier: "free",
            role: "user",
            createdAt: new Date(),
          },
        }, // missing refreshToken
        {
          token: "jwt.token",
          refreshToken: "refresh.token",
        }, // missing user
      ];

      incompleteData.forEach(data => {
        const result = LoginResponseSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    it("should validate nested user object structure", () => {
      const loginResponseWithInvalidUser = {
        token: "jwt.token",
        refreshToken: "refresh.token",
        user: {
          id: 123, // Should be string
          email: "test@example.com",
          planTier: "free",
          role: "user",
          createdAt: new Date(),
        },
      };

      const result = LoginResponseSchema.safeParse(loginResponseWithInvalidUser);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some(
            issue => issue.path.includes("user") && issue.path.includes("id")
          )
        ).toBe(true);
      }
    });

    it("should require user with valid planTier (no longer nullable)", () => {
      const loginResponseWithValidPlanTier = {
        token: "jwt.token",
        refreshToken: "refresh.token",
        user: {
          id: "user-123",
          email: "test@example.com",
          planTier: "premium", // planTier is required
          role: "admin",
          createdAt: new Date(),
        },
      };

      const result = LoginResponseSchema.safeParse(loginResponseWithValidPlanTier);
      expect(result.success).toBe(true);
    });
  });

  describe("RefreshResponseSchema", () => {
    it("should accept valid refresh response data", () => {
      const validRefreshResponse = {
        token: "new.jwt.token",
        refreshToken: "new.refresh.token",
      };

      const result = RefreshResponseSchema.safeParse(validRefreshResponse);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.token).toBe("new.jwt.token");
        expect(result.data.refreshToken).toBe("new.refresh.token");
      }
    });

    it("should require both token and refreshToken", () => {
      const incompleteData = [
        { token: "jwt.token" }, // missing refreshToken
        { refreshToken: "refresh.token" }, // missing token
        {}, // missing both
      ];

      incompleteData.forEach(data => {
        const result = RefreshResponseSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    it("should reject non-string tokens", () => {
      const invalidTokenData = [
        { token: 123, refreshToken: "refresh.token" },
        { token: "jwt.token", refreshToken: null },
        { token: undefined, refreshToken: "refresh.token" },
      ];

      invalidTokenData.forEach(data => {
        const result = RefreshResponseSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });
  });

  describe("Type inference", () => {
    it("should properly infer response types", () => {
      const userData = UserResponseSchema.parse({
        id: "user-123",
        email: "test@example.com",
        planTier: "free",
        role: "user",
        createdAt: new Date(),
      });

      const loginData = LoginResponseSchema.parse({
        token: "jwt.token",
        refreshToken: "refresh.token",
        user: userData,
      });

      const refreshData = RefreshResponseSchema.parse({
        token: "new.jwt.token",
        refreshToken: "new.refresh.token",
      });

      // TypeScript should infer these correctly
      expect(typeof userData.id).toBe("string");
      expect(typeof userData.email).toBe("string");
      expect(typeof loginData.token).toBe("string");
      expect(typeof loginData.user.email).toBe("string");
      expect(typeof refreshData.token).toBe("string");
    });
  });
});
