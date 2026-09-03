import type { IconName } from "../../generated/icons.generated";
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

/**
 * 記錄完這種狀況之後，接下來該不該去記錄補擦。
 *
 * **只有「游泳／下水」不該。** reducer 把 `water_start` 排除在 timedCauses
 * 之外（`reducer.ts` 的 causeEvents 過濾）——它開啟的是一段水中區間，期限
 * 改由耐水標示決定，不是一個立刻到期的原因。其餘五種都把期限拉到事件發生
 * 的那一刻，也就是記錄完當下就已經到期。
 *
 * 語意上也對得起來：剛下水的人在水裡，補擦既做不到也還不需要；離水之後
 * 反而是最該補擦的時機。
 *
 * **抽成函式而不是在頁面裡寫一個 `!==`**：這樣才守得住「新增第七種事件時
 * 必須選邊」——`contextEventFollowUp.test.ts` 逐一列舉所有 kind。
 */
export function suggestsReapplyAfter(kind: ContextEventKind): boolean {
  return kind !== "water_start";
}

export type ContextEventPhase =
  "idle" | "loading" | "ready" | "submitting" | "success" | "error";

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
  /**
   * 2026-08-31 新增。四顆 `event-*` 圖示 2026-08-29 就畫好進了註冊表，
   * label 與這裡的選項逐字相同——它們本來就是為這個選單畫的，只是一直
   * 沒接上（2026-08-31 的圖示清點量到「61 顆裡 17 顆沒有任何使用點」，
   * 這四顆就在其中）。
   *
   * 放在選項物件上而不是元件裡的對照表：`GEAR_CATEGORY_ICONS` 就是被
   * 複製到 GearForm 與 GearListItem 兩個檔案的前例，兩份遲早會漂移。
   */
  icon: IconName;
  /**
   * 送出按鈕的文字，例如「記錄流汗」。
   *
   * 2026-08-31（使用者要求）：原本固定是「確認記錄」。捲到頁面底部按下去
   * 時，畫面上已經看不到自己選了哪一項——泛用的「確認記錄」不提供任何
   * 再確認的機會。
   *
   * **刻意不寫「確認補擦」。** 記錄狀況與記錄補擦是兩件不同的事：補擦讓
   * 倒數重新開始，記錄狀況只是縮短它或改用耐水規則。按鈕上寫「補擦」會
   * 讓人以為自己已經補過了——這是這個 App 最不能出錯的地方。
   */
  submitLabel: string;
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
  /**
   * 選單上那四種「防曬被磨掉了」。
   *
   * **2026-09-03（階段三）：水上活動不再混在這裡面。** 損耗與狀態轉換是
   * 兩件不同的事——四種損耗會把期限拉到事件發生的那一刻（記錄完就到期），
   * 下水／離水則是開關一段水中區間、改由耐水標示決定期限。混在同一張清單
   * 裡讀起來像六個並列的選項，實際上它們連「記錄完接下來要做什麼」都相反
   * （見 `suggestsReapplyAfter`）。
   *
   * 這四種與補擦流程「為什麼補擦？」的四個原因是同一組——那不是巧合，
   * 是同一件事的兩個入口。
   */
  ordinaryChoices: Readonly<ShallowRef<ContextEventChoice[]>>;
  /**
   * 目前可用的水上活動動作：沒有進行中的區間就是「下水」，有就是「離水」，
   * 兩者永遠不會同時出現。
   *
   * 入口在首頁（`WaterActivityLink`），不在這一頁的選單裡。這裡保留它是為了
   * 讓深連結（`/reminder/report?kind=water_start`）查得到對應的 choice。
   */
  waterChoice: Readonly<ShallowRef<ContextEventChoice | null>>;
  /** 深連結與錯誤訊息用：四種損耗 ＋ 目前那一種水上動作。 */
  allChoices: Readonly<ShallowRef<ContextEventChoice[]>>;
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
    description: "流汗可能讓防曬提前失效。",
    icon: "event-heavy-sweat",
    submitLabel: "記錄流汗"
  },
  {
    kind: "towel",
    label: "擦毛巾",
    description: "擦拭會直接帶走防曬。",
    icon: "event-towel",
    submitLabel: "記錄擦毛巾"
  },
  {
    kind: "friction",
    label: "明顯摩擦",
    description: "背帶、衣物或裝備的摩擦。",
    icon: "event-friction",
    submitLabel: "記錄摩擦"
  },
  {
    kind: "hand_wash",
    label: "洗手",
    description: "只影響手部，其他部位不受影響。",
    icon: "event-hand-wash",
    submitLabel: "記錄洗手"
  }
];

