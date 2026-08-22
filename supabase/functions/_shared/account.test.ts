import { describe, expect, it } from "vitest";
import { AccountValidationError, parseAccountDeleteRequest } from "./account";

describe("account delete boundary", () => {
  it("只接受明確 confirm=true，拒絕空 body 或額外資料", () => {
    expect(parseAccountDeleteRequest({ confirm: true })).toEqual({ confirm: true });
    expect(() => parseAccountDeleteRequest({ confirm: false })).toThrow(AccountValidationError);
    expect(() => parseAccountDeleteRequest({ confirm: true, userId: "other-user" }))
      .toThrow(AccountValidationError);
  });
});
