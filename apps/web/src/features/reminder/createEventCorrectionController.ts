import {
  COMMAND_SCHEMA_VERSION,
  CorrectApplicationGroupCommandV1Schema,
  CorrectContextEventCommandV1Schema,
  type SessionProjection,
  type ZoneProjection
} from "@sunshield/contracts";
import type {
  CorrectionContext,
  DeviceIdentityPort,
  EventCorrectionRepositoryPort,
  LocalIdentityPort
} from "@sunshield/platform";
import { shallowReadonly, shallowRef, type ShallowRef } from "vue";
import type { AppBootController } from "../../app/createAppBootController";

/**
 * S-10 更正最近事件。
 *
 * 不直接改寫原事件：一律送出 `replace`／`void` 後繼事件，由 reducer 的
 * correction leaf 解析決定哪一版有效。可更正的欄位依規格限於
 * 事件時間與受影響部位——產品不在可更正範圍，replace 時原樣沿用。
 */
export type EventCorrectionPhase =
  "idle" | "loading" | "ready" | "submitting" | "success" | "error";

export type EventCorrectionError =
  | "validation"
  | "already_corrected"
  | "state_changed"
  | "invalid_water_interval"
  | "persistence"
  | "not_found"
  | null;

export interface EventCorrectionSuccess {
  action: "replace" | "void";
  label: string;
  zoneIds: string[];
  occurredAt: string;
}

export interface EventCorrectionController {
  phase: Readonly<ShallowRef<EventCorrectionPhase>>;
  context: Readonly<ShallowRef<CorrectionContext | null>>;
  session: Readonly<ShallowRef<SessionProjection | null>>;
  selectableZones: Readonly<ShallowRef<ZoneProjection[]>>;
  selectedZoneIds: Readonly<ShallowRef<string[]>>;
  /** 更正入水且已有配對離水時，部位不得變更。 */
  zoneSelectionLocked: Readonly<ShallowRef<boolean>>;
  occurredAt: Readonly<ShallowRef<string>>;
  referenceNow: Readonly<ShallowRef<string>>;
  fieldErrors: Readonly<ShallowRef<Record<string, string[]>>>;
  error: Readonly<ShallowRef<EventCorrectionError>>;
  success: Readonly<ShallowRef<EventCorrectionSuccess | null>>;
  load(eventId: string): Promise<void>;
  toggleZone(zoneId: string): void;
  setOccurredAt(value: string): void;
  setQuickTime(minutesAgo: number): void;
  submitReplace(): Promise<boolean>;
  submitVoid(): Promise<boolean>;
  resetError(): void;
  dispose(): void;
}

interface Dependencies {
  repository: EventCorrectionRepositoryPort;
  identity: LocalIdentityPort & DeviceIdentityPort;
  boot: AppBootController;
  createId(): string;
  now(): Date;
  getConnectivity(): "online" | "offline";
}

const CONTEXT_LABELS: Record<string, string> = {
  heavy_sweat: "大量流汗",
  towel: "擦毛巾",
  friction: "明顯摩擦",
  hand_wash: "洗手",
  water_start: "游泳／下水",
  water_end: "離水",
  context_changed: "情境變更"
};

