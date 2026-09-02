import {
  COMMAND_SCHEMA_VERSION,
  fingerprintProductLabelSnapshot,
  ReapplyCommandV1Schema,
  ReportContextEventCommandV1Schema,
  type ProductLabelSnapshotV1,
  type ReapplyCommandV1,
  type SessionProjection
} from "@sunshield/contracts";
import type {
  ContextEventRepositoryPort,
  DeviceIdentityPort,
  LocalIdentityPort,
  ReapplicationRepositoryPort
} from "@sunshield/platform";
import { shallowReadonly, shallowRef, type ShallowRef } from "vue";
import type { AppBootController } from "../../app/createAppBootController";

export type ReapplicationPhase =
  "idle" | "loading" | "ready" | "submitting" | "success" | "error";
export type ReapplicationError =
  | "validation"
  | "state_changed"
  | "product_changed"
  | "persistence"
  | "refresh_failed"
  | "not_found"
  | null;

export interface ReapplicationProductChoice {
  choiceId: string;
  displayName: string;
  sourceProductId: string | null;
  snapshotFingerprint: string;
  snapshot: ProductLabelSnapshotV1;
  selectable: boolean;
  restriction: string | null;
}

export interface ReapplicationSuccess {
  groupId: string;
  zoneIds: string[];
  appliedAt: string;
  productGroups: Array<{ displayName: string; zoneIds: string[] }>;
  committedRevision: number;
}

export interface ReapplicationController {
  phase: Readonly<ShallowRef<ReapplicationPhase>>;
  session: Readonly<ShallowRef<SessionProjection | null>>;
  suggestedZoneIds: Readonly<ShallowRef<string[]>>;
  reason: Readonly<ShallowRef<ReapplyReason | null>>;
  selectedZoneIds: Readonly<ShallowRef<string[]>>;
  productChoices: Readonly<ShallowRef<ReapplicationProductChoice[]>>;
  assignments: Readonly<ShallowRef<Record<string, string>>>;
  appliedAt: Readonly<ShallowRef<string>>;
  referenceNow: Readonly<ShallowRef<string>>;
  fieldErrors: Readonly<ShallowRef<Record<string, string[]>>>;
  error: Readonly<ShallowRef<ReapplicationError>>;
  success: Readonly<ShallowRef<ReapplicationSuccess | null>>;
  load(): Promise<void>;
  selectSuggested(): void;
  setReason(value: ReapplyReason | null): void;
  selectAll(): void;
  toggleZone(zoneId: string): void;
  assignProduct(zoneId: string, choiceId: string): void;
  setAppliedAt(value: string): void;
  setQuickTime(minutesAgo: number): void;
  submit(): Promise<boolean>;
  refreshCommitted(): Promise<boolean>;
  resetError(): void;
  dispose(): void;
}

/**
 * 補擦的原因（2026-09-02，`2026-09-02-event-means-reapply.md` 階段一）。
 *
 * `null` 是「時間到了」——沒有損耗事件，只是例行補擦。其餘四種會在補擦之前
 * 先寫下一筆損耗事件。
 *
 * **不含「離水」是刻意的。** 離水不只是一個原因，它還會關閉一段水中區間
 * （需要 `activityIntervalId`），那是狀態轉換而不是註記。它留在「記錄狀況」
 * 流程，而那條路 2026-09-02（#108）之後本來就能直接接著補擦。
 */
export type ReapplyReason = "heavy_sweat" | "towel" | "friction" | "hand_wash";

/**
 * 損耗事件要比塗抹時間早多久。
 *
 * 一分鐘。理由不是美觀：reducer 的條件是 `事件時間 >= 最新塗抹時間`，相同時
 * 事件依然成立、期限被拉到那一刻，補完立刻又到期。往前挪也符合現實——先流汗，
 * 才去補擦。
 */
const REASON_LEAD_MS = 60_000;

