import type {
  ActionKind,
  ApplicationConfirmationGroupV1,
  ApplicationEventV1,
  ContextEventV1,
  MethodComponent,
  PrimaryAction,
  ProductEligibility,
  ReasonCode,
  ReducerClock,
  SessionEventStreamV1,
  SessionProjection,
  ZoneMethodEventV1,
  ZoneProjection,
  ZoneTrackingEventV1
} from "@sunshield/contracts";
import { BODY_ZONE_V3_ORDER } from "@sunshield/contracts";
import {
  resolveEventCorrectionLeaves,
  resolveGroupCorrectionLeaves
} from "./corrections";
import { DomainInvariantError } from "./errors";
import {
  addMinutes,
  compareApplicationOrder,
  compareCommandOrder,
  compareEventOrder,
  minInstant,
  uniqueStable
} from "./ordering";
import { validateWaterIntervals } from "./water";

const GENERAL_MAX_MINUTES = 120;
/**
 * 「快到補擦時間」提前多久開始（2026-09-04 使用者裁決：30 → 20 分鐘）。
 *
 * 這個值決定 `reapply_soon`，也就是首頁倒數轉成橘色、部位清單展開成
 * 「快到補擦時間」那一刻。改短是因為 30 分鐘的預警期太長——橘色出現之後
 * 還要再等半小時才真的到期，警示色待在畫面上太久就失去警示的作用。
 */
const SOON_WINDOW_MS = 20 * 60_000;

type EffectiveStream = Omit<
  SessionEventStreamV1,
  | "zoneMethodEvents"
  | "zoneTrackingEvents"
  | "applicationConfirmationGroups"
  | "productSafetyEvents"
  | "contextEvents"
> & {
  zoneMethodEvents: ZoneMethodEventV1[];
  zoneTrackingEvents: ZoneTrackingEventV1[];
  applicationConfirmationGroups: ApplicationConfirmationGroupV1[];
  productSafetyEvents: SessionEventStreamV1["productSafetyEvents"];
  contextEvents: ContextEventV1[];
};

type CandidateAction = PrimaryAction & {
  tier: number;
  priority: number;
  zoneOrder: number;
};

function isTopical(components: ReadonlyArray<MethodComponent>): boolean {
  return (
    components.includes("sunscreen") || components.includes("other_topical")
  );
}

function sameStringSet(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const rightSet = new Set(right);
  return left.every((value) => rightSet.has(value));
}

/**
 * 會擋住一般期限的 eligibility。
 *
 * 2026-08-30 規則改動：只有「知道有問題」才擋，「不知道」改用 120 分鐘
 * 保守預設。
 *
 * 改動前的條件是 `eligibility === "eligible"`，等於 identity_unconfirmed
 * 與 no_sunscreen_claim 也一律不建立期限——「沒填防曬乳資訊就完全沒有
 * 倒數」。但產品標示只會讓間隔變短（`Math.min(GENERAL_MAX_MINUTES, …)`），
 * 沒有標示時的值本來就是 120，所以擋住倒數並沒有比較保守，只是什麼都不
 * 給。現行 UX 基準（`docs/decisions/2026-08-15-redesign-sitemap-userflow-current.md`
 * 第 116 行）本來也是訂「可使用 120 分鐘保守預設」；擋住的那條
 * RR-P0-ELIGIBILITY-002 只存在於 docs/archive，不是現行依據。
 *
 * 過期／異常／不適維持封鎖：那是使用者主動回報「這瓶有狀況」，這時給倒
 * 數等於忽略他的回報。
 *
 * **刻意用列舉而不是否定判斷**：之後新增 eligibility 值時，預設會落在
 * 「不擋」以外——新值必須被明確加進這個集合才會擋，讓「忘記處理新值」
 * 這件事在 code review 時看得見，而不是靜默放行。
 *
 * 耐水期限不走這裡，仍然要求 `eligible`——沒有抗水標示算不出耐水時間，
 * 那不是保守預設能補的。
 */
const GENERAL_DEADLINE_BLOCKERS = new Set<ProductEligibility>([
  "expired",
  "abnormal_reported",
  "discomfort_reported"
]);

function blocksGeneralDeadline(eligibility: ProductEligibility): boolean {
  return GENERAL_DEADLINE_BLOCKERS.has(eligibility);
}

function eligibilityReason(eligibility: ProductEligibility): ReasonCode | null {
  switch (eligibility) {
    case "eligible":
      return null;
    case "expired":
      return "PRODUCT_EXPIRED";
    case "abnormal_reported":
      return "PRODUCT_ABNORMAL_REPORTED";
    case "discomfort_reported":
      return "PRODUCT_DISCOMFORT_REPORTED";
    case "no_sunscreen_claim":
      return "PRODUCT_NO_SUNSCREEN_CLAIM";
    case "identity_unconfirmed":
      return "PRODUCT_IDENTITY_UNKNOWN";
  }
}

