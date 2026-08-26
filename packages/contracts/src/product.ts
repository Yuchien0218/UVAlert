import { z } from "zod";
import { PRODUCT_LABEL_SNAPSHOT_VERSION } from "./versions";

export const ReapplicationIntervalStatusSchema = z.enum([
  "explicit_minutes",
  "no_numeric_interval",
  "unknown"
]);

export const PreExposureWaitStatusSchema = z.enum([
  "explicit_minutes",
  "no_instruction",
  "unknown"
]);

export const WaterResistanceStatusSchema = z.enum([
  "40",
  "80",
  "not_water_resistant",
  "no_claim",
  "unknown"
]);

export const ProductEligibilitySchema = z.enum([
  "eligible",
  "expired",
  "abnormal_reported",
  "discomfort_reported",
  "no_sunscreen_claim",
  "identity_unconfirmed"
]);

export const ProductIdentityStatusSchema = z.enum([
  "confirmed",
  "identity_unconfirmed"
]);
export const ProductExpiryStatusSchema = z.enum([
  "not_expired",
  "expired",
  "unknown"
]);
export const ProductConditionStatusSchema = z.enum([
  "no_issue_reported",
  "abnormal_reported",
  "discomfort_reported"
]);
export const SunscreenClaimStatusSchema = z.enum([
  "confirmed",
  "no_claim",
  "unknown"
]);

/**
 * 資格狀態的唯一推導來源。
 *
 * schema 的 superRefine、snapshot 建構與到期狀態同步都必須走這裡，
 * 否則四份各自維護的 ternary 遲早會漂移——改一處到期規則就會讓
 * snapshot 過不了自己的 superRefine。
 */
export function deriveRuleEligibility(fields: {
  identityStatus: z.infer<typeof ProductIdentityStatusSchema>;
  expiryStatus: z.infer<typeof ProductExpiryStatusSchema>;
  conditionStatus: z.infer<typeof ProductConditionStatusSchema>;
  sunscreenClaimStatus: z.infer<typeof SunscreenClaimStatusSchema>;
}): z.infer<typeof ProductEligibilitySchema> {
  if (fields.identityStatus === "identity_unconfirmed") {
    return "identity_unconfirmed";
  }
  if (fields.expiryStatus === "expired") return "expired";
  if (fields.conditionStatus === "abnormal_reported") {
    return "abnormal_reported";
  }
  if (fields.conditionStatus === "discomfort_reported") {
    return "discomfort_reported";
  }
  if (fields.sunscreenClaimStatus !== "confirmed") {
    return "no_sunscreen_claim";
  }
  return "eligible";
}

export const ProductLabelSnapshotV1Schema = z
  .object({
    snapshotVersion: z.literal(PRODUCT_LABEL_SNAPSHOT_VERSION),
    identityStatus: ProductIdentityStatusSchema,
    expiryStatus: ProductExpiryStatusSchema,
    conditionStatus: ProductConditionStatusSchema,
    sunscreenClaimStatus: SunscreenClaimStatusSchema,
    ruleEligibilityAtApplication: ProductEligibilitySchema,
    reapplicationIntervalStatus: ReapplicationIntervalStatusSchema,
    reapplicationIntervalMinutes: z.number().int().positive().nullable(),
    preExposureWaitStatus: PreExposureWaitStatusSchema,
    preExposureWaitMinutes: z.number().int().positive().nullable(),
    waterResistanceStatus: WaterResistanceStatusSchema,
    waterResistanceMinutes: z.union([z.literal(40), z.literal(80)]).nullable(),
    spf: z.number().positive().nullable().default(null),
    paGrade: z.string().trim().min(1).max(20).nullable().default(null),
    capturedAt: z.string().datetime({ offset: true })
  })
  .superRefine((snapshot, context) => {
    const intervalIsExplicit =
      snapshot.reapplicationIntervalStatus === "explicit_minutes";
    if (
      intervalIsExplicit !==
      (snapshot.reapplicationIntervalMinutes !== null)
    ) {
      context.addIssue({
        code: "custom",
        path: ["reapplicationIntervalMinutes"],
        message: "只有 explicit_minutes 可以提供一般補擦分鐘數"
      });
    }

    const waitIsExplicit =
      snapshot.preExposureWaitStatus === "explicit_minutes";
    if (waitIsExplicit !== (snapshot.preExposureWaitMinutes !== null)) {
      context.addIssue({
        code: "custom",
        path: ["preExposureWaitMinutes"],
        message: "只有 explicit_minutes 可以提供曝曬前等待分鐘數"
      });
    }

    const expectedWaterMinutes =
      snapshot.waterResistanceStatus === "40"
        ? 40
        : snapshot.waterResistanceStatus === "80"
          ? 80
          : null;
    if (snapshot.waterResistanceMinutes !== expectedWaterMinutes) {
      context.addIssue({
        code: "custom",
        path: ["waterResistanceMinutes"],
        message: "耐水分鐘數必須與 40／80 標示一致；其他狀態必須為 null"
      });
    }

    const expectedEligibility = deriveRuleEligibility(snapshot);
    if (snapshot.ruleEligibilityAtApplication !== expectedEligibility) {
      context.addIssue({
        code: "custom",
        path: ["ruleEligibilityAtApplication"],
        message: `資格狀態與 snapshot 欄位不一致，預期為 ${expectedEligibility}`
      });
    }
  });

