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

    const expectedEligibility =
      snapshot.identityStatus === "identity_unconfirmed"
        ? "identity_unconfirmed"
        : snapshot.expiryStatus === "expired"
          ? "expired"
          : snapshot.conditionStatus === "abnormal_reported"
            ? "abnormal_reported"
            : snapshot.conditionStatus === "discomfort_reported"
              ? "discomfort_reported"
              : snapshot.sunscreenClaimStatus !== "confirmed"
                ? "no_sunscreen_claim"
                : "eligible";
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

export const ProductCatalogRecordV1Schema = z.object({
  schemaVersion: z.literal("1.0.0"),
  productId: z.string().trim().min(1),
  displayName: z.string().trim().min(1).max(80),
  currentSnapshot: ProductLabelSnapshotV1Schema,
  snapshotFingerprint: z.string().trim().min(1),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  status: z.enum(["active", "stopped"])
});

export type ProductCatalogRecordV1 = z.infer<
  typeof ProductCatalogRecordV1Schema
>;

export function fingerprintProductLabelSnapshot(snapshot: ProductLabelSnapshotV1): string {
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