function causeReason(event: ContextEventV1): ReasonCode | null {
  switch (event.contextType) {
    case "water_start":
      return event.startConfidence === "unknown" ? "WATER_START_UNKNOWN" : null;
    case "water_end":
      return "WATER_ENDED";
    case "heavy_sweat":
      return "HEAVY_SWEAT_REPORTED";
    case "towel":
      return "TOWEL_REPORTED";
    case "friction":
      return "FRICTION_REPORTED";
    case "hand_wash":
      return "HAND_WASH_REPORTED";
    case "context_changed":
      return null;
  }
}

function effectiveStream(stream: SessionEventStreamV1): EffectiveStream {
  const groupLeaves = resolveGroupCorrectionLeaves(
    stream.applicationConfirmationGroups
  );
  const effectiveGroupIds = new Set(groupLeaves.map((group) => group.id));
  const applications = stream.applicationEvents.filter((application) =>
    effectiveGroupIds.has(application.applicationConfirmationId)
  );

  for (const group of groupLeaves) {
    const groupApplications = applications.filter(
      (application) => application.applicationConfirmationId === group.id
    );
    const assigned: string[] = [];
    for (const application of groupApplications) {
      if (application.appliedAt !== group.appliedAt) {
        throw new DomainInvariantError(
          "INVALID_APPLICATION_PARTITION",
          `${group.id} 內的 appliedAt 不一致`
        );
      }
      for (const zoneId of application.zoneInstanceIds) {
        if (assigned.includes(zoneId)) {
          throw new DomainInvariantError(
            "INVALID_APPLICATION_PARTITION",
            `${group.id} 的部位集合重疊`
          );
        }
        assigned.push(zoneId);
      }
    }
    if (!sameStringSet(assigned, group.confirmedZoneInstanceIds)) {
      throw new DomainInvariantError(
        "INVALID_APPLICATION_PARTITION",
        `${group.id} 未形成完整互斥 partition`
      );
    }
  }

  return {
    ...stream,
    zoneMethodEvents: resolveEventCorrectionLeaves(
      stream.zoneMethodEvents,
      () => "zone_method"
    ),
    zoneTrackingEvents: resolveEventCorrectionLeaves(
      stream.zoneTrackingEvents,
      () => "zone_tracking"
    ),
    applicationConfirmationGroups: groupLeaves,
    applicationEvents: applications,
    productSafetyEvents: resolveEventCorrectionLeaves(
      stream.productSafetyEvents,
      () => "product_safety"
    ),
    contextEvents: resolveEventCorrectionLeaves(
      stream.contextEvents,
      (event) => event.contextType
    )
  };
}

function last<T>(values: T[]): T | null {
  return values.length === 0 ? null : (values[values.length - 1] ?? null);
}

function lastTrackingActivation(
  events: ZoneTrackingEventV1[]
): ZoneTrackingEventV1 | null {
  let previous: ZoneTrackingEventV1["trackingStatus"] | null = null;
  let activation: ZoneTrackingEventV1 | null = null;
  for (const event of events) {
    if (event.trackingStatus === "active" && previous !== "active") {
      activation = event;
    }
    previous = event.trackingStatus;
  }
  return activation;
}

function lastMethodActivation(
  events: ZoneMethodEventV1[]
): ZoneMethodEventV1 | null {
  let previousTopical = false;
  let activation: ZoneMethodEventV1 | null = null;
  for (const event of events) {
    const currentTopical = isTopical(event.methodComponents);
    if (currentTopical && !previousTopical) {
      activation = event;
    }
    previousTopical = currentTopical;
  }
  return activation;
}

function laterCommandEvent(
  left: ZoneMethodEventV1 | ZoneTrackingEventV1 | null,
  right: ZoneMethodEventV1 | ZoneTrackingEventV1 | null
): ZoneMethodEventV1 | ZoneTrackingEventV1 | null {
  if (left === null) return right;
  if (right === null) return left;
  return compareCommandOrder(left, right) >= 0 ? left : right;
}

