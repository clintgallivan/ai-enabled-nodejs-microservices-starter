import ms from "ms";

/**
 * Convert JWT expiresIn string to Redis TTL seconds
 * Uses the `ms` library to support all standard time formats
 * Supports: "30s", "15m", "24h", "7d", "2w", "1M", "1y", etc.
 */
export function expiresInToSeconds(expiresIn: ms.StringValue): number {
  try {
    const milliseconds = ms(expiresIn);
    // ms() returns number for valid inputs, undefined for invalid
    if (typeof milliseconds !== "number" || milliseconds < 0) {
      throw new Error(`Invalid expiresIn value: ${expiresIn}`);
    }
    return Math.floor(milliseconds / 1000);
  } catch (error) {
    throw new Error(
      `Failed to convert expiresIn "${expiresIn}" to seconds: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