/*
 * 下水與離水共用 `context-water`。看起來像偷懶，但它們**永遠不會同時
 * 出現**——有進行中的水上區間就只給離水，沒有就只給下水（見下方
 * waterChoice 的組法）。同一個主題的兩個時刻，用同一顆圖示是準的；
 * 為「離水」另畫一顆只會多一顆幾乎一樣的幾何。
 */
const WATER_START_CHOICE: ContextEventChoice = {
  kind: "water_start",
  label: "游泳／下水",
  description: "開始一段水上活動。",
  icon: "context-water",
  submitLabel: "記錄下水"
};

const WATER_END_CHOICE: ContextEventChoice = {
  kind: "water_end",
  label: "離水",
  description: "結束目前這段水上活動。",
  icon: "context-water",
  submitLabel: "記錄離水"
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

/**
 * 選好事件之後，預設要勾哪些部位。
 *
 * **抽成純函式**（2026-08-31）：它是這一頁唯一有分支的規則，而 controller
 * 本身要一整組 port 才掛得起來。純函式才測得動每一條分支。
 *
 * 前三種來自 S-09 規格（洗手預選手背、下水預選外露部位、離水沿用起點集合
 * 且鎖定），不動。
 *
 * **流汗／擦毛巾／明顯摩擦改成沿用上一次的選擇**（使用者裁決乙）。原本一律
 * 回傳空陣列，註解寫「規格要求使用者自行確認實際受影響部位」——但那個要求
 * 的效果是**每記錄一次就要重新勾八個部位一遍**，而使用者每次勾的都差不多。
 *
 * 沿用歷史仍然滿足「自行確認」：勾選狀態明確畫在畫面上，看得到也改得動；
 * 它是預設值不是規則。第一次記錄（沒有歷史）維持空的，那時確實沒有東西可以
 * 沿用。
 */
export function resolvePresetZoneIds(input: {
  kind: ContextEventKind;
  selectableZones: ZoneProjection[];
  openWaterInterval: OpenWaterInterval | null;
  lastZoneIdsByKind: Record<string, string[]>;
}): string[] {
  const { kind, selectableZones, openWaterInterval, lastZoneIdsByKind } = input;

  if (kind === "water_end") {
    return [...(openWaterInterval?.zoneInstanceIds ?? [])];
  }
  if (kind === "hand_wash") {
    return selectableZones
      .filter((zone) => zone.bodyZoneCode === "hand_backs")
      .map((zone) => zone.zoneInstanceId);
  }
  if (kind === "water_start") {
    return selectableZones.map((zone) => zone.zoneInstanceId);
  }

  /*
   * 過濾掉現在已經不能選的部位——上次記錄之後可能有部位被停止追蹤或被
   * 衣物遮住了。留著會送出一個現在無效的 zoneInstanceId。
   */
  const selectable = new Set(
    selectableZones.map((zone) => zone.zoneInstanceId)
  );
  return (lastZoneIdsByKind[kind] ?? []).filter((id) => selectable.has(id));
}

export function createContextEventController(
  dependencies: Dependencies
): ContextEventController {
  const phase = shallowRef<ContextEventPhase>("idle");
  const session = shallowRef<SessionProjection | null>(null);
  const ordinaryChoices = shallowRef<ContextEventChoice[]>([]);
  const waterChoice = shallowRef<ContextEventChoice | null>(null);
  const allChoices = shallowRef<ContextEventChoice[]>([]);
  const selectedKind = shallowRef<ContextEventKind | null>(null);
  const selectableZones = shallowRef<ZoneProjection[]>([]);
  const selectedZoneIds = shallowRef<string[]>([]);
  const zoneSelectionLocked = shallowRef(false);
  const openWaterInterval = shallowRef<OpenWaterInterval | null>(null);
  /** 每一種事件上次選了哪些部位（見 presetZoneIds）。 */
  let lastZoneIdsByKind: Record<string, string[]> = {};
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
    ordinaryChoices.value = [...ORDINARY_CHOICES];
    // 已有進行中的水上區間就不能再開一段；沒有就沒有東西可以關閉。
    waterChoice.value =
      context.openWaterInterval === null ? WATER_START_CHOICE : WATER_END_CHOICE;
    allChoices.value = [...ordinaryChoices.value, waterChoice.value];
    lastZoneIdsByKind = context.lastZoneIdsByKind;
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

  function presetZoneIds(kind: ContextEventKind): string[] {
    return resolvePresetZoneIds({
      kind,
      selectableZones: selectableZones.value,
      openWaterInterval: openWaterInterval.value,
      lastZoneIdsByKind
    });
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
    setOccurredAt(new Date(now.getTime() - minutesAgo * 60_000).toISOString());
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
              activityIntervalId: openWaterInterval.value!.activityIntervalId,
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
    ordinaryChoices: shallowReadonly(ordinaryChoices),
    waterChoice: shallowReadonly(waterChoice),
    allChoices: shallowReadonly(allChoices),
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