function currentApplicationForZone(
  zoneId: string,
  applications: ApplicationEventV1[],
  activation: ZoneMethodEventV1 | ZoneTrackingEventV1 | null
): {
  current: ApplicationEventV1 | null;
  candidates: ApplicationEventV1[];
  activationAt: string;
  activationSequence: number;
} {
  if (activation === null) {
    return {
      current: null,
      candidates: [],
      activationAt: "1970-01-01T00:00:00.000Z",
      activationSequence: 0
    };
  }
  const sameCommandApplications = applications.filter(
    (application) =>
      application.commandId === activation.commandId &&
      application.zoneInstanceIds.includes(zoneId)
  );
  const activationAt =
    sameCommandApplications
      .map((application) => application.appliedAt)
      .sort((a, b) => Date.parse(a) - Date.parse(b))[0] ??
    activation.effectiveOccurredAt;

  const candidates = applications
    .filter(
      (application) =>
        application.zoneInstanceIds.includes(zoneId) &&
        application.localAppliedSequence >= activation.localAppliedSequence &&
        Date.parse(application.appliedAt) >= Date.parse(activationAt)
    )
    .sort(compareApplicationOrder);
  return {
    current: last(candidates),
    candidates,
    activationAt,
    activationSequence: activation.localAppliedSequence
  };
}

function recordStatusFor(
  method: ZoneMethodEventV1
): ZoneProjection["recordStatus"] {
  if (method.methodCertainty === "unrecorded") return "unrecorded";
  if (method.methodCertainty === "unknown") return "unknown";
  if (method.methodCertainty === "none_reported") return "none_reported";

  const hasSunscreen = method.methodComponents.includes("sunscreen");
  const hasClothing = method.methodComponents.includes("clothing");
  if (method.skinExposureStatus === "clothing_covered") {
    if (hasClothing && hasSunscreen) return "mixed";
    return "physical_method_reported";
  }
  if (hasSunscreen) return "sunscreen_recorded";
  return "none_reported";
}

function activeSafetyReasons(
  zoneId: string,
  application: ApplicationEventV1 | null,
  events: EffectiveStream["productSafetyEvents"]
): { reasons: ReasonCode[]; refs: string[] } {
  if (application === null) {
    return { reasons: [], refs: [] };
  }
  const matches = events.filter(
    (event) =>
      event.zoneInstanceIds.includes(zoneId) &&
      ((event.sourceProductId !== null &&
        event.sourceProductId === application.sourceProductId) ||
        (event.productSnapshotFingerprint !== null &&
          event.productSnapshotFingerprint ===
            application.productSnapshotFingerprint))
  );
  return {
    reasons: uniqueStable(
      matches.map((event) =>
        event.safetyKind === "abnormal_reported"
          ? "PRODUCT_ABNORMAL_REPORTED"
          : "PRODUCT_DISCOMFORT_REPORTED"
      )
    ),
    refs: matches.map((event) => event.id)
  };
}

/**
 * 最後一次「足以清掉原因」的塗抹。
 *
 * 損耗事件（流汗／擦毛巾／摩擦／洗手／離水）講的是「那層防曬被弄掉了」。
 * 之後重新塗抹就是換上新的一層，先前那些事件因此在歷史上被取代——這個函式
 * 回傳的就是判斷「取代點」的那筆塗抹。
 *
 * **2026-09-02：判準由 `eligible` 改為「沒有被 `blocksGeneralDeadline` 擋
 * 住」。**
 *
 * 舊判準造成的實際後果：`identity_unconfirmed`（標示沒確認）自 2026-08-30
 * 起**會**用 120 分鐘保守預設開始倒數，但它不算 `eligible`，所以清不掉原因。
 * 而且沒有任何一筆合格塗抹時，下面的過濾會走 `=== null` 那一支，讓所有損耗
 * 事件**無條件成立**——結果是：
 *
 * > 標示未確認的使用者，只要記錄過任何損耗事件，該部位就永遠到期，補擦也
 * > 清不掉。
 *
 * 而「標示未確認」是預設路徑（沒填包裝標示就會落在這裡）。
 *
 * 新判準的原則很簡單：**足以開始一段倒數的塗抹，就足以清掉一個原因。**
 * 兩件事用同一個閘門，不會再出現「這筆塗抹算數也不算數」的分裂。
 *
 * 被擋住的三種（過期／回報異常／回報不適）**維持不能清**，那是刻意的：
 * 它們是安全封鎖（S-11／S-13 明訂無法直接恢復），拿一瓶過期的防曬乳再擦
 * 一次不該讓警示消失。
 *
 * 耐水期限不走這裡，仍然要求 `eligible`——沒有抗水標示算不出耐水時間，
 * 那不是保守預設能補的（見 `GENERAL_DEADLINE_BLOCKERS` 的註解）。
 */
