import { describe, expect, it } from "vitest";
import { CwaMappingError, parseRegionCode } from "../_shared/cwa";

describe("uv forecast request boundary", () => {
  it("只接受台灣鄉鎮目錄使用的八碼行政區代碼", () => {
    expect(parseRegionCode(" 65000010 ")).toBe("65000010");
    expect(() => parseRegionCode(null)).toThrow(CwaMappingError);
    expect(() => parseRegionCode("TPE-ZHONGZHENG")).toThrow(CwaMappingError);
    expect(() => parseRegionCode("00000000")).toThrow(CwaMappingError);
  });
});
