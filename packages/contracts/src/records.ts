import { z } from "zod";
import {
  NonEmptyIdSchema,
  PresetDecisionSchema,
  SessionEndedReasonSchema,
  SetupEntryModeSchema,
  UtcInstantSchema
} from "./common";
import { PrimaryActionSchema } from "./projections";

export const ProtectionSessionRecordSchema = z.object({
  id: NonEmptyIdSchema,
  ownerKey: NonEmptyIdSchema,
  rulesetVersion: z.string().min(1),
  setupEntryMode: SetupEntryModeSchema,
  presetDecision: PresetDecisionSchema,
  suggestedPresetVersion: NonEmptyIdSchema.nullable(),
  startedAt: UtcInstantSchema,
  endedAt: UtcInstantSchema.nullable(),
  endedReason: SessionEndedReasonSchema.nullable().default(null),
  overallStatus: z.enum(["tracking", "attention_required", "ended"]),
  sessionNextDueAt: UtcInstantSchema.nullable(),
  primaryAction: PrimaryActionSchema,
  derivedFromEventRefs: z.array(NonEmptyIdSchema),
  revision: z.number().int().positive(),
  updatedAt: UtcInstantSchema
});

export type ProtectionSessionRecord = z.infer<
  typeof ProtectionSessionRecordSchema
>;

export type ActiveSessionLockRecord = {
  ownerKey: string;
  sessionId: string;
  createdAt: string;
};

export type ClientSequenceRecord = {
  deviceLocalId: string;
  sessionId: string;
  lastSequence: number;
};

export type CommandReceiptRecord = {
  idempotencyKey: string;
  commandId: string;
  sessionId: string | null;
  result: CommandResult<unknown>;
  createdAt: string;
};

export type ZoneIdentityLockRecord = {
  sessionId: string;
  bodyZoneCode: string;
  zoneInstanceId: string;
};

export type CommandResult<T> =
  | {
      ok: true;
      data: T;
      sessionId?: string;
      revision?: number;
      committedEventIds: string[];
    }
  | {
      ok: false;
      code:
        | "VALIDATION_ERROR"
        | "ACTIVE_SESSION_CONFLICT"
        | "REVISION_CONFLICT"
        | "CLIENT_SEQUENCE_CONFLICT"
        | "CORRECTION_CONFLICT"
        | "PRODUCT_CONFLICT"
        | "NOT_FOUND"
        | "PERSISTENCE_ERROR";
      fieldErrors?: Record<string, string[]>;
      currentRevision?: number;
      retryable: boolean;
    };