export function createEventCorrectionController(
  dependencies: Dependencies
): EventCorrectionController {
  const phase = shallowRef<EventCorrectionPhase>("idle");
  const context = shallowRef<CorrectionContext | null>(null);
  const session = shallowRef<SessionProjection | null>(null);
  const selectableZones = shallowRef<ZoneProjection[]>([]);
  const selectedZoneIds = shallowRef<string[]>([]);
  const zoneSelectionLocked = shallowRef(false);
  const occurredAt = shallowRef("");
  const referenceNow = shallowRef("");
  const fieldErrors = shallowRef<Record<string, string[]>>({});
  const error = shallowRef<EventCorrectionError>(null);
  const success = shallowRef<EventCorrectionSuccess | null>(null);
  let targetId = "";
  let disposed = false;

  function currentLabel(): string {
    const value = context.value;
    if (value === null) return "這筆紀錄";
    return value.kind === "context_event"
      ? (CONTEXT_LABELS[value.event.contextType] ?? "記錄狀況")
      : "記錄補擦";
  }

  async function load(eventId: string): Promise<void> {
    if (disposed) return;
    targetId = eventId;
    phase.value = "loading";
    error.value = null;
    const now = dependencies.now();

    let loaded: CorrectionContext | null;
    try {
      const visitorId = await dependencies.identity.getOrCreateLocalVisitorId();
      loaded = await dependencies.repository.getCorrectionContext(
        visitorId,
        eventId
      );
    } catch {
      error.value = "persistence";
      phase.value = "error";
      return;
    }

    if (loaded === null) {
      error.value = "not_found";
      phase.value = "error";
      return;
    }

    context.value = loaded;
    session.value = loaded.session;
    selectableZones.value = loaded.session.zones.filter(
      (zone) => zone.trackingStatus === "active"
    );
    referenceNow.value = now.toISOString();

    if (loaded.kind === "context_event") {
      selectedZoneIds.value = [...loaded.event.zoneInstanceIds];
      occurredAt.value = loaded.event.effectiveOccurredAt;
      // 更正入水的部位集合會讓配對的離水變孤兒，直接鎖住不讓改。
      zoneSelectionLocked.value =
        loaded.event.contextType === "water_start" && loaded.hasPairedWaterEnd;
    } else {
      selectedZoneIds.value = [...loaded.group.confirmedZoneInstanceIds];
      occurredAt.value = loaded.group.appliedAt;
      zoneSelectionLocked.value = false;
    }

    if (!loaded.isLeaf) {
      // 目標已被更正：顯示最新狀態，不允許建立第二個 successor。
      error.value = "already_corrected";
    }
    phase.value = "ready";
  }

  function toggleZone(zoneId: string): void {
    if (zoneSelectionLocked.value) return;
    selectedZoneIds.value = selectedZoneIds.value.includes(zoneId)
      ? selectedZoneIds.value.filter((id) => id !== zoneId)
      : [...selectedZoneIds.value, zoneId];
  }

  function setOccurredAt(value: string): void {
    occurredAt.value = value;
  }

  function setQuickTime(minutesAgo: number): void {
    const now = dependencies.now();
    referenceNow.value = now.toISOString();
    occurredAt.value = new Date(
      now.getTime() - minutesAgo * 60_000
    ).toISOString();
  }

  function guard(action: "replace" | "void"): boolean {
    const value = context.value;
    if (
      value === null ||
      phase.value === "submitting" ||
      success.value !== null
    ) {
      return false;
    }
    if (!value.isLeaf) {
      error.value = "already_corrected";
      return false;
    }
    const errors: Record<string, string[]> = {};
    if (action === "replace") {
      if (selectedZoneIds.value.length === 0) {
        errors.zones = ["請至少保留一個受影響的部位。"];
      }
      const occurredAtMs = Date.parse(occurredAt.value);
      if (
        !Number.isFinite(occurredAtMs) ||
        occurredAtMs > dependencies.now().getTime()
      ) {
        errors.occurredAt = ["更正後的時間不能晚於目前時間。"];
      }
    }
    if (Object.keys(errors).length > 0) {
      fieldErrors.value = errors;
      error.value = "validation";
      return false;
    }
    fieldErrors.value = {};
    return true;
  }

  function mapFailure(code: string): void {
    if (code === "PERSISTENCE_ERROR") error.value = "persistence";
    else if (code === "CORRECTION_CONFLICT") error.value = "already_corrected";
    else if (code === "NOT_FOUND") error.value = "not_found";
    else if (
      code === "REVISION_CONFLICT" ||
      code === "CLIENT_SEQUENCE_CONFLICT"
    ) {
      error.value = "state_changed";
    } else {
      // 領域層把非法水上區間也映射成 VALIDATION_ERROR，
      // 對水上事件給出更具體的說法而不是「請確認後再試」。
      const value = context.value;
      error.value =
        value?.kind === "context_event" &&
        (value.event.contextType === "water_start" ||
          value.event.contextType === "water_end")
          ? "invalid_water_interval"
          : "validation";
    }
  }

  async function run(action: "replace" | "void"): Promise<boolean> {
    if (!guard(action)) return false;
    const value = context.value!;
    phase.value = "submitting";

    const [visitorId, deviceId] = await Promise.all([
      dependencies.identity.getOrCreateLocalVisitorId(),
      dependencies.identity.getOrCreateDeviceLocalId()
    ]);
    const envelope = {
      commandVersion: COMMAND_SCHEMA_VERSION,
      commandId: dependencies.createId(),
      idempotencyKey: dependencies.createId(),
      owner: { type: "guest", localVisitorId: visitorId },
      deviceLocalId: deviceId,
      sessionId: value.session.sessionId,
      clientSequence: value.session.revision + 1,
      clientCreatedAt: dependencies.now().toISOString(),
      expectedRevision: value.session.revision
    };
    const effectiveOccurredAt =
      action === "void"
        ? value.kind === "context_event"
          ? value.event.effectiveOccurredAt
          : value.group.appliedAt
        : new Date(occurredAt.value).toISOString();

    let result;
    try {
      if (value.kind === "context_event") {
        const base = value.event;
        // 部位以外的欄位原樣沿用；水上事件的 activityIntervalId 尤其
        // 不可變動，改了配對就斷了。
        const detail =
          base.contextType === "water_start"
            ? {
                contextType: "water_start",
                activityIntervalId: base.activityIntervalId,
                zoneInstanceIds:
                  action === "void"
                    ? base.zoneInstanceIds
                    : selectedZoneIds.value,
                startConfidence: base.startConfidence,
                activityStartedAt: base.activityStartedAt
              }
            : base.contextType === "water_end"
              ? {
                  contextType: "water_end",
                  activityIntervalId: base.activityIntervalId,
                  zoneInstanceIds:
                    action === "void"
                      ? base.zoneInstanceIds
                      : selectedZoneIds.value,
                  endedAt:
                    action === "void" ? base.endedAt : effectiveOccurredAt
                }
              : {
                  contextType: base.contextType,
                  zoneInstanceIds:
                    action === "void"
                      ? base.zoneInstanceIds
                      : selectedZoneIds.value
                };

        result = await dependencies.repository.correctContextEvent(
          CorrectContextEventCommandV1Schema.parse({
            ...envelope,
            commandType: "correct_context_event",
            payload: {
              correctionEventId: dependencies.createId(),
              targetEventId: targetId,
              action,
              effectiveOccurredAt,
              detail
            }
          }),
          {
            status: "trusted",
            trustedNow: dependencies.now().toISOString(),
            connectivity: dependencies.getConnectivity()
          }
        );
      } else {
        const keep = new Set(selectedZoneIds.value);
        // 產品不在可更正範圍：沿用原本每個部位的 snapshot，
        // 只把取消勾選的部位拿掉，空掉的紀錄整筆移除。
        const applications =
          action === "void"
            ? []
            : value.applications
                .map((application) => ({
                  eventId: dependencies.createId(),
                  zoneInstanceIds: application.zoneInstanceIds.filter((id) =>
                    keep.has(id)
                  ),
                  sourceProductId: application.sourceProductId,
                  productSnapshotFingerprint:
                    application.productSnapshotFingerprint,
                  productLabelSnapshot: application.productLabelSnapshot
                }))
                .filter(
                  (application) => application.zoneInstanceIds.length > 0
                );

        result = await dependencies.repository.correctApplicationGroup(
          CorrectApplicationGroupCommandV1Schema.parse({
            ...envelope,
            commandType: "correct_application_group",
            payload: {
              correctionGroupId: dependencies.createId(),
              targetGroupId: targetId,
              action,
              appliedAt: effectiveOccurredAt,
              applications
            }
          }),
          {
            status: "trusted",
            trustedNow: dependencies.now().toISOString(),
            connectivity: dependencies.getConnectivity()
          }
        );
      }
    } catch {
      error.value = "persistence";
      phase.value = "error";
      return false;
    }

    if (!result.ok) {
      mapFailure(result.code);
      phase.value = "error";
      return false;
    }

    success.value = {
      action,
      label: currentLabel(),
      zoneIds: [...selectedZoneIds.value],
      occurredAt: effectiveOccurredAt
    };
    try {
      await dependencies.boot.refresh();
    } catch {
      /* 已提交的結果為準 */
    }
    phase.value = "success";
    return true;
  }

  return {
    phase: shallowReadonly(phase),
    context: shallowReadonly(context),
    session: shallowReadonly(session),
    selectableZones: shallowReadonly(selectableZones),
    selectedZoneIds: shallowReadonly(selectedZoneIds),
    zoneSelectionLocked: shallowReadonly(zoneSelectionLocked),
    occurredAt: shallowReadonly(occurredAt),
    referenceNow: shallowReadonly(referenceNow),
    fieldErrors: shallowReadonly(fieldErrors),
    error: shallowReadonly(error),
    success: shallowReadonly(success),
    load,
    toggleZone,
    setOccurredAt,
    setQuickTime,
    submitReplace: () => run("replace"),
    submitVoid: () => run("void"),
    resetError(): void {
      if (error.value !== "already_corrected") error.value = null;
      if (phase.value === "error") phase.value = "ready";
    },
    dispose(): void {
      disposed = true;
    }
  };
}
