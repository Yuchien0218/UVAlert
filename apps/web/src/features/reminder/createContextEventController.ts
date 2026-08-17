import {
  COMMAND_SCHEMA_VERSION,
  ReportContextEventCommandV1Schema,
  type ReportContextEventCommandV1,
  type SessionProjection,
  type ZoneProjection
} from "@sunshield/contracts";
import type {
  ContextEventRepositoryPort,
  DeviceIdentityPort,
  LocalIdentityPort,
  OpenWaterInterval
} from "@sunshield/platform";
import { shallowReadonly, shallowRef, type ShallowRef } from "vue";
import type { AppBootController } from "../../app/createAppBootController";

/**
 * S-09 回報狀況。
 *
 * 只涵蓋 `ReportContextEventCommandV1` 的六種事件：四種一般原因與入水／離水。
 * 規格第一層另有「進入室內／返回戶外」（`context_changed`）、「更新衣物狀態」
 * 與「使用產品後感到不適」，那三者走各自的命令路徑，不在本控制器範圍。
 */
export type ContextEventKind =
  | "heavy_sweat"
  | "towel"
  | "friction"
  | "hand_wash"
  | "water_start"
  | "water_end";

export type ContextEventPhase =
  | "idle"
  | "loading"
  | "ready"
  | "submitting"
  | "success"
  | "error";

export type ContextEventError =
  | "validation"
  | "state_changed"
  | "persistence"
  | "refresh_failed"
  | "not_found"
  | null;

export interface ContextEventChoice {
  kind: ContextEventKind;
  label: string;
  description: string;
}

export interface ContextEventSuccess {
  kind: ContextEventKind;
  label: string;
  zoneIds: string[];
  occurredAt: string;
  committedRevision: number;
}

export interface ContextEventController {
  phase: Readonly<ShallowRef<ContextEventPhase>>;
  session: Readonly<ShallowRef<SessionProjection | null>>;
  availableChoices: Readonly<ShallowRef<ContextEventChoice[]>>;
  selectedKind: Readonly<ShallowRef<ContextEventKind | null>>;
  selectableZones: Readonly<ShallowRef<ZoneProjection[]>>;
  selectedZoneIds: Readonly<ShallowRef<string[]>>;
  /** 離水時部位由起點決定，不得自行增減。 */
  zoneSelectionLocked: Readonly<ShallowRef<boolean>>;
  openWaterInterval: Readonly<ShallowRef<OpenWaterInterval | null>>;
  waterStartConfidence: Readonly<ShallowRef<"confirmed" | "unknown">>;
  occurredAt: Readonly<ShallowRef<string>>;
  referenceNow: Readonly<ShallowRef<string>>;
  fieldErrors: Readonly<ShallowRef<Record<string, string[]>>>;
  error: Readonly<ShallowRef<ContextEventError>>;
  success: Readonly<ShallowRef<ContextEventSuccess | null>>;
  load(): Promise<void>;
  selectKind(kind: ContextEventKind): void;
  toggleZone(zoneId: string): void;
  setWaterStartConfidence(value: "confirmed" | "unknown"): void;
  setOccurredAt(value: string): void;
  setQuickTime(minutesAgo: number): void;
  submit(): Promise<boolean>;
  resetError(): void;
  dispose(): void;
}

interface Dependencies {
  repository: ContextEventRepositoryPort;
  identity: LocalIdentityPort & DeviceIdentityPort;
  boot: AppBootController;
  createId(): string;
  now(): Date;
  getConnectivity(): "online" | "offline";
}

const ORDINARY_CHOICES: ContextEventChoice[] = [
  {
    kind: "heavy_sweat",
    label: "大量流汗",
    description: "流汗可能讓防曬提前失效。"
  },
  {
    kind: "towel",
    label: "擦毛巾",
    description: "擦拭會直接帶走防曬。"
  },
  {
    kind: "friction",
    label: "明顯摩擦",
    description: "背帶、衣物或裝備的摩擦。"
  },
  {
    kind: "hand_wash",
    label: "洗手",
    description: "只影響手部，其他部位不受影響。"
  }
];

const WATER_START_CHOICE: ContextEventChoice = {
  kind: "water_start",
  label: "游泳／下水",
  description: "開始一段水上活動。"
};

const WATER_END_CHOICE: ContextEventChoice = {
  kind: "water_end",
  label: "離水",
  description: "結束目前這段水上活動。"
};

const LABEL_BY_KIND: Record<ContextEventKind, string> = {
  heavy_sweat: "大量流汗",
  towel: "擦毛巾",
  friction: "明顯摩擦",
  hand_wash: "洗手",
  water_start: "游泳／下水",
  water_end: "離水"
};

function isExposedActive(zone: ZoneProjection): boolean {
  return (
    zone.trackingStatus === "active" && zone.skinExposureStatus === "exposed"
  );
}