function latestCauseResettingApplication(
  zoneId: string,
  applications: ApplicationEventV1[]
): ApplicationEventV1 | null {
  return last(
    applications
      .filter(
        (application) =>
          application.zoneInstanceIds.includes(zoneId) &&
          !blocksGeneralDeadline(
            application.productLabelSnapshot.ruleEligibilityAtApplication
          )
      )
      .sort(compareApplicationOrder)
  );
}

function zoneOrder(bodyZoneCode: string): number {
  const index = BODY_ZONE_V3_ORDER.indexOf(
    bodyZoneCode as (typeof BODY_ZONE_V3_ORDER)[number]
  );
  return index === -1 ? BODY_ZONE_V3_ORDER.length : index;
}

function candidateForZone(zone: ZoneProjection): CandidateAction | null {
  const base = {
    affectedZoneInstanceIds: [zone.zoneInstanceId],
    reasonCodes: zone.reasonCodes,
    derivedFromEventRefs: zone.derivedFromEventRefs,
    zoneOrder: zoneOrder(zone.bodyZoneCode)
  };
  if (zone.activeProductSafetyBlock && zone.skinExposureStatus === "exposed") {
    return {
      ...base,
      tier: 10,
      priority: 10,
      presentationType: "untimed_action_card",
      variant: null,
      actionKind: "switch_protection",
      actionAt: null
    };
  }
  if (zone.recordStatus === "unrecorded") {
    return {
      ...base,
      tier: 20,
      priority: 20,
      presentationType: "untimed_action_card",
      variant: null,
      actionKind: "complete_protection_record",
      actionAt: null
    };
  }
  if (zone.recordStatus === "unknown") {
    return {
      ...base,
      tier: 20,
      priority: 21,
      presentationType: "untimed_action_card",
      variant: null,
      actionKind: "confirm_protection_method",
      actionAt: null
    };
  }
  /*
   * 2026-08-30：這是「不知道標示就沒有倒數」的第三道閘門——即使期限算得
   * 出來、timingStatus 也是 tracking，主要動作仍會被推成
   * untimed_action_card，於是首頁的倒數區塊整個不渲染
   * （buildHomeReminderClockPresentation 看到 untimed_action_card 就回
   * 傳 null）。
   *
   * 三處必須用同一個判斷。改動時只改前兩處，畫面上會看到「提醒進行中」
   * 卻沒有倒數數字——那正是實測時遇到的狀況。
   */
  if (
    zone.recordStatus === "none_reported" ||
    (zone.currentApplicationEligibility !== null &&
      blocksGeneralDeadline(zone.currentApplicationEligibility))
  ) {
    return {
      ...base,
      tier: 20,
      priority: 22,
      presentationType: "untimed_action_card",
      variant: null,
      actionKind: "view_protection_options",
      actionAt: null
    };
  }
  if (zone.reasonCodes.includes("WATER_START_UNKNOWN")) {
    return {
      ...base,
      tier: 30,
      priority: 30,
      presentationType: "untimed_action_card",
      variant: null,
      actionKind: "resolve_water_start",
      actionAt: null
    };
  }
  if (zone.timingStatus === "untimed_action") {
    return {
      ...base,
      tier: 30,
      priority: 31,
      presentationType: "untimed_action_card",
      variant: null,
      actionKind: "resolve_cause",
      actionAt: null
    };
  }
  if (zone.timingStatus === "reapply_due") {
    return {
      ...base,
      tier: 40,
      priority: 40,
      presentationType: "due_card",
      variant: null,
      actionKind: "record_reapplication",
      actionAt: zone.zoneDueAt
    };
  }
  if (zone.timingStatus === "label_wait") {
    return {
      ...base,
      tier: 50,
      priority: 50,
      presentationType: "untimed_action_card",
      variant: "label_wait",
      actionKind: "view_product_label",
      actionAt: zone.activeLabelReadyAt
    };
  }
  if (zone.timingStatus === "reapply_soon") {
    return {
      ...base,
      tier: 60,
      priority: 60,
      presentationType: "timed_ring",
      variant: null,
      actionKind: "record_reapplication",
      actionAt: zone.zoneDueAt
    };
  }
  /*
   * **2026-09-02：tracking 的主行動從 report_context_event 改成
   * record_reapplication（使用者裁決）。**
   *
   * 使用者的原則是「這款 App 的主要功能就是提醒要補擦防曬乳」。照那條
   * 原則，一切正常時 App 唯一叫使用者做的事不該是「去宣告一個問題」。
   *
   * 改動前的實際後果：首頁只有一顆按鈕，tracking 時指向記錄狀況，而
   * secondaryActions 是空的——**還沒到期就沒有辦法記錄補擦**。但提早補擦
   * 是常見的（要再出門、快下水、覺得乾了），核心動作在正常狀態下不可達
   * 說不過去。
   *
   * 記錄狀況沒有消失，改由首頁的提問卡承接（`showContextEventPrompt`）
   * ——那張卡 2026-08-30 就已經把它從深杏桃主 CTA 降級了，這次只是讓
   * domain 的語意跟上 UI 早就做出的判斷。
   *
   * 舊版 P0 決策表（`docs/archive/2026-08-pre-redesign/`）把 tier 70 寫成
   * report_context_event，但那份是歸檔，依 CLAUDE.md「只能用來理解歷史，
   * 不可當作現行依據」。
   *
   * tier／presentationType／actionAt 都不動——**只換 actionKind**。倒數環
   * 仍然是這個狀態的主體。
   */
  if (zone.timingStatus === "tracking") {
    return {
      ...base,
      tier: 70,
      priority: 70,
      presentationType: "timed_ring",
      variant: null,
      actionKind: "record_reapplication",
      actionAt: zone.zoneDueAt
    };
  }
  if (
    zone.timingStatus === "not_applicable" &&
    zone.trackingStatus === "active"
  ) {
    return {
      ...base,
      tier: 80,
      priority: 80,
      presentationType: "untimed_action_card",
      variant: "neutral_physical",
      actionKind: "report_context_event",
      actionAt: null
    };
  }
  return null;
}

