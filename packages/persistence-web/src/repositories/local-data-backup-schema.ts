import { z } from "zod";

export const LOCAL_DATA_EXPORT_FORMAT_VERSION = "1.0.0" as const;

const ExportedEventRecordSchema = z
  .object({
    id: z.string().min(1),
    sessionId: z.string().min(1)
  })
  .passthrough();

const ExportedProductRecordSchema = z
  .object({
    productId: z.string().min(1),
    displayName: z.string().min(1)
  })
  .passthrough();

const ExportedSessionRecordSchema = z
  .object({
    id: z.string().min(1),
    overallStatus: z.string().min(1),
    startedAt: z.string().min(1),
    endedAt: z.string().nullable().optional()
  })
  .passthrough();

const ExportedZoneStateRecordSchema = z
  .object({
    sessionId: z.string().min(1),
    zoneInstanceId: z.string().min(1)
  })
  .passthrough();

export const LocalDataBackupPayloadSchema = z.object({
  formatVersion: z.literal(LOCAL_DATA_EXPORT_FORMAT_VERSION),
  application: z.literal("防曬晴報員"),
  exportedAt: z.string().min(1),
  products: z.array(ExportedProductRecordSchema),
  sessions: z.array(ExportedSessionRecordSchema),
  zoneStates: z.array(ExportedZoneStateRecordSchema),
  events: z.object({
    sessionStarted: z.array(ExportedEventRecordSchema),
    zoneTracking: z.array(ExportedEventRecordSchema),
    zoneMethod: z.array(ExportedEventRecordSchema),
    applicationConfirmationGroups: z.array(ExportedEventRecordSchema),
    applications: z.array(ExportedEventRecordSchema),
    productSafety: z.array(ExportedEventRecordSchema),
    context: z.array(ExportedEventRecordSchema),
    sessionEnded: z.array(ExportedEventRecordSchema)
  }),
  preferences: z.object({
    reminderPresentation: z.array(
      z.object({
        soundEnabled: z.boolean(),
        vibrationEnabled: z.boolean()
      })
    ),
    metadata: z.array(
      z.object({
        key: z.string().min(1),
        value: z.string()
      })
    )
  })
});

export type LocalDataBackupPayload = z.infer<
  typeof LocalDataBackupPayloadSchema
>;
