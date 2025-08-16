import { isStrongPassword } from "../isStrongPassword";

describe("isStrongPassword", () => {
  it("should accept strong passwords", () => {
    const strongPasswords = [
      "Password123!",
      "MySecure@Password1",
      "Complex$Pass2024",
      "StrongPwd@99",
      "Test123$Password",
      "Abc123!def",
      "SecureP@ss1",
      "MyPass123#",
    ];

    strongPasswords.forEach(password => {
      expect(isStrongPassword(password)).toBe(true);
    });
  });

  it("should reject passwords that are too short", () => {
    const shortPasswords = [
      "",
      "a",
      "short",
      "Abc1!",
      "Pass1!",
      "1234567", // 7 chars
    ];

    shortPasswords.forEach(password => {
      expect(isStrongPassword(password)).toBe(false);
    });
  });

  it("should reject passwords missing uppercase letters", () => {
    const noUppercasePasswords = ["nouppercase123!", "password123!", "mypassword1@", "test12345!"];

    noUppercasePasswords.forEach(password => {
      expect(isStrongPassword(password)).toBe(false);
    });
  });

  it("should reject passwords missing lowercase letters", () => {
    const noLowercasePasswords = ["NOLOWERCASE123!", "PASSWORD123!", "MYPASSWORD1@", "TEST12345!"];

    noLowercasePasswords.forEach(password => {
      expect(isStrongPassword(password)).toBe(false);
    });
  });

  it("should reject passwords missing numbers", () => {
    const noNumberPasswords = ["NoNumbers!", "Password!", "MySecure@Password", "TestPassword$"];

    noNumberPasswords.forEach(password => {
      expect(isStrongPassword(password)).toBe(false);
    });
  });

  it("should reject passwords missing symbols", () => {
    const noSymbolPasswords = [
      "NoSymbols123",
      "Password123",
      "MySecurePassword1",
      "TestPassword99",
    ];

    noSymbolPasswords.forEach(password => {
      expect(isStrongPassword(password)).toBe(false);
    });
  });

  it("should handle edge cases and non-string inputs", () => {
    expect(isStrongPassword(null as any)).toBe(false);
    expect(isStrongPassword(undefined as any)).toBe(false);
    expect(isStrongPassword(123 as any)).toBe(false);
    expect(isStrongPassword({} as any)).toBe(false);
    expect(isStrongPassword([] as any)).toBe(false);
  });

  it("should accept passwords with various symbol types", () => {
    const symbolVariations = [
      "Password123!",
      "Password123@",
      "Password123#",
      "Password123$",
      "Password123%",
      "Password123^",
      "Password123&",
      "Password123*",
      "Password123?",
    ];

    symbolVariations.forEach(password => {
      expect(isStrongPassword(password)).toBe(true);
    });
  });

  it("should handle minimum length requirement exactly", () => {
    // Exactly 8 characters with all requirements
    expect(isStrongPassword("Abc123!d")).toBe(true);
    // 7 characters with all requirements (should fail)
    expect(isStrongPassword("Abc123!")).toBe(false);
  });
});
