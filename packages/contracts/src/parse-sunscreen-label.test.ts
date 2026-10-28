import { describe, expect, it } from "vitest";
import {
  ParseSunscreenLabelRequestSchema,
  ParseSunscreenLabelResponseSchema
} from "./parse-sunscreen-label";

describe("ParseSunscreenLabelRequestSchema", () => {
  it("accepts valid request with 1 base64 image and client local time", () => {
    const valid = {
      images: ["data:image/jpeg;base64,abc1234567890"],
      clientLocalTime: "2026-10-27T20:00:00+08:00"
    };
    const parsed = ParseSunscreenLabelRequestSchema.parse(valid);
    expect(parsed.images).toHaveLength(1);
    expect(parsed.clientLocalTime).toBe("2026-10-27T20:00:00+08:00");
  });

  it("accepts valid request with 2 images (front and back)", () => {
    const valid = {
      images: [
        "data:image/jpeg;base64,front_photo",
        "data:image/jpeg;base64,back_photo"
      ],
      clientLocalTime: "2026-10-27T20:00:00Z"
    };
    const parsed = ParseSunscreenLabelRequestSchema.parse(valid);
    expect(parsed.images).toHaveLength(2);
  });

  it("rejects empty image array", () => {
    const invalid = {
      images: [],
      clientLocalTime: "2026-10-27T20:00:00+08:00"
    };
    expect(() => ParseSunscreenLabelRequestSchema.parse(invalid)).toThrow();
  });

  it("rejects more than 2 images", () => {
    const invalid = {
      images: ["img1", "img2", "img3"],
      clientLocalTime: "2026-10-27T20:00:00+08:00"
    };
    expect(() => ParseSunscreenLabelRequestSchema.parse(invalid)).toThrow();
  });

  it("rejects invalid datetime string", () => {
    const invalid = {
      images: ["img1"],
      clientLocalTime: "2026-10-27 20:00"
    };
    expect(() => ParseSunscreenLabelRequestSchema.parse(invalid)).toThrow();
  });
});

describe("ParseSunscreenLabelResponseSchema", () => {
  it("accepts a fully identified sunscreen response", () => {
    const valid = {
      displayName: "安耐曬 金鑽高效防曬露 NA",
      spf: 50,
      paGrade: "PA++++",
      waterResistanceStatus: "80",
      reapplicationIntervalMinutes: 120,
      preExposureWaitMinutes: 15,
      expiryDate: "2027-08-31",
      sunscreenClaimConfirmed: true,
      notes: "包裝背面標示 Very Water Resistant 80min"
    };

    const parsed = ParseSunscreenLabelResponseSchema.parse(valid);
    expect(parsed.displayName).toBe("安耐曬 金鑽高效防曬露 NA");
    expect(parsed.spf).toBe(50);
    expect(parsed.paGrade).toBe("PA++++");
    expect(parsed.waterResistanceStatus).toBe("80");
    expect(parsed.expiryDate).toBe("2027-08-31");
    expect(parsed.sunscreenClaimConfirmed).toBe(true);
  });

  it("accepts response with nullable fields when packaging has partial information", () => {
    const minimal = {
      displayName: "未命名防曬乳",
      spf: null,
      paGrade: null,
      waterResistanceStatus: "unknown",
      reapplicationIntervalMinutes: null,
      preExposureWaitMinutes: null,
      expiryDate: null,
      sunscreenClaimConfirmed: true,
      notes: null
    };

    const parsed = ParseSunscreenLabelResponseSchema.parse(minimal);
    expect(parsed.spf).toBeNull();
    expect(parsed.paGrade).toBeNull();
    expect(parsed.waterResistanceStatus).toBe("unknown");
    expect(parsed.expiryDate).toBeNull();
  });

  it("rejects non-positive spf numbers", () => {
    const invalid = {
      displayName: "測試防曬",
      spf: 0,
      paGrade: null,
      waterResistanceStatus: "unknown",
      reapplicationIntervalMinutes: null,
      preExposureWaitMinutes: null,
      expiryDate: null,
      sunscreenClaimConfirmed: true,
      notes: null
    };
    expect(() => ParseSunscreenLabelResponseSchema.parse(invalid)).toThrow();
  });

  it("rejects invalid expiry date format", () => {
    const invalid = {
      displayName: "測試防曬",
      spf: 50,
      paGrade: "PA+++",
      waterResistanceStatus: "no_claim",
      reapplicationIntervalMinutes: null,
      preExposureWaitMinutes: null,
      expiryDate: "2027/08/31", // 斜線不是 YYYY-MM-DD
      sunscreenClaimConfirmed: true,
      notes: null
    };
    expect(() => ParseSunscreenLabelResponseSchema.parse(invalid)).toThrow();
  });

  it("rejects unrecognized waterResistanceStatus", () => {
    const invalid = {
      displayName: "測試防曬",
      spf: 30,
      paGrade: null,
      waterResistanceStatus: "waterproof", // 必須是 "40" | "80" | "not_water_resistant" | "no_claim" | "unknown"
      reapplicationIntervalMinutes: null,
      preExposureWaitMinutes: null,
      expiryDate: null,
      sunscreenClaimConfirmed: true,
      notes: null
    };
    expect(() => ParseSunscreenLabelResponseSchema.parse(invalid)).toThrow();
  });

  it("trims strings and rejects overly long displayName", () => {
    const invalid = {
      displayName: "A".repeat(81),
      spf: null,
      paGrade: null,
      waterResistanceStatus: "unknown",
      reapplicationIntervalMinutes: null,
      preExposureWaitMinutes: null,
      expiryDate: null,
      sunscreenClaimConfirmed: true,
      notes: null
    };
    expect(() => ParseSunscreenLabelResponseSchema.parse(invalid)).toThrow();
  });
});
