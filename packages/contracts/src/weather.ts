import { z } from "zod";
import {
  NonEmptyIdSchema,
  UtcInstantSchema
} from "./common";

/**
 * v2 加入日間溫度。
 *
 * 版本一改，既有快取就會在 `LocalWeatherForecastRepository.getLatestForecast`
 * 的 safeParse 落空而被跳過、自動重抓——天氣快照是快取不是使用者資料，
 * 不需要 migration。
 */
export const FIVE_DAY_UV_FORECAST_SCHEMA_VERSION =
  "five-day-uv-v2" as const;
export const REGION_PREFERENCE_SCHEMA_VERSION =
  "region-preference-v1" as const;

export const UvRiskLevelSchema = z.enum([
  "low",
  "moderate",
  "high",
  "very_high",
  "extreme"
]);

export const RegionReferenceSchema = z.object({
  regionCode: NonEmptyIdSchema,
  displayName: z.string().trim().min(1).max(100)
});

export const RegionSelectionSchema = RegionReferenceSchema.extend({
  countyCode: NonEmptyIdSchema,
  countyName: z.string().trim().min(1).max(50),
  townName: z.string().trim().min(1).max(50),
  boundaryDataVersion: NonEmptyIdSchema,
  selectionMethod: z.enum(["device_location", "manual"])
});

export const RegionPreferenceV1Schema = z.discriminatedUnion(
  "mode",
  [
    z.object({
      schemaVersion: z.literal(
        REGION_PREFERENCE_SCHEMA_VERSION
      ),
      mode: z.literal("selected"),
      selection: RegionSelectionSchema
    }),
    z.object({
      schemaVersion: z.literal(
        REGION_PREFERENCE_SCHEMA_VERSION
      ),
      mode: z.literal("skipped"),
      skippedAt: UtcInstantSchema
    })
  ]
);

export const DaytimeUvForecastSchema = z.object({
  localDate: z.iso.date(),
  validFrom: UtcInstantSchema,
  validTo: UtcInstantSchema,
  uvi: z.number().int().nonnegative(),
  riskLevel: UvRiskLevelSchema,
  /**
   * 日間溫度（攝氏），與 UV 同樣來自 CWA F-D0047-091。
   *
   * 純資訊，**不進 reducer**：溫度不影響補擦倒數。資料可能缺，
   * 缺的時候是 null，UI 必須整欄不顯示而不是顯示 0 或「--」。
   */
  temperatureCelsius: z.number().nullable().default(null)
}).superRefine((value, context) => {
  if (Date.parse(value.validFrom) >= Date.parse(value.validTo)) {
    context.addIssue({
      code: "custom",
      path: ["validTo"],
      message: "validTo 必須晚於 validFrom"
    });
  }
});

export const FiveDayUvForecastSchema = z.object({
  schemaVersion: z.literal(FIVE_DAY_UV_FORECAST_SCHEMA_VERSION),
  region: RegionReferenceSchema,
  sourceKind: z.literal("forecast"),
  sourceDataset: z.literal("F-D0047-091"),
  sourceDisplayName: z.string().trim().min(1).max(120),
  issuedAt: UtcInstantSchema,
  fetchedAt: UtcInstantSchema,
  usableUntil: UtcInstantSchema,
  days: z.array(DaytimeUvForecastSchema).min(1).max(5)
}).superRefine((value, context) => {
  const seenDates = new Set<string>();
  let previousValidFrom = Number.NEGATIVE_INFINITY;

  value.days.forEach((day, index) => {
    if (seenDates.has(day.localDate)) {
      context.addIssue({
        code: "custom",
        path: ["days", index, "localDate"],
        message: "五日預報不得包含重複日期"
      });
    }
    seenDates.add(day.localDate);

    const validFrom = Date.parse(day.validFrom);
    if (validFrom < previousValidFrom) {
      context.addIssue({
        code: "custom",
        path: ["days", index, "validFrom"],
        message: "五日預報必須依有效時間排序"
      });
    }
    previousValidFrom = validFrom;
  });

  if (Date.parse(value.fetchedAt) >= Date.parse(value.usableUntil)) {
    context.addIssue({
      code: "custom",
      path: ["usableUntil"],
      message: "usableUntil 必須晚於 fetchedAt"
    });
  }
});

export type UvRiskLevel = z.infer<typeof UvRiskLevelSchema>;
export type RegionReference = z.infer<typeof RegionReferenceSchema>;
export type RegionSelection = z.infer<typeof RegionSelectionSchema>;
export type RegionPreferenceV1 = z.infer<
  typeof RegionPreferenceV1Schema
>;
export type DaytimeUvForecast = z.infer<
  typeof DaytimeUvForecastSchema
>;
export type FiveDayUvForecast = z.infer<
  typeof FiveDayUvForecastSchema
>;