export function derivePrimaryAction(
  zones: ZoneProjection[],
  clock: ReducerClock,
  ended: boolean
): PrimaryAction {
  if (clock.status === "clock_untrusted") {
    return {
      presentationType: "untimed_action_card",
      variant: null,
      actionKind:
        clock.connectivity === "online"
          ? "recalibrate_clock"
          : "view_conservative_reminder",
      affectedZoneInstanceIds: [],
      actionAt: null,
      reasonCodes: ["CLOCK_UNTRUSTED"],
      derivedFromEventRefs: []
    };
  }
  if (ended) {
    return {
      presentationType: "untimed_action_card",
      variant: null,
      actionKind: "view_ended_state",
      affectedZoneInstanceIds: [],
      actionAt: null,
      reasonCodes: ["SESSION_ENDED"],
      derivedFromEventRefs: []
    };
  }

  const candidates = zones
    .map(candidateForZone)
    .filter((candidate): candidate is CandidateAction => candidate !== null);
  candidates.sort(
    (left, right) =>
      left.tier - right.tier ||
      left.priority - right.priority ||
      (left.actionAt !== null && right.actionAt !== null
        ? Date.parse(left.actionAt) - Date.parse(right.actionAt)
        : left.actionAt !== null
          ? -1
          : right.actionAt !== null
            ? 1
            : 0) ||
      left.zoneOrder - right.zoneOrder ||
      left.affectedZoneInstanceIds[0]!.localeCompare(
        right.affectedZoneInstanceIds[0]!
      )
  );

  const first = candidates[0];
  if (first === undefined) {
    throw new DomainInvariantError(
      "INVALID_EVENT_STREAM",
      "Session 沒有可呈現的 primary action"
    );
  }
  const topTier = candidates.filter(
    (candidate) => candidate.tier === first.tier
  );
  const actionKinds = new Set(topTier.map((candidate) => candidate.actionKind));
  const affectedZoneInstanceIds = topTier
    .sort(
      (left, right) =>
        left.zoneOrder - right.zoneOrder ||
        left.affectedZoneInstanceIds[0]!.localeCompare(
          right.affectedZoneInstanceIds[0]!
        )
    )
    .flatMap((candidate) => candidate.affectedZoneInstanceIds);

  if (actionKinds.size > 1) {
    return {
      presentationType: "untimed_action_card",
      variant: "multi_action",
      actionKind: "review_required_zones",
      affectedZoneInstanceIds,
      actionAt: null,
      reasonCodes: uniqueStable(
        topTier.flatMap((candidate) => candidate.reasonCodes)
      ),
      derivedFromEventRefs: uniqueStable(
        topTier.flatMap((candidate) => candidate.derivedFromEventRefs)
      )
    };
  }

  const sameAction = topTier.filter(
    (candidate) => candidate.actionKind === first.actionKind
  );
  return {
    presentationType: first.presentationType,
    variant: first.variant,
    actionKind: first.actionKind as ActionKind,
    affectedZoneInstanceIds,
    actionAt: minInstant(sameAction.map((candidate) => candidate.actionAt)),
    reasonCodes: uniqueStable(
      sameAction.flatMap((candidate) => candidate.reasonCodes)
    ),
    derivedFromEventRefs: uniqueStable(
      sameAction.flatMap((candidate) => candidate.derivedFromEventRefs)
    )
  };
}

