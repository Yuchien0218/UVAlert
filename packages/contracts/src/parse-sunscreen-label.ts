import { z } from "zod";
import { ExpiryDateSchema, WaterResistanceStatusSchema } from "./product";

export const ParseSunscreenLabelRequestSchema = z.object({
  /** Base64 編碼的圖片資料（含 data:image/... 前綴或純 base64，最多 2 張） */
  images: z.array(z.string().min(1)).min(1).max(2),
  /** 客戶端當前本地日期時間（ISO 8601），輔助推算到期日 */
  clientLocalTime: z.string().datetime({ offset: true })
});

export type ParseSunscreenLabelRequest = z.infer<
  typeof ParseSunscreenLabelRequestSchema
>;

export const ParseSunscreenLabelResponseSchema = z.object({
  /** 產品名稱 / 品牌與系列（繁中、英或日文原名） */
  displayName: z.string().trim().min(1).max(80).nullable(),

  /** SPF 防曬係數（正整數，若為 50+ 則解析為 50） */
  spf: z.number().int().positive().nullable(),

  /** PA 等級（如 "PA++++", "PA+++", "PPD 16", "Broad Spectrum"） */
  paGrade: z.string().trim().min(1).max(20).nullable(),

  /** 耐水性狀態，嚴格對齊 ProductLabelSnapshotV1Schema */
  waterResistanceStatus: WaterResistanceStatusSchema,

  /** 建議補擦間隔（分鐘數，若包裝寫 2 小時則為 120） */
  reapplicationIntervalMinutes: z.number().int().positive().nullable(),

  /** 塗抹後等待時間（分鐘數，如 15 分鐘） */
  preExposureWaitMinutes: z.number().int().positive().nullable(),

  /** 有效到期日（格式 YYYY-MM-DD） */
  expiryDate: ExpiryDateSchema.nullable(),

  /** 是否有明確防曬宣稱 */
  sunscreenClaimConfirmed: z.boolean(),

  /** AI 辨識備註（如反光、文字模糊或建議確認事項，50 字內） */
  notes: z.string().trim().max(300).nullable()
});

export type ParseSunscreenLabelResponse = z.infer<
  typeof ParseSunscreenLabelResponseSchema
>;
