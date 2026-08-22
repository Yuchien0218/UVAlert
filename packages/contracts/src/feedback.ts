import { z } from "zod";
import { NonEmptyIdSchema, UtcInstantSchema } from "./common";

export const FeedbackTypeSchema = z.enum([
  "bug",
  "feature_request",
  "content_correction"
]);

export type FeedbackType = z.infer<typeof FeedbackTypeSchema>;

export const FEEDBACK_SCHEMA_VERSION = "feedback-v1" as const;

export const FeedbackRequestV1Schema = z.object({
  schemaVersion: z.literal(FEEDBACK_SCHEMA_VERSION),
  feedbackType: FeedbackTypeSchema,
  message: z.string().trim().min(1).max(4000),
  contactEmail: z.string().trim().email().max(320).nullable().default(null),
  appVersion: z.string().trim().min(1).max(64),
  route: z.string().trim().min(1).max(256),
  userAgentSummary: z.string().trim().max(256).nullable().default(null)
});

export type FeedbackRequestV1 = z.infer<typeof FeedbackRequestV1Schema>;

export const FeedbackReceiptV1Schema = z.object({
  schemaVersion: z.literal(FEEDBACK_SCHEMA_VERSION),
  receiptId: NonEmptyIdSchema,
  createdAt: UtcInstantSchema
});

export type FeedbackReceiptV1 = z.infer<typeof FeedbackReceiptV1Schema>;
