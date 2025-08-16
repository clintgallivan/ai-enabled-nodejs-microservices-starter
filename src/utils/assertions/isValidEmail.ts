export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") {
    return false;
  }

  // More comprehensive email regex that rejects double dots and other edge cases
  const emailRegex =
    /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/;

  // Additional checks for common invalid patterns
  if (
    email.includes("..") ||
    email.startsWith(".") ||
    email.endsWith(".") ||
    email.includes("@.") ||
    email.includes(".@") ||
    email.endsWith(".")
  ) {
    return false;
  }

  return emailRegex.test(email);
}
