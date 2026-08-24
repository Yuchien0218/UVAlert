import {
  PRODUCT_LABEL_SNAPSHOT_VERSION,
  ProductLabelSnapshotV1Schema,
  type ProductLabelSnapshotV1
} from "@sunshield/contracts";

export type ProductClaimAnswer = "yes" | "no" | "unknown";
export type NumericLabelAnswer = "none" | "explicit" | "unknown";

export interface ProductSnapshotFormValue {
  claimAnswer: ProductClaimAnswer;
  waitAnswer: NumericLabelAnswer;
  waitMinutes: number | null;
  intervalAnswer: NumericLabelAnswer;
  intervalMinutes: number | null;
  waterResistance:
    | "40"
    | "80"
    | "not_water_resistant"
    | "no_claim"
    | "unknown";
  /**
   * SPF 與 PA 只用來辨識「這罐是哪一罐」，**不進入倒數計算**——
   * `packages/domain` 對這兩個欄位零引用。倒數長度由
   * `intervalAnswer` 決定，不要因為填了 SPF 就以為間隔會變。
   *
   * 選填，省略時視為 null；既有呼叫點（`createSetupController`）
   * 不記錄這兩個欄位，因此不強制傳入。
   */
  spf?: number | null;
  paGrade?: string | null;
}

export function makeSessionOnlyProductSnapshot(
  value: ProductSnapshotFormValue,
  capturedAt: string
): ProductLabelSnapshotV1 {
  const identityStatus =
    value.claimAnswer === "unknown"
      ? "identity_unconfirmed"
      : "confirmed";
  const sunscreenClaimStatus =
    value.claimAnswer === "yes"
      ? "confirmed"
      : value.claimAnswer === "no"
        ? "no_claim"
        : "unknown";
  const ruleEligibilityAtApplication =
    identityStatus === "identity_unconfirmed"
      ? "identity_unconfirmed"
      : sunscreenClaimStatus === "confirmed"
        ? "eligible"
        : "no_sunscreen_claim";

  return ProductLabelSnapshotV1Schema.parse({
    snapshotVersion: PRODUCT_LABEL_SNAPSHOT_VERSION,
    identityStatus,
    expiryStatus: "unknown",
    conditionStatus: "no_issue_reported",
    sunscreenClaimStatus,
    ruleEligibilityAtApplication,
    reapplicationIntervalStatus:
      value.intervalAnswer === "explicit"
        ? "explicit_minutes"
        : value.intervalAnswer === "unknown"
          ? "unknown"
          : "no_numeric_interval",
    reapplicationIntervalMinutes:
      value.intervalAnswer === "explicit"
        ? value.intervalMinutes
        : null,
    preExposureWaitStatus:
      value.waitAnswer === "explicit"
        ? "explicit_minutes"
        : value.waitAnswer === "unknown"
          ? "unknown"
          : "no_instruction",
    preExposureWaitMinutes:
      value.waitAnswer === "explicit" ? value.waitMinutes : null,
    waterResistanceStatus: value.waterResistance,
    waterResistanceMinutes:
      value.waterResistance === "40"
        ? 40
        : value.waterResistance === "80"
          ? 80
          : null,
    spf: value.spf ?? null,
    paGrade: value.paGrade ?? null,
    capturedAt
  });
}

export function productSnapshotToFormValue(
  snapshot: ProductLabelSnapshotV1
): ProductSnapshotFormValue {
  return {
    claimAnswer:
      snapshot.identityStatus === "identity_unconfirmed" ||
      snapshot.sunscreenClaimStatus === "unknown"
        ? "unknown"
        : snapshot.sunscreenClaimStatus === "confirmed"
          ? "yes"
          : "no",
    waitAnswer:
      snapshot.preExposureWaitStatus === "explicit_minutes"
        ? "explicit"
        : snapshot.preExposureWaitStatus === "unknown"
          ? "unknown"
          : "none",
    waitMinutes: snapshot.preExposureWaitMinutes,
    intervalAnswer:
      snapshot.reapplicationIntervalStatus === "explicit_minutes"
        ? "explicit"
        : snapshot.reapplicationIntervalStatus === "unknown"
          ? "unknown"
          : "none",
    intervalMinutes: snapshot.reapplicationIntervalMinutes,
    waterResistance: snapshot.waterResistanceStatus,
    spf: snapshot.spf,
    paGrade: snapshot.paGrade
  };
}
