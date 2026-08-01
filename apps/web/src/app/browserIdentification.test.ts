import { describe, expect, it } from "vitest";
import { isSamsungInternet } from "./browserIdentification";

describe("isSamsungInternet", () => {
  it("recognizes the Samsung Internet browser token", () => {
    const userAgent =
      "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 " +
      "Chrome/130.0 Mobile Safari/537.36 SamsungBrowser/28.0";

    expect(isSamsungInternet(userAgent)).toBe(true);
  });

  it.each([
    [
      "Android Chrome",
      "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 " +
        "Chrome/130.0 Mobile Safari/537.36"
    ],
    ["empty user agent", ""]
  ])("does not classify %s as Samsung Internet", (_label, userAgent) => {
    expect(isSamsungInternet(userAgent)).toBe(false);
  });
});