export function reduceSession(input: {
  stream: SessionEventStreamV1;
  revision: number;
  clock: ReducerClock;
}): SessionProjection {
  const stream = effectiveStream(input.stream);
  const trustedNowMs = Date.parse(input.clock.trustedNow);
  const endedEvents = [...stream.sessionEndedEvents].sort(compareEventOrder);
  const ended = endedEvents.length > 0;
  const waterIntervals = validateWaterIntervals(
    input.stream.contextEvents,
    input.clock.trustedNow
  );

  const zones: ZoneProjection[] = [];
  for (const zoneId of stream.sessionStarted.zoneInstanceIds) {
    const methodEvents = stream.zoneMethodEvents
      .filter((event) => event.zoneInstanceId === zoneId)
      .sort(compareEventOrder);
    const trackingEvents = stream.zoneTrackingEvents
      .filter((event) => event.zoneInstanceId === zoneId)
      .sort(compareEventOrder);
    const method = last(methodEvents);
    const tracking = last(trackingEvents);
    if (method === null || tracking === null) {
      throw new DomainInvariantError(
        "INVALID_EVENT_STREAM",
        `部位 ${zoneId} 缺少 method 或 tracking event`
      );
    }

    const methodActivation = lastMethodActivation(methodEvents);
    const trackingActivation = lastTrackingActivation(trackingEvents);
    const activation = laterCommandEvent(methodActivation, trackingActivation);
    const applicationSelection = currentApplicationForZone(
      zoneId,
      stream.applicationEvents,
      activation
    );
    const currentApplication = isTopical(method.methodComponents)
      ? applicationSelection.current
      : null;
    const currentEligibility =
      currentApplication?.productLabelSnapshot.ruleEligibilityAtApplication ??
      null;
    const safety = activeSafetyReasons(
      zoneId,
      currentApplication,
      stream.productSafetyEvents
    );
    const activeSafetyBlock = safety.reasons.length > 0;
    const recordStatus = recordStatusFor(method);
    const applicable =
      !ended &&
      tracking.trackingStatus === "active" &&
      method.skinExposureStatus === "exposed" &&
      method.methodComponents.includes("sunscreen");

    let generalDueAt: string | null = null;
    let activeLabelReadyAt: string | null = null;
    const activeRuleIds: string[] = [];
    const reasonCodes: ReasonCode[] = [];
    const derivedRefs: string[] = [method.id, tracking.id];

    if (currentEligibility !== null) {
      const eligibilityCode = eligibilityReason(currentEligibility);
      if (eligibilityCode !== null) reasonCodes.push(eligibilityCode);
    }
    reasonCodes.push(...safety.reasons);
    derivedRefs.push(...safety.refs);

    if (
      applicable &&
      currentApplication !== null &&
      currentEligibility !== null &&
      !blocksGeneralDeadline(currentEligibility) &&
      !activeSafetyBlock
    ) {
      const snapshot = currentApplication.productLabelSnapshot;
      const interval =
        snapshot.reapplicationIntervalStatus === "explicit_minutes"
          ? Math.min(
              GENERAL_MAX_MINUTES,
              snapshot.reapplicationIntervalMinutes!
            )
          : GENERAL_MAX_MINUTES;
      generalDueAt = addMinutes(currentApplication.appliedAt, interval);
      activeRuleIds.push(
        "RR-P0-ELIGIBILITY-001",
        "RR-P0-GENERAL-001",
        interval < GENERAL_MAX_MINUTES
          ? "RR-P0-GENERAL-002"
          : "RR-P0-GENERAL-003"
      );
      derivedRefs.push(currentApplication.id);

      if (
        snapshot.preExposureWaitStatus === "explicit_minutes" &&
        snapshot.preExposureWaitMinutes !== null
      ) {
        const labelReadyAt = addMinutes(
          currentApplication.appliedAt,
          snapshot.preExposureWaitMinutes
        );
        if (trustedNowMs < Date.parse(labelReadyAt)) {
          activeLabelReadyAt = labelReadyAt;
          activeRuleIds.push("RR-P0-LABEL-WAIT-001");
          reasonCodes.push("LABEL_WAIT_ACTIVE");
        }
      }
    }

    const activeWaterInterval = last(
      waterIntervals.filter(
        (interval) =>
          interval.end === null &&
          interval.start.zoneInstanceIds.includes(zoneId)
      )
    );
    let activeWaterDeadline: string | null = null;
    let activeWaterStartedAt: string | null = null;
    if (
      applicable &&
      activeWaterInterval !== null &&
      activeWaterInterval.start.startConfidence === "confirmed" &&
      activeWaterInterval.start.activityStartedAt !== null &&
      !activeSafetyBlock
    ) {
      const startedAt = activeWaterInterval.start.activityStartedAt;
      const intervalApplication = last(
        applicationSelection.candidates
          .filter(
            (application) =>
              Date.parse(application.appliedAt) <= Date.parse(startedAt) &&
              application.productLabelSnapshot.ruleEligibilityAtApplication ===
                "eligible"
          )
          .sort(compareApplicationOrder)
      );
      const waterMinutes =
        intervalApplication?.productLabelSnapshot.waterResistanceMinutes ??
        null;
      const intervalSafety =
        intervalApplication === null
          ? { reasons: [], refs: [] }
          : activeSafetyReasons(
              zoneId,
              intervalApplication,
              stream.productSafetyEvents
            );
      if (
        intervalApplication !== null &&
        waterMinutes !== null &&
        intervalSafety.reasons.length === 0
      ) {
        activeWaterDeadline = addMinutes(startedAt, waterMinutes);
        activeWaterStartedAt = startedAt;
        activeRuleIds.push("RR-P0-WATER-001");
        derivedRefs.push(activeWaterInterval.start.id, intervalApplication.id);
      } else if (
        intervalApplication !== null &&
        intervalApplication.productLabelSnapshot.waterResistanceStatus ===
          "unknown"
      ) {
        reasonCodes.push("WATER_RESISTANCE_UNKNOWN");
      }
    }

    const causeResetAt = latestCauseResettingApplication(
      zoneId,
      stream.applicationEvents
    );
    const causeEvents = stream.contextEvents.filter((event) => {
      if (event.contextType === "context_changed") return false;
      if (!event.zoneInstanceIds.includes(zoneId)) return false;
      if (
        event.contextType === "water_start" &&
        event.startConfidence === "confirmed"
      ) {
        return false;
      }
      /*
       * `causeResetAt === null` 時所有原因都成立——那是「這個部位從來沒有
       * 一次能開始倒數的塗抹」，沒有任何一層防曬被換掉過，所以沒有東西可以
       * 取代先前的損耗。
       */
      return (
        causeResetAt === null ||
        Date.parse(event.effectiveOccurredAt) >=
          Date.parse(causeResetAt.appliedAt)
      );
    });
    const causesApplicable = applicable && tracking.trackingStatus === "active";
    const applicableCauses = causesApplicable ? causeEvents : [];
    const timedCauses = applicableCauses.filter(
      (event) => event.contextType !== "water_start"
    );
    const untimedCauses = applicableCauses.filter(
      (event) =>
        event.contextType === "water_start" &&
        event.startConfidence === "unknown"
    );
    const eventTriggeredDeadline = minInstant(
      timedCauses.map((event) => event.effectiveOccurredAt)
    );
    for (const event of applicableCauses) {
      const reason = causeReason(event);
      if (reason !== null) reasonCodes.push(reason);
      derivedRefs.push(event.id);
    }
    if (timedCauses.length > 0) {
      activeRuleIds.push("RR-P0-CAUSE-001", "RR-P0-CAUSE-002");
    }
    if (untimedCauses.length > 0) {
      activeRuleIds.push("RR-P0-WATER-002");
    }

    const zoneDueAt = minInstant([
      generalDueAt,
      activeWaterDeadline,
      eventTriggeredDeadline
    ]);
    const zoneTimerStartedAt =
      zoneDueAt === null
        ? null
        : zoneDueAt === generalDueAt
          ? (currentApplication?.appliedAt ?? null)
          : zoneDueAt === activeWaterDeadline
            ? activeWaterStartedAt
            : zoneDueAt === eventTriggeredDeadline
              ? eventTriggeredDeadline
              : null;
    const zoneNextActionAt = minInstant([activeLabelReadyAt, zoneDueAt]);
    if (generalDueAt !== null && Date.parse(generalDueAt) <= trustedNowMs) {
      reasonCodes.push("GENERAL_INTERVAL_REACHED");
    }
    if (
      activeWaterDeadline !== null &&
      Date.parse(activeWaterDeadline) <= trustedNowMs
    ) {
      reasonCodes.push("WATER_INTERVAL_REACHED");
    }
    if (method.skinExposureStatus === "clothing_covered") {
      reasonCodes.push("CLOTHING_COVERED");
      activeRuleIds.push("RR-P0-CLOTHING-001");
    }

    let timingStatus: ZoneProjection["timingStatus"];
    /*
     * 2026-08-30：這裡原本也是 `!== "eligible"`，是「不知道標示就沒有倒
     * 數」的第二道閘門——期限算得出來，但 timingStatus 仍被壓成
     * untimed_action，畫面顯示「需要補充資料」而不是倒數。
     *
     * 兩處必須用同一個判斷，否則會出現「有 generalDueAt 卻顯示未計時」
     * 這種前後不一致的狀態。
     */
    const invalidTopical =
      isTopical(method.methodComponents) &&
      (currentApplication === null ||
        currentEligibility === null ||
        blocksGeneralDeadline(currentEligibility));
    if (ended || tracking.trackingStatus === "ended") {
      timingStatus = "not_applicable";
    } else if (method.skinExposureStatus === "clothing_covered") {
      timingStatus = "not_applicable";
    } else if (
      activeSafetyBlock ||
      recordStatus === "unrecorded" ||
      recordStatus === "none_reported" ||
      recordStatus === "unknown" ||
      invalidTopical ||
      untimedCauses.length > 0
    ) {
      timingStatus = "untimed_action";
    } else if (zoneDueAt !== null && trustedNowMs >= Date.parse(zoneDueAt)) {
      timingStatus = "reapply_due";
    } else if (
      activeLabelReadyAt !== null &&
      trustedNowMs < Date.parse(activeLabelReadyAt)
    ) {
      timingStatus = "label_wait";
    } else if (
      zoneDueAt !== null &&
      Date.parse(zoneDueAt) - trustedNowMs <= SOON_WINDOW_MS
    ) {
      timingStatus = "reapply_soon";
    } else if (zoneDueAt !== null) {
      timingStatus = "tracking";
    } else {
      timingStatus = "not_applicable";
    }

    zones.push({
      sessionId: stream.sessionStarted.sessionId,
      zoneInstanceId: zoneId,
      bodyZoneCode: method.bodyZoneCode,
      customLabel: method.customLabel,
      trackingStatus: tracking.trackingStatus,
      skinExposureStatus: method.skinExposureStatus,
      methodCertainty: method.methodCertainty,
      methodComponents: method.methodComponents,
      currentActivationSequence: applicationSelection.activationSequence,
      currentApplicationId: currentApplication?.id ?? null,
      currentApplicationEligibility: currentEligibility,
      activeProductSafetyBlock: activeSafetyBlock,
      recordStatus,
      timingStatus,
      activeLabelReadyAt,
      generalDueAt,
      activeWaterDeadline,
      eventTriggeredDeadline,
      zoneDueAt,
      zoneTimerStartedAt,
      zoneNextActionAt,
      activeCauseRefs: causeEvents.map((event) => event.id),
      activeRuleIds: uniqueStable(activeRuleIds),
      reasonCodes: uniqueStable(reasonCodes),
      derivedFromEventRefs: uniqueStable(derivedRefs)
    });
  }

  zones.sort(
    (left, right) =>
      zoneOrder(left.bodyZoneCode) - zoneOrder(right.bodyZoneCode) ||
      left.zoneInstanceId.localeCompare(right.zoneInstanceId)
  );
  const sessionNextDueAt = minInstant(
    zones
      .filter((zone) => zone.trackingStatus === "active")
      .map((zone) => zone.zoneDueAt)
  );
  const attention = zones.some(
    (zone) =>
      zone.trackingStatus === "active" &&
      (zone.timingStatus === "untimed_action" ||
        zone.timingStatus === "reapply_due")
  );
  const overallStatus: SessionProjection["overallStatus"] = ended
    ? "ended"
    : attention
      ? "attention_required"
      : "tracking";
  const primaryAction = derivePrimaryAction(zones, input.clock, ended);

  return {
    sessionId: stream.sessionStarted.sessionId,
    rulesetVersion: stream.sessionStarted.rulesetVersion,
    revision: input.revision,
    overallStatus,
    sessionNextDueAt,
    zones,
    primaryAction,
    derivedFromEventRefs: uniqueStable([
      stream.sessionStarted.id,
      ...zones.flatMap((zone) => zone.derivedFromEventRefs),
      ...endedEvents.map((event) => event.id)
    ])
  };
}

export function reduceZone(input: {
  stream: SessionEventStreamV1;
  revision: number;
  clock: ReducerClock;
  zoneInstanceId: string;
}): ZoneProjection {
  const projection = reduceSession(input);
  const zone = projection.zones.find(
    (candidate) => candidate.zoneInstanceId === input.zoneInstanceId
  );
  if (zone === undefined) {
    throw new DomainInvariantError(
      "INVALID_EVENT_STREAM",
      `找不到部位 ${input.zoneInstanceId}`
    );
  }
  return zone;
}
