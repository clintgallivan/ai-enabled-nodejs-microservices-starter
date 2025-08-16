import { getEnvVar } from "../env";

describe("Environment Variable Utils", () => {
  // Store original env vars
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env to a fresh copy
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original env vars
    process.env = originalEnv;
  });

  describe("getEnvVar", () => {
    it("should return value when environment variable exists", () => {
      process.env.TEST_VAR = "test-value";

      const result = getEnvVar("TEST_VAR");

      expect(result).toBe("test-value");
    });

    it("should throw error when environment variable is missing", () => {
      delete process.env.MISSING_VAR;

      expect(() => getEnvVar("MISSING_VAR")).toThrow(
        "Environment variable MISSING_VAR is missing."
      );
    });

    it("should throw error when environment variable is empty string", () => {
      process.env.EMPTY_VAR = "";

      expect(() => getEnvVar("EMPTY_VAR")).toThrow("Environment variable EMPTY_VAR is missing.");
    });

    it("should return value with spaces", () => {
      process.env.SPACED_VAR = "  value with spaces  ";

      const result = getEnvVar("SPACED_VAR");

      expect(result).toBe("  value with spaces  ");
    });

    it("should handle numeric values as strings", () => {
      process.env.NUMERIC_VAR = "3000";

      const result = getEnvVar("NUMERIC_VAR");

      expect(result).toBe("3000");
      expect(typeof result).toBe("string");
    });

    it("should handle boolean-like values as strings", () => {
      process.env.BOOLEAN_VAR = "true";

      const result = getEnvVar("BOOLEAN_VAR");

      expect(result).toBe("true");
      expect(typeof result).toBe("string");
    });

    it("should handle complex values", () => {
      process.env.COMPLEX_VAR = "http://localhost:3000,https://app.example.com";

      const result = getEnvVar("COMPLEX_VAR");

      expect(result).toBe("http://localhost:3000,https://app.example.com");
    });
  });
});