export function createContextEventController(
  dependencies: Dependencies
): ContextEventController {
  const phase = shallowRef<ContextEventPhase>("idle");
  const session = shallowRef<SessionProjection | null>(null);
  const availableChoices = shallowRef<ContextEventChoice[]>([]);
  const selectedKind = shallowRef<ContextEventKind | null>(null);
  const selectableZones = shallowRef<ZoneProjection[]>([]);
  const selectedZoneIds = shallowRef<string[]>([]);
  const zoneSelectionLocked = shallowRef(false);
  const openWaterInterval = shallowRef<OpenWaterInterval | null>(null);
  const waterStartConfidence = shallowRef<"confirmed" | "unknown">("confirmed");
  const occurredAt = shallowRef("");
  const referenceNow = shallowRef("");
  const fieldErrors = shallowRef<Record<string, string[]>>({});
  const error = shallowRef<ContextEventError>(null);
  const success = shallowRef<ContextEventSuccess | null>(null);
  let pendingCommand: ReportContextEventCommandV1 | null = null;
  let disposed = false;

  async function load(): Promise<void> {
    if (disposed) return;
    phase.value = "loading";
    error.value = null;
    const now = dependencies.now();
    let context;
    try {
      const visitorId = await dependencies.identity.getOrCreateLocalVisitorId();
      context = await dependencies.repository.getContextEventContext(
        visitorId,
        now.toISOString()
      );
    } catch {
      error.value = "persistence";
      phase.value = "error";
      return;
    }
    if (context === null) {
      session.value = null;
      error.value = "not_found";
      phase.value = "error";
      return;
    }

    session.value = context.session;
    openWaterInterval.value = context.openWaterInterval;
    // 已有進行中的水上區間就不能再開一段；沒有就沒有東西可以關閉。
    availableChoices.value = [
      ...ORDINARY_CHOICES,
      ...(context.openWaterInterval === null
        ? [WATER_START_CHOICE]
        : [WATER_END_CHOICE])
    ];
    selectableZones.value = context.session.zones.filter(isExposedActive);
    selectedKind.value = null;
    selectedZoneIds.value = [];
    zoneSelectionLocked.value = false;
    waterStartConfidence.value = "confirmed";
    referenceNow.value = now.toISOString();
    occurredAt.value = referenceNow.value;
    pendingCommand = null;
    phase.value = "ready";
  }

  /** 預選規則見 P0_SCREEN_INVENTORY S-09。 */
  function presetZoneIds(kind: ContextEventKind): string[] {
    if (kind === "water_end") {
      return [...(openWaterInterval.value?.zoneInstanceIds ?? [])];
    }
    if (kind === "hand_wash") {
      return selectableZones.value
        .filter((zone) => zone.bodyZoneCode === "hand_backs")
        .map((zone) => zone.zoneInstanceId);
    }
    if (kind === "water_start") {
      return selectableZones.value.map((zone) => zone.zoneInstanceId);
    }
    // 擦拭／摩擦／流汗：規格要求使用者自行確認實際受影響部位。
    return [];
  }

  function selectKind(kind: ContextEventKind): void {
    selectedKind.value = kind;
    selectedZoneIds.value = presetZoneIds(kind);
    zoneSelectionLocked.value = kind === "water_end";
    fieldErrors.value = {};
    pendingCommand = null;
  }

  function toggleZone(zoneId: string): void {
    if (zoneSelectionLocked.value) return;
    selectedZoneIds.value = selectedZoneIds.value.includes(zoneId)
      ? selectedZoneIds.value.filter((id) => id !== zoneId)
      : [...selectedZoneIds.value, zoneId];
    pendingCommand = null;
  }

  function setWaterStartConfidence(value: "confirmed" | "unknown"): void {
    waterStartConfidence.value = value;
    pendingCommand = null;
  }

  function setOccurredAt(value: string): void {
    occurredAt.value = value;
    pendingCommand = null;
  }

  function setQuickTime(minutesAgo: number): void {
    const now = dependencies.now();
    referenceNow.value = now.toISOString();
    setOccurredAt(
      new Date(now.getTime() - minutesAgo * 60_000).toISOString()
    );
  }

  async function submit(): Promise<boolean> {
    if (
      session.value === null ||
      phase.value === "submitting" ||
      success.value !== null
    ) {
      return false;
    }

    const kind = selectedKind.value;
    const errors: Record<string, string[]> = {};
    if (kind === null) {
      errors.kind = ["請選擇要記錄的狀況。"];
    }
    if (kind !== null && selectedZoneIds.value.length === 0) {
      errors.zones = ["請至少選擇一個受影響的部位。"];
    }
    const occurredAtMs = Date.parse(occurredAt.value);
    if (
      !Number.isFinite(occurredAtMs) ||
      occurredAtMs > dependencies.now().getTime()
    ) {
      errors.occurredAt = ["事件時間不能晚於目前時間。"];
    }
    if (Object.keys(errors).length > 0) {
      fieldErrors.value = errors;
      error.value = "validation";
      return false;
    }

    phase.value = "submitting";
    fieldErrors.value = {};
    if (pendingCommand === null) pendingCommand = await buildCommand();

    let result;
    try {
      result = await dependencies.repository.reportContextEvent(
        pendingCommand,
        {
          status: "trusted",
          trustedNow: dependencies.now().toISOString(),
          connectivity: dependencies.getConnectivity()
        }
      );
    } catch {
      error.value = "persistence";
      phase.value = "error";
      return false;
    }

    if (!result.ok) {
      if (result.code === "PERSISTENCE_ERROR") {
        error.value = "persistence";
      } else if (result.code === "NOT_FOUND") {
        error.value = "not_found";
        pendingCommand = null;
      } else if (
        result.code === "REVISION_CONFLICT" ||
        result.code === "CLIENT_SEQUENCE_CONFLICT"
      ) {
        error.value = "state_changed";
        pendingCommand = null;
      } else {
        error.value = "validation";
        pendingCommand = null;
      }
      phase.value = "error";
      return false;
    }

    const committed = pendingCommand;
    pendingCommand = null;
    success.value = {
      kind: kind!,
      label: LABEL_BY_KIND[kind!],
      zoneIds: [...selectedZoneIds.value],
      occurredAt: committed.payload.effectiveOccurredAt,
      committedRevision: result.revision ?? session.value.revision + 1
    };

    try {
      await dependencies.boot.refresh();
      if (
        dependencies.boot.currentSession.value?.revision !== result.revision
      ) {
        error.value = "refresh_failed";
      }
    } catch {
      error.value = "refresh_failed";
    }
    phase.value = "success";
    return true;
  }

  async function buildCommand(): Promise<ReportContextEventCommandV1> {
    const [visitorId, deviceId] = await Promise.all([
      dependencies.identity.getOrCreateLocalVisitorId(),
      dependencies.identity.getOrCreateDeviceLocalId()
    ]);
    const kind = selectedKind.value!;
    const effectiveOccurredAt = new Date(occurredAt.value).toISOString();

    const detail =
      kind === "water_start"
        ? {
            contextType: "water_start",
            activityIntervalId: dependencies.createId(),
            zoneInstanceIds: selectedZoneIds.value,
            startConfidence: waterStartConfidence.value,
            // 入水時間未知時起點必須為 null，避免製造不存在的耐水倒數。
            activityStartedAt:
              waterStartConfidence.value === "confirmed"
                ? effectiveOccurredAt
                : null
          }
        : kind === "water_end"
          ? {
              contextType: "water_end",
              activityIntervalId:
                openWaterInterval.value!.activityIntervalId,
              zoneInstanceIds: selectedZoneIds.value,
              endedAt: effectiveOccurredAt
            }
          : {
              contextType: kind,
              zoneInstanceIds: selectedZoneIds.value
            };

    return ReportContextEventCommandV1Schema.parse({
      commandVersion: COMMAND_SCHEMA_VERSION,
      commandType: "report_context_event",
      commandId: dependencies.createId(),
      idempotencyKey: dependencies.createId(),
      owner: { type: "guest", localVisitorId: visitorId },
      deviceLocalId: deviceId,
      sessionId: session.value!.sessionId,
      clientSequence: session.value!.revision + 1,
      clientCreatedAt: dependencies.now().toISOString(),
      expectedRevision: session.value!.revision,
      payload: {
        eventId: dependencies.createId(),
        effectiveOccurredAt,
        detail
      }
    });
  }

  function resetError(): void {
    error.value = null;
    if (phase.value === "error") phase.value = "ready";
  }

  function dispose(): void {
    disposed = true;
  }

  return {
    phase: shallowReadonly(phase),
    session: shallowReadonly(session),
    availableChoices: shallowReadonly(availableChoices),
    selectedKind: shallowReadonly(selectedKind),
    selectableZones: shallowReadonly(selectableZones),
    selectedZoneIds: shallowReadonly(selectedZoneIds),
    zoneSelectionLocked: shallowReadonly(zoneSelectionLocked),
    openWaterInterval: shallowReadonly(openWaterInterval),
    waterStartConfidence: shallowReadonly(waterStartConfidence),
    occurredAt: shallowReadonly(occurredAt),
    referenceNow: shallowReadonly(referenceNow),
    fieldErrors: shallowReadonly(fieldErrors),
    error: shallowReadonly(error),
    success: shallowReadonly(success),
    load,
    selectKind,
    toggleZone,
    setWaterStartConfidence,
    setOccurredAt,
    setQuickTime,
    submit,
    resetError,
    dispose
  };
}
