import { describe, expect, it } from "vitest";
import { parseAccountDeleteRequest } from "../_shared/account";

describe("account-delete function contract", () => {
  it("只允許使用者明確確認，不把 user id 放入 request", () => {
    expect(parseAccountDeleteRequest({ confirm: true })).toEqual({
      confirm: true
    });
  });
});
