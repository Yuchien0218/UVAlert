import { z } from "zod";
import { NonEmptyIdSchema, UtcInstantSchema } from "./common";

/**
 * v2 加入日間溫度。
 *
 * 版本一改，既有快取就會在 `LocalWeatherForecastRepository.getLatestForecast`
 * 的 safeParse 落空而被跳過、自動重抓——天氣快照是快取不是使用者資料，
 * 不需要 migration。
 */
export const FIVE_DAY_UV_FORECAST_SCHEMA_VERSION = "five-day-uv-v2" as const;
export const REGION_PREFERENCE_SCHEMA_VERSION = "region-preference-v1" as const;

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

export const RegionPreferenceV1Schema = z.discriminatedUnion("mode", [
  z.object({
    schemaVersion: z.literal(REGION_PREFERENCE_SCHEMA_VERSION),
    mode: z.literal("selected"),
    selection: RegionSelectionSchema
  }),
  z.object({
    schemaVersion: z.literal(REGION_PREFERENCE_SCHEMA_VERSION),
    mode: z.literal("skipped"),
    skippedAt: UtcInstantSchema
  })
]);

export const DaytimeUvForecastSchema = z
  .object({
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
  })
  .superRefine((value, context) => {
    if (Date.parse(value.validFrom) >= Date.parse(value.validTo)) {
      context.addIssue({
        code: "custom",
        path: ["validTo"],
        message: "validTo 必須晚於 validFrom"
      });
    }
  });

export const FiveDayUvForecastSchema = z
  .object({
    schemaVersion: z.literal(FIVE_DAY_UV_FORECAST_SCHEMA_VERSION),
    region: RegionReferenceSchema,
    sourceKind: z.literal("forecast"),
    sourceDataset: z.literal("F-D0047-091"),
    sourceDisplayName: z.string().trim().min(1).max(120),
    issuedAt: UtcInstantSchema,
    fetchedAt: UtcInstantSchema,
    usableUntil: UtcInstantSchema,
    days: z.array(DaytimeUvForecastSchema).min(1).max(5)
  })
  .superRefine((value, context) => {
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
export type RegionPreferenceV1 = z.infer<typeof RegionPreferenceV1Schema>;
export type DaytimeUvForecast = z.infer<typeof DaytimeUvForecastSchema>;
export type FiveDayUvForecast = z.infer<typeof FiveDayUvForecastSchema>;

/**
 * 全臺各縣市「今日」的 UV，供 `/forecast` 的分布地圖使用。
 *
 * **與五日預報共用同一次上游抓取。** edge function 的 `fetchCwaDataset()`
 * 本來就抓整份 F-D0047-091（沒有地點參數），22 個縣市的值一直都在同一個
 * 回應裡；`scope=nationwide` 只是不把它們濾掉。所以這個端點**不增加 CWA
 * 的用量**。
 *
 * **「今日」的定義與五日卡完全一致**：同一天有多個 12 小時時段時取最大值，
 * 而且跳過已經結束的時段——下午打開時，今天的數字是「剩餘時段的最高」。
 * 這件事必須在畫面上講出來，不要在這裡另立第二套規則。
 */
export const NationwideUvCountySchema = z.object({
  /** 五碼縣市代碼，與 `region-index.generated.json` 的 `countyCode` 同一組。 */
  countyCode: z.string().regex(/^\d{5}$/u),
  displayName: z.string().trim().min(1).max(60),
  uvi: z.number().int().nonnegative().max(20),
  riskLevel: UvRiskLevelSchema
});

export const NationwideUvForecastSchema = z
  .object({
    schemaVersion: z.literal("nationwide-uv-v1"),
    sourceKind: z.literal("forecast"),
    sourceDataset: z.literal("F-D0047-091"),
    sourceDisplayName: z.string().trim().min(1).max(120),
    issuedAt: UtcInstantSchema,
    fetchedAt: UtcInstantSchema,
    usableUntil: UtcInstantSchema,
    localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
    counties: z.array(NationwideUvCountySchema).min(1).max(30)
  })
  .superRefine((value, context) => {
    const seen = new Set<string>();
    value.counties.forEach((county, index) => {
      if (seen.has(county.countyCode)) {
        context.addIssue({
          code: "custom",
          path: ["counties", index, "countyCode"],
          message: "同一個縣市不得重複"
        });
      }
      seen.add(county.countyCode);
    });
  });

export type NationwideUvCounty = z.infer<typeof NationwideUvCountySchema>;
export type NationwideUvForecast = z.infer<typeof NationwideUvForecastSchema>;
