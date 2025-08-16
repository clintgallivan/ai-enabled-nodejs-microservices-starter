import ms from "ms";

/**
 * Validates that a string is a valid ms() time format
 * @param value - The time string to validate (e.g., "24h", "7d", "60s")
 * @param envVarName - The environment variable name for error messages
 * @returns The validated time string
 * @throws Error if the format is invalid
 */
export function validateMsFormat(
  value: string | ms.StringValue,
  envVarName: string
): ms.StringValue {
  try {
    const result = ms(value as any); // eslint-disable-line @typescript-eslint/no-explicit-any -- ms() accepts various types
    if (typeof result !== "number" || result <= 0) {
      throw new Error(`Invalid time format`);
    }
    return value as ms.StringValue;
  } catch {
    throw new Error(
      `Environment variable ${envVarName} has invalid time format: "${value}". Expected format like "24h", "7d", "60s"`
    );
  }
}
