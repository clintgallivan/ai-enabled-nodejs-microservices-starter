import { RegisterSchema, LoginSchema, RefreshTokenSchema } from "../authSchemas";

describe("Auth Schemas", () => {
  describe("RegisterSchema", () => {
    it("should accept valid registration data", () => {
      const validData = [
        {
          email: "test@example.com",
          password: "Password123!",
        },
        {
          email: "user.name@domain.co.uk",
          password: "MySecure@Password1",
        },
        {
          email: "firstname_lastname@example.com",
          password: "Complex$Pass2024",
        },
      ];

      validData.forEach(data => {
        const result = RegisterSchema.safeParse(data);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(data);
        }
      });
    });

    it("should reject invalid email formats", () => {
      const invalidEmails = [
        "invalid-email",
        "@example.com",
        "test@",
        "test..test@example.com",
        "",
      ];

      invalidEmails.forEach(email => {
        const result = RegisterSchema.safeParse({
          email,
          password: "ValidPassword123!",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(
            result.error.issues.some(
              issue =>
                issue.path.includes("email") && issue.message.includes("Invalid email format")
            )
          ).toBe(true);
        }
      });
    });

    it("should reject weak passwords with specific error messages", () => {
      const weakPasswords = [
        { password: "short", expectedError: "at least 8 characters" },
        { password: "nouppercase123!", expectedError: "uppercase letter" },
        { password: "NoNumbers!", expectedError: "number" },
        { password: "NoSymbols123", expectedError: "symbol" },
      ];

      weakPasswords.forEach(({ password, expectedError }) => {
        const result = RegisterSchema.safeParse({
          email: "test@example.com",
          password,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          const passwordErrors = result.error.issues.filter(issue =>
            issue.path.includes("password")
          );
          expect(passwordErrors.length).toBeGreaterThan(0);
          expect(
            passwordErrors.some(error =>
              error.message.toLowerCase().includes(expectedError.toLowerCase())
            )
          ).toBe(true);
        }
      });
    });

    it("should reject passwords missing lowercase letters", () => {
      const result = RegisterSchema.safeParse({
        email: "test@example.com",
        password: "NOLOWERCASE123!", // No lowercase letters
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some(
            issue => issue.path.includes("password") && issue.message.includes("lowercase")
          )
        ).toBe(true);
      }
    });

    it("should require both email and password", () => {
      const incompleteData = [
        { email: "test@example.com" }, // missing password
        { password: "Password123!" }, // missing email
        {}, // missing both
      ];

      incompleteData.forEach(data => {
        const result = RegisterSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    it("should provide detailed error information", () => {
      const result = RegisterSchema.safeParse({
        email: "invalid-email",
        password: "weak",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        // Zod provides separate errors for each failed validation rule
        expect(result.error.issues.length).toBeGreaterThan(2); // email + multiple password errors

        const emailErrors = result.error.issues.filter(issue => issue.path.includes("email"));
        const passwordErrors = result.error.issues.filter(issue => issue.path.includes("password"));

        expect(emailErrors.length).toBeGreaterThan(0);
        expect(passwordErrors.length).toBeGreaterThan(0);
        expect(emailErrors[0]?.message).toContain("Invalid email format");
        expect(passwordErrors.some(error => error.message.includes("at least 8 characters"))).toBe(
          true
        );
      }
    });
  });

  describe("LoginSchema", () => {
    it("should accept valid login data", () => {
      const validData = {
        email: "test@example.com",
        password: "any-password", // Login doesn't validate strength
      };

      const result = LoginSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it("should reject invalid email formats", () => {
      const result = LoginSchema.safeParse({
        email: "invalid-email",
        password: "password",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.path.includes("email"))).toBe(true);
      }
    });

    it("should require both email and password", () => {
      const incompleteData = [
        { email: "test@example.com" }, // missing password
        { password: "password" }, // missing email
        {}, // missing both
      ];

      incompleteData.forEach(data => {
        const result = LoginSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    it("should accept any password for login (no strength validation)", () => {
      const weakPasswords = ["1", "weak", "no-symbols", "NOLOWERCASE"];

      weakPasswords.forEach(password => {
        const result = LoginSchema.safeParse({
          email: "test@example.com",
          password,
        });

        expect(result.success).toBe(true);
      });
    });
  });

  describe("RefreshTokenSchema", () => {
    it("should accept valid refresh token", () => {
      const validData = {
        refreshToken: "valid-refresh-token-string",
      };

      const result = RefreshTokenSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it("should reject empty or missing refresh token", () => {
      const invalidData = [
        { refreshToken: "" }, // empty string
        {}, // missing refreshToken
        { refreshToken: null }, // null value
        { refreshToken: undefined }, // undefined value
      ];

      invalidData.forEach(data => {
        const result = RefreshTokenSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some(issue => issue.path.includes("refreshToken"))).toBe(true);
        }
      });
    });

    it("should provide clear error message for missing refresh token", () => {
      const result = RefreshTokenSchema.safeParse({});

      expect(result.success).toBe(false);
      if (!result.success) {
        const refreshTokenError = result.error.issues.find(issue =>
          issue.path.includes("refreshToken")
        );
        // Zod's default message for missing required field (different from empty string)
        expect(refreshTokenError?.message).toMatch(/Required|expected string, received undefined/);
      }
    });
  });

  describe("Type inference", () => {
    it("should properly infer types from schemas", () => {
      // This test ensures TypeScript types are working correctly
      const registerData = RegisterSchema.parse({
        email: "test@example.com",
        password: "Password123!",
      });

      const loginData = LoginSchema.parse({
        email: "test@example.com",
        password: "password",
      });

      const refreshData = RefreshTokenSchema.parse({
        refreshToken: "token",
      });

      // TypeScript should infer these correctly
      expect(typeof registerData.email).toBe("string");
      expect(typeof registerData.password).toBe("string");
      expect(typeof loginData.email).toBe("string");
      expect(typeof loginData.password).toBe("string");
      expect(typeof refreshData.refreshToken).toBe("string");
    });
  });
});
