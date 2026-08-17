export class AccountValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountValidationError";
  }
}

export function parseAccountDeleteRequest(input: unknown): { confirm: true } {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new AccountValidationError("需要明確確認清除雲端資料");
  }
  const value = input as Record<string, unknown>;
  if (Object.keys(value).some((key) => key !== "confirm") || value.confirm !== true) {
    throw new AccountValidationError("需要明確確認清除雲端資料");
  }
  return { confirm: true };
}
