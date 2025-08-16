import { validateMsFormat } from "../validateMsFormat";

describe("validateMsFormat", () => {
  it("should return valid time strings unchanged", () => {
    const validFormats = [
      "24h",
      "7d",
      "60s",
      "30m",
      "1w",
      "2M",
      "1y",
      "1.5h",
      "30.5m",
      "2 hours",
      "30 minutes",
      "1 day",
    ];

    validFormats.forEach(format => {
      expect(validateMsFormat(format, "TEST_VAR")).toBe(format);
    });
  });

  it("should throw error for invalid formats with descriptive message", () => {
    const invalidFormats = ["invalid", "", "abc", "xyz123", "123xyz", "negative-1h", "bad-format"];

    invalidFormats.forEach(format => {
      expect(() => validateMsFormat(format, "TEST_VAR")).toThrow(
        /Environment variable TEST_VAR has invalid time format/
      );
    });
  });

  it("should include the environment variable name in error message", () => {
    expect(() => validateMsFormat("invalid", "MY_CUSTOM_VAR")).toThrow(
      /Environment variable MY_CUSTOM_VAR has invalid time format: "invalid"/
    );

    expect(() => validateMsFormat("bad-format", "ANOTHER_VAR")).toThrow(
      /Environment variable ANOTHER_VAR has invalid time format: "bad-format"/
    );
  });

  it("should validate common JWT expiry formats", () => {
    const jwtFormats = [
      "15m", // 15 minutes
      "1h", // 1 hour
      "24h", // 1 day
      "7d", // 1 week
      "30d", // 30 days
      "90d", // 90 days
      "1y", // 1 year
    ];

    jwtFormats.forEach(format => {
      expect(validateMsFormat(format, "JWT_EXPIRES_IN")).toBe(format);
    });
  });

  it("should handle edge cases for invalid inputs", () => {
    const edgeCases = [null, undefined, 123, {}, [], true, false];

    edgeCases.forEach(value => {
      expect(() => validateMsFormat(value as any, "TEST_VAR")).toThrow();
    });
  });

  it("should validate millisecond precision formats", () => {
    const msFormats = [
      "1000ms",
      "500ms",
      "100ms",
      "123", // valid: treated as 123 milliseconds
      "1000", // valid: treated as 1000 milliseconds
    ];

    msFormats.forEach(format => {
      expect(validateMsFormat(format, "MS_VAR")).toBe(format);
    });
  });
});
