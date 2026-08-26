import { describe, expect, it } from "vitest";
import {
  deriveExpiryStatus,
  deriveRuleEligibility,
  ProductCatalogRecordV1Schema
} from "./product";
import { PRODUCT_LABEL_SNAPSHOT_VERSION } from "./versions";

describe("ProductCatalogRecordV1Schema", () => {
  it("保存穩定產品身分、名稱與目前 snapshot", () => {
    const result = ProductCatalogRecordV1Schema.parse({
      schemaVersion: "1.1.0",
      productId: "product-1",
      displayName: "  日常防曬  ",
      gearCategory: "sunscreen",
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
    // 四個新欄位皆可省略，省略時為 null。
    expect(result).toMatchObject({
      purchaseMonth: null,
      expiryDate: null,
      note: null,
      archivedAt: null
    });
  });

  it("拒絕格式不符的購買月份與到期日", () => {
    const base = {
      schemaVersion: "1.1.0",
      productId: "product-2",
      displayName: "測試",
      gearCategory: "eyewear",
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
      snapshotFingerprint: "fingerprint-2",
      createdAt: "2026-08-01T08:00:00.000Z",
      updatedAt: "2026-08-01T08:00:00.000Z",
      status: "active"
    };

    expect(
      ProductCatalogRecordV1Schema.safeParse({
        ...base,
        purchaseMonth: "2026-13"
      }).success
    ).toBe(false);
    expect(
      ProductCatalogRecordV1Schema.safeParse({
        ...base,
        expiryDate: "2026/08/31"
      }).success
    ).toBe(false);
  });
});

describe("deriveExpiryStatus", () => {
  it("沒填到期日時維持 unknown，不擅自宣稱未過期", () => {
    expect(deriveExpiryStatus(null, "2026-08-01T00:00:00.000Z")).toBe(
      "unknown"
    );
  });

  it("到期日當天仍未過期，隔天才過期", () => {
    expect(deriveExpiryStatus("2026-08-31", "2026-08-31T12:00:00.000Z")).toBe(
      "not_expired"
    );
    expect(deriveExpiryStatus("2026-08-31", "2026-09-01T12:00:00.000Z")).toBe(
      "expired"
    );
  });
});

describe("deriveRuleEligibility", () => {
  it("過期優先於防曬標示缺失", () => {
    expect(
      deriveRuleEligibility({
        identityStatus: "confirmed",
        expiryStatus: "expired",
        conditionStatus: "no_issue_reported",
        sunscreenClaimStatus: "no_claim"
      })
    ).toBe("expired");
  });

  it("身分未確認優先於一切", () => {
    expect(
      deriveRuleEligibility({
        identityStatus: "identity_unconfirmed",
        expiryStatus: "expired",
        conditionStatus: "abnormal_reported",
        sunscreenClaimStatus: "confirmed"
      })
    ).toBe("identity_unconfirmed");
  });
});
