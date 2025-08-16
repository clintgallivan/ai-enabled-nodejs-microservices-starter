import { isValidEmail } from "../isValidEmail";

describe("isValidEmail", () => {
  it("should accept valid email addresses", () => {
    const validEmails = [
      "test@example.com",
      "user.name@domain.co.uk",
      "user+tag@gmail.com",
      "firstname.lastname@company-name.com",
      "email@subdomain.example.com",
      "firstname_lastname@example.com",
      "user123@test123.com",
      "a@b.co",
      "very.long.email.address@very.long.domain.name.com",
    ];

    validEmails.forEach(email => {
      expect(isValidEmail(email)).toBe(true);
    });
  });

  it("should reject invalid email addresses", () => {
    const invalidEmails = [
      "", // empty string
      "invalid", // no @ symbol
      "@example.com", // missing local part
      "test@", // missing domain
      "test..test@example.com", // double dots in local part
      "test@example", // no TLD
      "test @example.com", // space in local part
      "test@example..com", // double dots in domain
      "test@.example.com", // dot at start of domain
      "test@example.com.", // dot at end
      "test@", // missing domain completely
      "test.example.com", // missing @ symbol
      "test@example,com", // comma instead of dot
    ];

    invalidEmails.forEach(email => {
      expect(isValidEmail(email)).toBe(false);
    });
  });

  it("should handle edge cases and non-string inputs", () => {
    expect(isValidEmail(null as any)).toBe(false);
    expect(isValidEmail(undefined as any)).toBe(false);
    expect(isValidEmail(123 as any)).toBe(false);
    expect(isValidEmail({} as any)).toBe(false);
    expect(isValidEmail([] as any)).toBe(false);
  });

  it("should handle special but valid email formats", () => {
    // These are technically valid per RFC but less common
    const edgeCaseValidEmails = [
      "user+tag+more@example.com",
      "user.name+tag@example.com",
      "x@example.com",
      "1234567890@example.com",
    ];

    edgeCaseValidEmails.forEach(email => {
      expect(isValidEmail(email)).toBe(true);
    });
  });
});
