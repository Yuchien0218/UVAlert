import { describe, expect, it } from "vitest";
import { ProductCatalogRecordV1Schema } from "./product";
import { PRODUCT_LABEL_SNAPSHOT_VERSION } from "./versions";

describe("ProductCatalogRecordV1Schema", () => {
  it("保存穩定產品身分、名稱與目前 snapshot", () => {
    const result = ProductCatalogRecordV1Schema.parse({
      schemaVersion: "1.0.0",
      productId: "product-1",
      displayName: "  日常防曬  ",
      currentSnapshot: {
        snapshotVersion: PRODUCT_LABEL_SNAPSHOT_VERSION,
        identityStatus: "confirmed",
        expiryStatus: "unknown",
        conditionStatus: "no_issue_reported",
        sunscreenClaimStatus: "confirmed",
        ruleEligibilityAtApplication: "eligible",
        reapplicationIntervalStatus: "no_numeric_interval",
        reapplicationIntervalMinutes: null,
        preExposureWaitStatus: "no_instruction",
        preExposureWaitMinutes: null,
        waterResistanceStatus: "no_claim",
        waterResistanceMinutes: null,
        spf: null,
        paGrade: null,
        capturedAt: "2026-08-01T08:00:00.000Z"
      },
      snapshotFingerprint: "fingerprint-1",
      createdAt: "2026-08-01T08:00:00.000Z",
      updatedAt: "2026-08-01T08:00:00.000Z",
      status: "active"
    });

    expect(result.displayName).toBe("日常防曬");
  });
});