interface Dependencies {
  repository: ReapplicationRepositoryPort & ContextEventRepositoryPort;
  identity: LocalIdentityPort & DeviceIdentityPort;
  boot: AppBootController;
  createId(): string;
  now(): Date;
  getConnectivity(): "online" | "offline";
}

export function createReapplicationController(
  dependencies: Dependencies
): ReapplicationController {
  const phase = shallowRef<ReapplicationPhase>("idle");
  const session = shallowRef<SessionProjection | null>(null);
  const suggestedZoneIds = shallowRef<string[]>([]);
  const reason = shallowRef<ReapplyReason | null>(null);
  /**
   * 原因事件送出後的 revision。
   *
   * **重試時不能再送一次事件。** 送出分成兩段（先事件、後補擦），第二段失敗
   * 而使用者重試時，第一段已經成功了——記著它才不會寫出兩筆流汗。
   */
  let committedReasonRevision: number | null = null;
  const selectedZoneIds = shallowRef<string[]>([]);
  const productChoices = shallowRef<ReapplicationProductChoice[]>([]);
  const assignments = shallowRef<Record<string, string>>({});
  const appliedAt = shallowRef("");
  const referenceNow = shallowRef("");
  const fieldErrors = shallowRef<Record<string, string[]>>({});
  const error = shallowRef<ReapplicationError>(null);
  const success = shallowRef<ReapplicationSuccess | null>(null);
  let pendingCommand: ReapplyCommandV1 | null = null;
  let disposed = false;

  async function load(): Promise<void> {
    if (disposed) return;
    phase.value = "loading";
    error.value = null;
    let context;
    try {
      const visitorId = await dependencies.identity.getOrCreateLocalVisitorId();
      context =
        await dependencies.repository.getReapplicationContext(visitorId);
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
    const choices = new Map<string, ReapplicationProductChoice>();
    for (const product of context.products) {
      choices.set(`product:${product.productId}`, {
        choiceId: `product:${product.productId}`,
        displayName: product.displayName,
        sourceProductId: product.productId,
        snapshotFingerprint: product.snapshotFingerprint,
        snapshot: product.currentSnapshot,
        selectable: product.status === "active",
        restriction:
          product.currentSnapshot.ruleEligibilityAtApplication === "eligible"
            ? null
            : "這項裝備只會保留使用紀錄，不會建立補擦倒數。"
      });
    }
    const nextAssignments: Record<string, string> = {};
    for (const application of context.currentApplications) {
      const savedChoiceId =
        application.sourceProductId === null
          ? null
          : `product:${application.sourceProductId}`;
      const choiceId =
        savedChoiceId !== null &&
        choices.get(savedChoiceId)?.snapshotFingerprint ===
          application.productSnapshotFingerprint
          ? savedChoiceId
          : `session:${fingerprintProductLabelSnapshot(application.productLabelSnapshot)}`;
      if (!choices.has(choiceId)) {
        choices.set(choiceId, {
          choiceId,
          displayName: "本次使用的防曬乳",
          sourceProductId: null,
          snapshotFingerprint: fingerprintProductLabelSnapshot(
            application.productLabelSnapshot
          ),
          snapshot: application.productLabelSnapshot,
          selectable: true,
          restriction:
            application.productLabelSnapshot.ruleEligibilityAtApplication ===
            "eligible"
              ? null
              : "這項裝備只會保留使用紀錄，不會建立補擦倒數。"
        });
      }
      for (const zoneId of application.zoneInstanceIds)
        nextAssignments[zoneId] = choiceId;
    }
    productChoices.value = [...choices.values()];
    assignments.value = nextAssignments;
    const suggested = context.session.zones
      .filter(
        (zone) =>
          zone.trackingStatus === "active" &&
          zone.methodComponents.some(
            (component) =>
              component === "sunscreen" || component === "other_topical"
          ) &&
          (zone.timingStatus === "reapply_due" ||
            zone.timingStatus === "reapply_soon")
      )
      .map((zone) => zone.zoneInstanceId);
    // 沒有 reapply_due／reapply_soon 部位時，退回 primaryAction 指定的部位。
    // 不得再以「已有既有 Application」過濾：`complete_protection_record`
    // （recordStatus === "unrecorded"）的部位本來就沒有 Application，
    // 過濾掉會讓首次記錄變體開啟時零選取，使用者得自己找回該選哪些部位。
    // 未指派產品的部位仍會在 submit 時被擋下並顯示就近錯誤，不會靜默送出。
    suggestedZoneIds.value =
      suggested.length > 0
        ? suggested
        : context.session.primaryAction.affectedZoneInstanceIds;
    selectedZoneIds.value = [...suggestedZoneIds.value];
    reason.value = null;
    committedReasonRevision = null;
    referenceNow.value = dependencies.now().toISOString();
    appliedAt.value = referenceNow.value;
    pendingCommand = null;
    phase.value = "ready";
  }

  /**
   * 換原因會作廢已建好的補擦命令：原因會決定要不要先送事件，而事件會推進
   * revision，`pendingCommand` 裡的 `expectedRevision` 因此不再有效。
   */
  function setReason(value: ReapplyReason | null): void {
    reason.value = value;
    pendingCommand = null;
  }

  function selectSuggested(): void {
    selectedZoneIds.value = [...suggestedZoneIds.value];
    pendingCommand = null;
  }
  function selectAll(): void {
    selectedZoneIds.value =
      session.value?.zones
        .filter(
          (zone) =>
            zone.trackingStatus === "active" &&
            zone.methodComponents.some(
              (component) =>
                component === "sunscreen" || component === "other_topical"
            )
        )
        .map((zone) => zone.zoneInstanceId) ?? [];
    pendingCommand = null;
  }
  function toggleZone(zoneId: string): void {
    selectedZoneIds.value = selectedZoneIds.value.includes(zoneId)
      ? selectedZoneIds.value.filter((id) => id !== zoneId)
      : [...selectedZoneIds.value, zoneId];
    pendingCommand = null;
  }
  function assignProduct(zoneId: string, choiceId: string): void {
    assignments.value = { ...assignments.value, [zoneId]: choiceId };
    pendingCommand = null;
  }
  function setAppliedAt(value: string): void {
    appliedAt.value = value;
    pendingCommand = null;
  }
  function setQuickTime(minutesAgo: number): void {
    const now = dependencies.now();
    referenceNow.value = now.toISOString();
    setAppliedAt(new Date(now.getTime() - minutesAgo * 60_000).toISOString());
  }

  async function submit(): Promise<boolean> {
    if (
      session.value === null ||
      phase.value === "submitting" ||
      success.value !== null
    )
      return false;
    const errors: Record<string, string[]> = {};
    if (selectedZoneIds.value.length === 0)
      errors.zones = ["請至少選擇一個實際補擦的部位。"];
    for (const zoneId of selectedZoneIds.value) {
      const choice = productChoices.value.find(
        (item) => item.choiceId === assignments.value[zoneId]
      );
      if (choice === undefined || !choice.selectable)
        errors[`product.${zoneId}`] = ["請選擇這個部位目前可使用的防曬乳。"];
    }
    const appliedAtMs = Date.parse(appliedAt.value);
    if (
      !Number.isFinite(appliedAtMs) ||
      appliedAtMs > dependencies.now().getTime()
    )
      errors.appliedAt = ["實際塗抹時間不能晚於目前時間。"];
    if (Object.keys(errors).length > 0) {
      fieldErrors.value = errors;
      error.value = "validation";
      return false;
    }
    phase.value = "submitting";
    fieldErrors.value = {};

    /*
     * 有原因時先寫下損耗事件，再寫補擦。
     *
     * **不做成單一合併命令是刻意的**（`2026-09-02-event-means-reapply.md`
     * 第五節）：中間狀態本來就合法——「記錄了事件、還沒補擦」正是這個 App
     * 既有的產品狀態。第二段失敗時使用者落在一個有意義的地方，不是半筆爛帳，
     * 所以兩段交易就夠，不需要動 contracts／domain／persistence 三層。
     */
    let revision = session.value.revision;
    if (reason.value !== null && committedReasonRevision === null) {
      const reasonResult = await submitReason(revision);
      if (reasonResult === null) return false;
      committedReasonRevision = reasonResult;
    }
    if (committedReasonRevision !== null) revision = committedReasonRevision;

    if (pendingCommand === null) pendingCommand = await buildCommand(revision);
    let result;
    try {
      result = await dependencies.repository.reapply(pendingCommand, {
        status: "trusted",
        trustedNow: dependencies.now().toISOString(),
        connectivity: dependencies.getConnectivity()
      });
    } catch {
      error.value = "persistence";
      phase.value = "error";
      return false;
    }
    if (!result.ok) {
      if (result.code === "PERSISTENCE_ERROR") error.value = "persistence";
      else if (result.code === "PRODUCT_CONFLICT") {
        error.value = "product_changed";
        pendingCommand = null;
      } else if (result.code === "NOT_FOUND") {
        error.value = "not_found";
        pendingCommand = null;
      } else if (
        result.code === "REVISION_CONFLICT" ||
        result.code === "CLIENT_SEQUENCE_CONFLICT"
      ) {
        error.value = "state_changed";
        pendingCommand = null;
      } else error.value = "validation";
      phase.value = "error";
      return false;
    }
    const committedCommand = pendingCommand;
    pendingCommand = null;
    committedReasonRevision = null;
    success.value = {
      groupId: committedCommand.payload.applicationConfirmationId,
      zoneIds: [...selectedZoneIds.value],
      appliedAt: committedCommand.payload.appliedAt,
      productGroups: committedCommand.payload.applications.map(
        (application) => ({
          displayName:
            productChoices.value.find(
              (choice) =>
                choice.snapshotFingerprint ===
                  application.productSnapshotFingerprint &&
                choice.sourceProductId === application.sourceProductId
            )?.displayName ?? "本次使用的防曬乳",
          zoneIds: application.zoneInstanceIds
        })
      ),
      committedRevision: result.revision ?? session.value.revision + 1
    };
    try {
      await dependencies.boot.refresh();
      if (dependencies.boot.currentSession.value?.revision !== result.revision)
        error.value = "refresh_failed";
    } catch {
      error.value = "refresh_failed";
    }
    phase.value = "success";
    return true;
  }

  async function refreshCommitted(): Promise<boolean> {
    if (success.value === null) return false;
    try {
      await dependencies.boot.refresh();
      if (
        (dependencies.boot.currentSession.value?.revision ?? 0) >=
        success.value.committedRevision
      ) {
        error.value = null;
        return true;
      }
    } catch {
      /* committed receipt stays authoritative */
    }
    error.value = "refresh_failed";
    return false;
  }

  async function buildCommand(revision: number): Promise<ReapplyCommandV1> {
    const [visitorId, deviceId] = await Promise.all([
      dependencies.identity.getOrCreateLocalVisitorId(),
      dependencies.identity.getOrCreateDeviceLocalId()
    ]);
    const groups = new Map<
      string,
      { choice: ReapplicationProductChoice; zoneIds: string[] }
    >();
    for (const zoneId of selectedZoneIds.value) {
      const choiceId = assignments.value[zoneId]!;
      const choice = productChoices.value.find(
        (item) => item.choiceId === choiceId
      )!;
      const group = groups.get(choiceId) ?? { choice, zoneIds: [] };
      group.zoneIds.push(zoneId);
      groups.set(choiceId, group);
    }
    return ReapplyCommandV1Schema.parse({
      commandVersion: COMMAND_SCHEMA_VERSION,
      commandType: "record_reapplication",
      commandId: dependencies.createId(),
      idempotencyKey: dependencies.createId(),
      owner: { type: "guest", localVisitorId: visitorId },
      deviceLocalId: deviceId,
      sessionId: session.value!.sessionId,
      clientSequence: revision + 1,
      clientCreatedAt: dependencies.now().toISOString(),
      expectedRevision: revision,
      payload: {
        applicationConfirmationId: dependencies.createId(),
        appliedAt: new Date(appliedAt.value).toISOString(),
        applications: [...groups.values()].map(({ choice, zoneIds }) => ({
          eventId: dependencies.createId(),
          zoneInstanceIds: zoneIds,
          sourceProductId: choice.sourceProductId,
          productSnapshotFingerprint: choice.snapshotFingerprint,
          productLabelSnapshot: choice.snapshot
        }))
      }
    });
  }

  /**
   * 送出損耗事件。成功回傳新的 revision，失敗回傳 null（並已設好錯誤狀態）。
   *
   * **事件時間必須嚴格早於塗抹時間。** reducer 判斷損耗事件還算不算數的條件
   * 是 `事件時間 >= 最新塗抹時間`（`reducer.ts` 的 causeEvents 過濾），所以
   * 兩者相同時事件依然成立，期限被拉到那一刻——**補完立刻又到期**。這一點
   * 用 `packages/domain` 的純函式實測過，數據見
   * `docs/decisions/2026-09-02-event-means-reapply.md` 第二節。
   *
   * 往前挪一分鐘也符合現實：使用者是先流汗、才去補擦。
   */
  async function submitReason(revision: number): Promise<number | null> {
    const kind = reason.value;
    if (kind === null || session.value === null) return null;

    const [visitorId, deviceId] = await Promise.all([
      dependencies.identity.getOrCreateLocalVisitorId(),
      dependencies.identity.getOrCreateDeviceLocalId()
    ]);
    const occurredAt = new Date(
      Date.parse(appliedAt.value) - REASON_LEAD_MS
    ).toISOString();

    const command = ReportContextEventCommandV1Schema.parse({
      commandVersion: COMMAND_SCHEMA_VERSION,
      commandType: "report_context_event",
      commandId: dependencies.createId(),
      idempotencyKey: dependencies.createId(),
      owner: { type: "guest", localVisitorId: visitorId },
      deviceLocalId: deviceId,
      sessionId: session.value.sessionId,
      clientSequence: revision + 1,
      clientCreatedAt: dependencies.now().toISOString(),
      expectedRevision: revision,
      payload: {
        eventId: dependencies.createId(),
        effectiveOccurredAt: occurredAt,
        detail: {
          contextType: kind,
          zoneInstanceIds: [...selectedZoneIds.value]
        }
      }
    });

    let result;
    try {
      result = await dependencies.repository.reportContextEvent(command, {
        status: "trusted",
        trustedNow: dependencies.now().toISOString(),
        connectivity: dependencies.getConnectivity()
      });
    } catch {
      error.value = "persistence";
      phase.value = "error";
      return null;
    }
    if (!result.ok) {
      error.value =
        result.code === "NOT_FOUND"
          ? "not_found"
          : result.code === "REVISION_CONFLICT" ||
              result.code === "CLIENT_SEQUENCE_CONFLICT"
            ? "state_changed"
            : "validation";
      phase.value = "error";
      return null;
    }
    return result.revision ?? revision + 1;
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
    suggestedZoneIds: shallowReadonly(suggestedZoneIds),
    selectedZoneIds: shallowReadonly(selectedZoneIds),
    reason: shallowReadonly(reason),
    setReason,
    productChoices: shallowReadonly(productChoices),
    assignments: shallowReadonly(assignments),
    appliedAt: shallowReadonly(appliedAt),
    referenceNow: shallowReadonly(referenceNow),
    fieldErrors: shallowReadonly(fieldErrors),
    error: shallowReadonly(error),
    success: shallowReadonly(success),
    load,
    selectSuggested,
    selectAll,
    toggleZone,
    assignProduct,
    setAppliedAt,
    setQuickTime,
    submit,
    refreshCommitted,
    resetError,
    dispose
  };
}