export type ProductLabelSnapshotV1 = z.infer<
  typeof ProductLabelSnapshotV1Schema
>;

/**
 * 裝備品類（2026-08-06 裁決：本頁由「提醒用產品主檔」擴為「防曬裝備清單」）。
 *
 * 只有 `sunscreen` 會產生補擦倒數。`clothing` 是 methodComponent，
 * 覆蓋期間不倒數；`eyewear` 與 `other_gear` 純紀錄，完全不進 reducer。
 * UI 必須明示這件事——使用者記錄一副墨鏡時不得以為提醒行為會改變。
 */
export const GearCategorySchema = z.enum([
  "sunscreen",
  "clothing",
  "eyewear",
  "other_gear"
]);

export type GearCategory = z.infer<typeof GearCategorySchema>;

/** 只有這兩個品類需要產品身分確認與包裝標示欄位（S-12）。 */
export const GEAR_CATEGORIES_WITH_LABEL: readonly GearCategory[] = [
  "sunscreen",
  "clothing"
];

/** `YYYY-MM`。 */
export const PurchaseMonthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "購買月份格式須為 YYYY-MM");

/** `YYYY-MM-DD`。 */
export const ExpiryDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "到期日格式須為 YYYY-MM-DD");

export const PRODUCT_CATALOG_RECORD_VERSION = "1.1.0" as const;

export const ProductCatalogRecordV1Schema = z.object({
  schemaVersion: z.literal(PRODUCT_CATALOG_RECORD_VERSION),
  productId: z.string().trim().min(1),
  displayName: z.string().trim().min(1).max(80),
  gearCategory: GearCategorySchema,
  currentSnapshot: ProductLabelSnapshotV1Schema,
  snapshotFingerprint: z.string().trim().min(1),
  /** 購買月份，不進 reducer。 */
  purchaseMonth: PurchaseMonthSchema.nullable().default(null),
  /**
   * 真實到期日，取代／補充 snapshot 的 `expiryStatus`。
   *
   * 這是四個新欄位裡唯一進 reducer 的：到期日已過的產品必須推導出
   * `expiryStatus: "expired"`，維持既有「過期產品不建立期限」的行為。
   */
  expiryDate: ExpiryDateSchema.nullable().default(null),
  /** 備忘，不進 reducer。 */
  note: z.string().trim().max(500).nullable().default(null),
  /** 「過去用過」的時間戳，不進 reducer。 */
  archivedAt: z.string().datetime({ offset: true }).nullable().default(null),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  status: z.enum(["active", "stopped"])
});

/**
 * 由到期日推導 snapshot 的 `expiryStatus`。
 *
 * 沒填到期日時維持 `unknown`，不擅自宣稱未過期。
 */
export function deriveExpiryStatus(
  expiryDate: string | null,
  now: string
): z.infer<typeof ProductExpiryStatusSchema> {
  if (expiryDate === null) return "unknown";
  const expiryMs = Date.parse(`${expiryDate}T23:59:59.999Z`);
  if (!Number.isFinite(expiryMs)) return "unknown";
  return expiryMs < Date.parse(now) ? "expired" : "not_expired";
}

export type ProductCatalogRecordV1 = z.infer<
  typeof ProductCatalogRecordV1Schema
>;

export function fingerprintProductLabelSnapshot(
  snapshot: ProductLabelSnapshotV1
): string {
  const parsed = ProductLabelSnapshotV1Schema.parse(snapshot);
  const source = JSON.stringify(parsed);
  let hash = 0x811c9dc5;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `snapshot-v1-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
export type ProductEligibility = z.infer<typeof ProductEligibilitySchema>;
