export function isStrongPassword(password: string): boolean {
  if (!password || typeof password !== "string") {
    return false;
  }

  // At least 8 characters, one uppercase, one lowercase, one number, one special character
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/.test(
    password
  );
}
