import { describe, expect, it } from "vitest";
import {
  deriveExpiryStatus,
  deriveRuleEligibility,
  PRODUCT_CATALOG_RECORD_VERSION,
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
    // 選填欄位皆可省略，省略時為 null。
    expect(result).toMatchObject({
      purchaseMonth: null,
      expiryDate: null,
      note: null,
      archivedAt: null,
      // 2026-08-30 新增的兩個
      priceTwd: null,
      usageRating: null
    });
  });

  /*
   * 2026-08-30：釘住「新增選填欄位不升 schemaVersion」這個決定。
   *
   * 規格草案原本推論「schemaVersion 是 z.literal()，不升版舊紀錄反而會
   * 過不了」。實際上推論是反的，而且升版才是危險的那一邊——
   * LocalProductCatalogRepository.#normalize() 對「版本不等於當前值」的
   * 紀錄會套用一組寫死的預設值（gearCategory 強制成 "sunscreen"，
   * purchaseMonth／expiryDate／note／archivedAt 全部清成 null）。那段
   * migration 是為 1.0.0 寫的；升到 1.2.0 會讓完整的 1.1.0 紀錄走進去，
   * 使用者存的太陽眼鏡會變成防曬乳。
   *
   * 這條測試證明「不升版」確實可行：缺少新欄位的舊紀錄仍然解析得過。
   */
  it("缺少 priceTwd／usageRating 的舊紀錄仍解析得過，不需要升版", () => {
    const legacy = {
      schemaVersion: PRODUCT_CATALOG_RECORD_VERSION,
      productId: "product-legacy",
      displayName: "舊紀錄",
      gearCategory: "eyewear",
      currentSnapshot: {
        snapshotVersion: PRODUCT_LABEL_SNAPSHOT_VERSION,
        identityStatus: "confirmed",
        expiryStatus: "unknown",
        conditionStatus: "no_issue_reported",
        sunscreenClaimStatus: "no_claim",
        ruleEligibilityAtApplication: "no_sunscreen_claim",
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
      snapshotFingerprint: "fingerprint-legacy",
      purchaseMonth: "2026-07",
      note: "舊備註",
      createdAt: "2026-08-01T08:00:00.000Z",
      updatedAt: "2026-08-01T08:00:00.000Z",
      status: "active"
    };

    const result = ProductCatalogRecordV1Schema.parse(legacy);

    expect(result.priceTwd).toBeNull();
    expect(result.usageRating).toBeNull();
    // 既有資料不能在解析過程中被動到。
    expect(result.gearCategory).toBe("eyewear");
    expect(result.purchaseMonth).toBe("2026-07");
    expect(result.note).toBe("舊備註");
  });

  it("價格只收非負整數，評價只收三檔", () => {
    const base = ProductCatalogRecordV1Schema.parse({
      schemaVersion: PRODUCT_CATALOG_RECORD_VERSION,
      productId: "product-3",
      displayName: "測試",
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
      snapshotFingerprint: "fingerprint-3",
      priceTwd: 690,
      usageRating: "good",
      createdAt: "2026-08-01T08:00:00.000Z",
      updatedAt: "2026-08-01T08:00:00.000Z",
      status: "active"
    });

    expect(base.priceTwd).toBe(690);
    expect(base.usageRating).toBe("good");

    const raw = { ...base } as Record<string, unknown>;
    expect(() =>
      ProductCatalogRecordV1Schema.parse({ ...raw, priceTwd: -1 })
    ).toThrow();
    expect(() =>
      ProductCatalogRecordV1Schema.parse({ ...raw, priceTwd: 99.5 })
    ).toThrow();
    expect(() =>
      ProductCatalogRecordV1Schema.parse({ ...raw, usageRating: "great" })
    ).toThrow();
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
