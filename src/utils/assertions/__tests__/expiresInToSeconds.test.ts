import { expiresInToSeconds } from "../expiresInToSeconds";

describe("expiresInToSeconds", () => {
  it("should convert basic time strings to seconds correctly", () => {
    expect(expiresInToSeconds("60s")).toBe(60);
    expect(expiresInToSeconds("5m")).toBe(300);
    expect(expiresInToSeconds("2h")).toBe(7200);
    expect(expiresInToSeconds("1d")).toBe(86400);
    expect(expiresInToSeconds("1w")).toBe(604800);
  });

  it("should handle decimal values", () => {
    expect(expiresInToSeconds("1.5h")).toBe(5400); // 1.5 hours = 5400 seconds
    expect(expiresInToSeconds("30.5m")).toBe(1830); // 30.5 minutes = 1830 seconds
  });

  it("should handle verbose time formats", () => {
    expect(expiresInToSeconds("2 hours")).toBe(7200);
    expect(expiresInToSeconds("30 minutes")).toBe(1800);
    expect(expiresInToSeconds("1 day")).toBe(86400);
  });

  it("should handle edge cases with valid formats", () => {
    expect(expiresInToSeconds("0s")).toBe(0);
    expect(expiresInToSeconds("1ms")).toBe(0); // rounds down to 0 seconds
  });

  it("should throw error for invalid formats", () => {
    const invalidFormats = ["", "invalid", "abc123", "123xyz", "negative-1h", "bad-format", "xyz"];

    invalidFormats.forEach(format => {
      expect(() => expiresInToSeconds(format as any)).toThrow(/Failed to convert expiresIn/);
    });
  });

  it("should throw error for null/undefined inputs", () => {
    expect(() => expiresInToSeconds(null as any)).toThrow();
    expect(() => expiresInToSeconds(undefined as any)).toThrow();
  });

  it("should handle common JWT expiry times", () => {
    // Common token expiry times
    expect(expiresInToSeconds("15m")).toBe(900); // 15 minutes
    expect(expiresInToSeconds("1h")).toBe(3600); // 1 hour
    expect(expiresInToSeconds("24h")).toBe(86400); // 1 day
    expect(expiresInToSeconds("7d")).toBe(604800); // 1 week
    expect(expiresInToSeconds("30d")).toBe(2592000); // 30 days
  });

  it("should handle numeric millisecond values", () => {
    // ms() accepts pure numbers as milliseconds
    expect(expiresInToSeconds("1000")).toBe(1); // 1000ms = 1 second
    expect(expiresInToSeconds("5000")).toBe(5); // 5000ms = 5 seconds
    expect(expiresInToSeconds("123")).toBe(0); // 123ms = 0.123 seconds (rounds down)
  });
});
