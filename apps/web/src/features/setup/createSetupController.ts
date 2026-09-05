import {
  BODY_ZONE_SCHEMA_VERSION,
  COMMAND_SCHEMA_VERSION,
  DEFAULT_RULESET_VERSION,
  SETUP_DRAFT_SCHEMA_VERSION,
  SetupDraftZoneV1Schema,
  SetupDraftV1Schema,
  StartSessionCommandV1Schema,
  type CommandResult,
  type ProductLabelSnapshotV1,
  type ReducerClock,
  type SessionContext,
  type SessionProjection,
  type SetupDraftStep,
  type SetupDraftV1,
  type SetupDraftZoneV1,
  type StartSessionCommandV1
} from "@sunshield/contracts";
import {
  makeSessionOnlyProductSnapshot,
  type ProductClaimAnswer
} from "./productSnapshot";
import type {
  DeviceIdentityPort,
  LocalIdentityPort,
  ProductSettingsPort,
  SessionCommandRepositoryPort,
  SetupDraftRepositoryPort
} from "@sunshield/platform";
import {
  computed,
  shallowReadonly,
  shallowRef,
  type ComputedRef,
  type ShallowRef
} from "vue";
import type { AppBootController } from "../../app/createAppBootController";
import { makeQuickProtectionDraft } from "./setupCatalog";

const DRAFT_TTL_MS = 24 * 60 * 60 * 1_000;

export type SetupPhase = "idle" | "loading" | "ready" | "submitting" | "error";

export type SetupSaveStatus = "idle" | "saving" | "saved" | "error";

export type SetupSubmitError =
  "validation_error" | "active_session_conflict" | "persistence_error" | null;

export interface ProtectionDraftInput {
  zones: SetupDraftZoneV1[];
  setupEntryMode: SetupDraftV1["setupEntryMode"];
  suggestedPresetId: string | null;
  suggestedPresetVersion: string | null;
  presetDecision: SetupDraftV1["presetDecision"];
}

export interface WaterStartFormValue {
  confidence: "confirmed" | "unknown";
  activityStartedAt: string | null;
}

export interface TimingDraftInput {
  productLabelSnapshot?: ProductLabelSnapshotV1;
  /**
   * 步驟 2 的單題快速確認。四題包裝標示裡只有這一題會決定能不能
   * 產生倒數，其餘三題都接受「不確定」，因此併進流程內問，
   * 不必為了開始提醒先跳到產品頁。快照由控制器以可信時鐘建立。
   */
  sunscreenClaim?: ProductClaimAnswer;
  appliedAt: string;
  waterStart: WaterStartFormValue | null;
}

export interface SetupController {
  readonly phase: Readonly<ShallowRef<SetupPhase>>;
  readonly saveStatus: Readonly<ShallowRef<SetupSaveStatus>>;
  readonly draft: Readonly<ShallowRef<SetupDraftV1 | null>>;
  readonly recoveryPending: Readonly<ShallowRef<boolean>>;
  readonly applicationTime: Readonly<ShallowRef<string | null>>;
  readonly waterStart: Readonly<ShallowRef<WaterStartFormValue | null>>;
  readonly fieldErrors: Readonly<ShallowRef<Record<string, string[]>>>;
  readonly submitError: Readonly<ShallowRef<SetupSubmitError>>;
  readonly hasTopicalZones: ComputedRef<boolean>;
  ensureLoaded(): Promise<void>;
  resumeDraft(): void;
  restartDraft(): Promise<void>;
  recommendedResumeStep(): SetupDraftStep;
  ensureRecommendedProtection(): Promise<boolean>;
  saveContext(context: SessionContext): Promise<boolean>;
  saveProtection(input: ProtectionDraftInput): Promise<boolean>;
  savePendingTiming(input: TimingDraftInput): Promise<boolean>;
  saveTiming(input: TimingDraftInput): Promise<boolean>;
  cancel(): Promise<void>;
  submit(): Promise<CommandResult<SessionProjection>>;
  dispose(): void;
}

export interface SetupControllerDependencies {
  draftRepository: SetupDraftRepositoryPort;
  productSettings?: ProductSettingsPort;
  sessionRepository: SessionCommandRepositoryPort;
  identity: LocalIdentityPort & DeviceIdentityPort;
  boot: AppBootController;
  createId(): string;
  now(): Date;
  getConnectivity(): ReducerClock["connectivity"];
}

export function createSetupController(
  dependencies: SetupControllerDependencies
): SetupController {
  const phaseState = shallowRef<SetupPhase>("idle");
  const saveStatusState = shallowRef<SetupSaveStatus>("idle");
  const draftState = shallowRef<SetupDraftV1 | null>(null);
  const recoveryPendingState = shallowRef(false);
  const applicationTimeState = shallowRef<string | null>(null);
  const waterStartState = shallowRef<WaterStartFormValue | null>(null);
  const fieldErrorsState = shallowRef<Record<string, string[]>>({});
  const submitErrorState = shallowRef<SetupSubmitError>(null);
  const hasTopicalZones = computed(
    () => draftState.value?.zones.some(hasTopicalMethod) ?? false
  );

  let loadPromise: Promise<void> | null = null;
  let loaded = false;
  let disposed = false;
  let localVisitorId: string | null = null;
  let deviceLocalId: string | null = null;
  let pendingCommand: StartSessionCommandV1 | null = null;

  async function ensureIdentities(): Promise<void> {
    if (localVisitorId !== null && deviceLocalId !== null) return;
    [localVisitorId, deviceLocalId] = await Promise.all([
      dependencies.identity.getOrCreateLocalVisitorId(),
      dependencies.identity.getOrCreateDeviceLocalId()
    ]);
  }

  async function performLoad(): Promise<void> {
    phaseState.value = "loading";
    fieldErrorsState.value = {};
    submitErrorState.value = null;

    try {
      await ensureIdentities();
      const ownerKey = ownerKeyFor(localVisitorId!);
      const storedDraft = await dependencies.draftRepository.getActiveDraft(
        ownerKey,
        dependencies.now().toISOString()
      );

      if (storedDraft === null) {
        draftState.value = makeEmptyDraft(ownerKey);
        recoveryPendingState.value = false;
      } else {
        draftState.value = storedDraft;
        applicationTimeState.value =
          storedDraft.pendingTiming?.appliedAt ?? null;
        waterStartState.value = storedDraft.pendingTiming?.waterStart ?? null;
        recoveryPendingState.value = true;
      }
      loaded = true;
      phaseState.value = "ready";
    } catch {
      phaseState.value = "error";
      saveStatusState.value = "error";
    }
  }

  function ensureLoaded(): Promise<void> {
    if (disposed || loaded) return Promise.resolve();
    if (loadPromise === null) {
      loadPromise = performLoad().finally(() => {
        loadPromise = null;
      });
    }
    return loadPromise;
  }

  function makeEmptyDraft(ownerKey: string): SetupDraftV1 {
    const timestamp = dependencies.now();
    const createdAt = timestamp.toISOString();
    return SetupDraftV1Schema.parse({
      schemaVersion: SETUP_DRAFT_SCHEMA_VERSION,
      id: ownerKey,
      localDraftFlowId: dependencies.createId(),
      ownerKey,
      currentStep: "context",
      bodyZoneSchemaVersion: BODY_ZONE_SCHEMA_VERSION,
      setupEntryMode: "quick_preset",
      suggestedPresetId: null,
      suggestedPresetVersion: null,
      presetDecision: null,
      initialContext: null,
      initialShade: null,
      zones: [],
      applications: [],
      pendingTiming: null,
      createdAt,
      updatedAt: createdAt,
      expiresAt: new Date(timestamp.getTime() + DRAFT_TTL_MS).toISOString()
    });
  }

  async function persistDraft(partialDraft: SetupDraftV1): Promise<boolean> {
    const timestamp = dependencies.now();
    const parsed = SetupDraftV1Schema.safeParse({
      ...partialDraft,
      updatedAt: timestamp.toISOString(),
      expiresAt: new Date(timestamp.getTime() + DRAFT_TTL_MS).toISOString()
    });

    if (!parsed.success) {
      fieldErrorsState.value = issuesToFieldErrors(parsed.error.issues);
      return false;
    }

    pendingCommand = null;
    draftState.value = parsed.data;
    saveStatusState.value = "saving";
    try {
      await dependencies.draftRepository.saveDraft(parsed.data);
      saveStatusState.value = "saved";
      return true;
    } catch {
      saveStatusState.value = "error";
      return false;
    }
  }

  function resumeDraft(): void {
    recoveryPendingState.value = false;
  }

  async function restartDraft(): Promise<void> {
    await ensureIdentities();
    const ownerKey = ownerKeyFor(localVisitorId!);
    const nextDraft = makeEmptyDraft(ownerKey);
    applicationTimeState.value = null;
    waterStartState.value = null;
    fieldErrorsState.value = {};
    submitErrorState.value = null;
    recoveryPendingState.value = false;
    await persistDraft(nextDraft);
  }

  function recommendedResumeStep(): SetupDraftStep {
    const draft = draftState.value;
    if (draft?.initialContext === null || draft === null) return "context";
    if (draft.zones.length === 0 || draft.zones.some(hasTopicalMethod)) {
      return "timing";
    }
    return "review";
  }

  async function ensureRecommendedProtection(): Promise<boolean> {
    const draft = requireDraft();
    if (draft.zones.length > 0) return true;
    if (draft.initialContext === null) return false;

    const recommendation = makeQuickProtectionDraft(draft.initialContext);
    return saveProtection({
      ...recommendation,
      presetDecision: "accepted"
    });
  }

  async function saveContext(context: SessionContext): Promise<boolean> {
    const draft = requireDraft();
    fieldErrorsState.value = {};
    submitErrorState.value = null;
    const contextChanged =
      draft.initialContext !== null && draft.initialContext !== context;
    const needsQuickProtection = contextChanged || draft.zones.length === 0;
    const quickProtection = needsQuickProtection
      ? makeQuickProtectionDraft(context)
      : null;

    if (contextChanged) {
      applicationTimeState.value = null;
      waterStartState.value = null;
    }

    return persistDraft({
      ...draft,
      currentStep: "timing",
      initialContext: context,
      initialShade: "unknown",
      ...(needsQuickProtection && quickProtection !== null
        ? {
            zones: [],
            applications: [],
            pendingTiming: null,
            setupEntryMode: quickProtection.setupEntryMode,
            suggestedPresetId: quickProtection.suggestedPresetId,
            suggestedPresetVersion: quickProtection.suggestedPresetVersion,
            presetDecision: null
          }
        : {})
    });
  }

  async function saveProtection(input: ProtectionDraftInput): Promise<boolean> {
    const draft = requireDraft();
    fieldErrorsState.value = {};
    submitErrorState.value = null;

    if (input.zones.length === 0) {
      fieldErrorsState.value = {
        zones: ["請至少選擇一個實際要追蹤的部位。"]
      };
      return false;
    }

    const parsedZones = SetupDraftZoneV1Schema.array().safeParse(input.zones);
    if (!parsedZones.success) {
      fieldErrorsState.value = issuesToFieldErrors(parsedZones.error.issues);
      return false;
    }

    applicationTimeState.value = null;
    waterStartState.value = null;
    return persistDraft({
      ...draft,
      currentStep: parsedZones.data.some(hasTopicalMethod)
        ? "timing"
        : "review",
      setupEntryMode: input.setupEntryMode,
      suggestedPresetId: input.suggestedPresetId,
      suggestedPresetVersion: input.suggestedPresetVersion,
      presetDecision: input.presetDecision,
      zones: parsedZones.data,
      applications: [],
      pendingTiming: null
    });
  }

  /**
   * 入水時間的驗證。
   *
   * **抽成一份是必要的，不是整理癖。** 這段原本在 `savePendingTiming` 與
   * 送出流程各寫了一次，兩份逐字相同——2026-09-02 要補「不能早於塗抹時間」
   * 時，只改一邊就會變成兩種行為，而且錯的那一邊是使用者真的按下去的那條。
   *
   * 回傳錯誤訊息陣列，沒問題時回傳 null。
   */
  function validateWaterStart(
    waterStart: WaterStartFormValue | null,
    appliedAtMs: number,
    trustedNow: Date,
    nowLabel: string
  ): string[] | null {
    if (waterStart === null) {
      return ["請確認實際入水時間，或選擇不確定。"];
    }
    if (waterStart.confidence !== "confirmed") return null;

    const startedAt = waterStart.activityStartedAt;
    if (startedAt === null) {
      return [`入水時間不能晚於${nowLabel}。`];
    }

    const startedAtMs = Date.parse(startedAt);
    if (!Number.isFinite(startedAtMs) || startedAtMs > trustedNow.getTime()) {
      return [`入水時間不能晚於${nowLabel}。`];
    }

    /*
     * **入水不得早於塗抹**（2026-09-02，使用者回報）。
     *
     * 兩個欄位原本各有各的上限（塗抹 120 分、入水 80 分），但沒有人比較它們
     * 的先後。實測可以填「塗抹 4 分鐘前 ＋ 入水 59 分鐘前」而毫無阻攔——那在
     * 物理上不可能：這次提醒用的防曬乳 4 分鐘前才擦，不可能在那之前 55 分鐘
     * 就已經下水。
     *
     * 後果不只是資料難看：耐水區間的起點會落在一段「還沒擦防曬」的時間上，
     * 耐水扣減因此算在不存在的保護上。
     *
     * `appliedAtMs` 無效時不檢查——那時已經有 appliedAt 自己的錯誤訊息，再多
     * 一句只會讓使用者不知道該先修哪一個。
     */
    if (Number.isFinite(appliedAtMs) && startedAtMs < appliedAtMs) {
      return ["入水時間不能早於塗抹時間，請重新確認。"];
    }

    return null;
  }

  async function savePendingTiming(input: TimingDraftInput): Promise<boolean> {
    const draft = requireDraft();
    const fieldErrors: Record<string, string[]> = {};
    const trustedNow = dependencies.now();
    const appliedAtMs = Date.parse(input.appliedAt);
    const topicalZones = draft.zones.filter(hasTopicalMethod);

    if (!Number.isFinite(appliedAtMs) || appliedAtMs > trustedNow.getTime()) {
      fieldErrors.appliedAt = ["實際塗抹時間不能晚於目前時間，請重新確認。"];
    }
    if (topicalZones.length === 0) {
      fieldErrors.zones = ["目前沒有需要記錄防曬乳時間的部位。"];
    }

    if (draft.initialContext === "water_active") {
      const waterErrors = validateWaterStart(
        input.waterStart,
        appliedAtMs,
        trustedNow,
        "目前時間"
      );
      if (waterErrors !== null) fieldErrors.waterStart = waterErrors;
    }

    if (Object.keys(fieldErrors).length > 0) {
      fieldErrorsState.value = fieldErrors;
      return false;
    }

    const normalizedAppliedAt = new Date(appliedAtMs).toISOString();
    const normalizedWaterStart =
      draft.initialContext === "water_active" ? input.waterStart : null;
    applicationTimeState.value = normalizedAppliedAt;
    waterStartState.value = normalizedWaterStart;
    fieldErrorsState.value = {};
    submitErrorState.value = null;

    return persistDraft({
      ...draft,
      currentStep: "timing",
      pendingTiming: {
        appliedAt: normalizedAppliedAt,
        waterStart: normalizedWaterStart
      }
    });
  }

  async function saveTiming(input: TimingDraftInput): Promise<boolean> {
    const draft = requireDraft();
    const fieldErrors: Record<string, string[]> = {};
    const trustedNow = dependencies.now();
    const appliedAtMs = Date.parse(input.appliedAt);
    const topicalZones = draft.zones.filter(hasTopicalMethod);
    /*
     * 2026-08-30：沒有任何產品資訊時也要建立 snapshot。
     *
     * 改動前這裡會落到 null，於是 `applications: []`——沒有 application 就
     * 沒有 appliedAt 錨點，倒數算不出起點。那正是「不填防曬乳就完全沒有
     * 倒數」的成因。
     *
     * 現在退到 claimAnswer: "unknown"，推導出的 eligibility 是
     * identity_unconfirmed。reducer 從 2026-08-30 起把它視為「不知道」而
     * 不是「有問題」，給 120 分鐘保守預設；「標示尚未確認」的原因碼仍然
     * 回報，只是不再擋住倒數。
     *
     * 優先序不變：呼叫端傳入 > 草稿既有 > 使用者的產品設定 > 這個保守退路。
     * 已經有真實產品 snapshot 的人不會走到這裡，他們的過期／異常狀態仍然
     * 照常封鎖。
     */
    const productLabelSnapshot =
      input.productLabelSnapshot ??
      draft.applications[0]?.productLabelSnapshot ??
      (await dependencies.productSettings?.getCurrentProductSnapshot()) ??
      makeSessionOnlyProductSnapshot(
        {
          claimAnswer: input.sunscreenClaim ?? "unknown",
          waitAnswer: "unknown",
          waitMinutes: null,
          intervalAnswer: "unknown",
          intervalMinutes: null,
          waterResistance: "unknown"
        },
        trustedNow.toISOString()
      );

    if (!Number.isFinite(appliedAtMs) || appliedAtMs > trustedNow.getTime()) {
      fieldErrors.appliedAt = ["塗抹時間不能晚於目前可信時間，請重新確認。"];
    }
    if (topicalZones.length === 0) {
      fieldErrors.zones = ["目前沒有需要記錄防曬乳的部位。"];
    }
    // 沒有可信的包裝標示不再阻擋建立提醒。少了標示只是產生不了
    // 補擦倒數，Session 仍會以 untimed 卡片建立並引導補齊紀錄；
    // 領域層的 StartSessionCommand 本來就允許 applicationGroup 為 null。

    if (draft.initialContext === "water_active") {
      const waterErrors = validateWaterStart(
        input.waterStart,
        appliedAtMs,
        trustedNow,
        "目前可信時間"
      );
      if (waterErrors !== null) fieldErrors.waterStart = waterErrors;
    }

    if (Object.keys(fieldErrors).length > 0) {
      fieldErrorsState.value = fieldErrors;
      return false;
    }

    applicationTimeState.value = new Date(appliedAtMs).toISOString();
    waterStartState.value =
      draft.initialContext === "water_active" ? input.waterStart : null;
    fieldErrorsState.value = {};
    submitErrorState.value = null;

    return persistDraft({
      ...draft,
      currentStep: "review",
      /*
       * 2026-08-30 起 productLabelSnapshot 一定有值（見上方的保守退路），
       * 所以不再需要「沒有 snapshot 就不建立 application」的分支——留著
       * 會讓人以為那條路徑還走得到。
       */
      applications: [
        {
          draftApplicationKey: dependencies.createId(),
          draftZoneKeys: topicalZones.map((zone) => zone.draftZoneKey),
          sourceProductId: null,
          productSnapshotFingerprint: dependencies.createId(),
          productLabelSnapshot
        }
      ],
      pendingTiming: {
        appliedAt: applicationTimeState.value,
        waterStart: waterStartState.value
      }
    });
  }

  /**
   * 丟棄草稿並清空所有狀態。
   *
   * **2026-08-30 起沒有 UI 呼叫者。** `/setup` 右上角原本的「取消設定」
   * 改成了「回上一頁」，離開不再刪草稿（裁決見
   * docs/decisions/2026-08-30-pending-decisions.md 第二節）；使用者要丟掉
   * 草稿改走回復卡的「重新開始」，那條路徑用的是 `restartDraft()`。
   *
   * 保留這支 API 沒有問題，但**接上任何按鈕之前先確認那個按鈕的文案是
   * 破壞性的**——「回上一頁」「返回」這類導航字眼配上刪除行為，正是這次
   * 裁決要避免的。
   */
  async function cancel(): Promise<void> {
    const draftId = draftState.value?.id;
    draftState.value = null;
    recoveryPendingState.value = false;
    applicationTimeState.value = null;
    waterStartState.value = null;
    fieldErrorsState.value = {};
    submitErrorState.value = null;
    pendingCommand = null;
    loaded = false;
    saveStatusState.value = "idle";

    if (draftId !== undefined) {
      try {
        await dependencies.draftRepository.deleteDraft(draftId);
      } catch {
        saveStatusState.value = "error";
      }
    }
  }

  async function submit(): Promise<CommandResult<SessionProjection>> {
    const draft = requireDraft();
    phaseState.value = "submitting";
    fieldErrorsState.value = {};
    submitErrorState.value = null;

    try {
      pendingCommand ??= await buildCommand(draft);
    } catch (error) {
      phaseState.value = "ready";
      submitErrorState.value = "validation_error";
      if (error instanceof SetupValidationError) {
        fieldErrorsState.value = error.fieldErrors;
      }
      return {
        ok: false,
        code: "VALIDATION_ERROR",
        fieldErrors: fieldErrorsState.value,
        retryable: false
      };
    }

    const clock: ReducerClock = {
      status: "trusted",
      trustedNow: dependencies.now().toISOString(),
      connectivity: dependencies.getConnectivity()
    };
    const result = await dependencies.sessionRepository.startSession(
      pendingCommand,
      clock
    );

    if (!result.ok) {
      phaseState.value = "ready";
      fieldErrorsState.value = result.fieldErrors ?? {};
      submitErrorState.value =
        result.code === "ACTIVE_SESSION_CONFLICT"
          ? "active_session_conflict"
          : result.code === "PERSISTENCE_ERROR"
            ? "persistence_error"
            : "validation_error";
      return result;
    }

    try {
      await dependencies.draftRepository.deleteDraft(draft.id);
    } catch {
      // The committed Session remains the source of truth. The active
      // Session guard prevents a stale draft from creating a duplicate.
    }
    draftState.value = null;
    applicationTimeState.value = null;
    waterStartState.value = null;
    pendingCommand = null;
    await dependencies.boot.refresh();
    phaseState.value = "ready";
    return result;
  }

  async function buildCommand(
    draft: SetupDraftV1
  ): Promise<StartSessionCommandV1> {
    const fieldErrors: Record<string, string[]> = {};
    if (draft.initialContext === null) {
      fieldErrors.context = ["請先選擇目前情境。"];
    }
    if (draft.zones.length === 0) {
      fieldErrors.zones = ["請至少選擇一個追蹤部位。"];
    }
    const topicalZones = draft.zones.filter(hasTopicalMethod);
    if (
      topicalZones.length > 0 &&
      (draft.applications.length === 0 || applicationTimeState.value === null)
    ) {
      fieldErrors.appliedAt = ["請重新確認這次的實際塗抹時間。"];
    }

    const waterEligibleDraftZones = draft.zones.filter(
      (zone) =>
        zone.skinExposureStatus === "exposed" &&
        zone.methodComponents.includes("sunscreen")
    );
    if (
      draft.initialContext === "water_active" &&
      (waterStartState.value === null || waterEligibleDraftZones.length === 0)
    ) {
      fieldErrors.waterStart = [
        waterEligibleDraftZones.length === 0
          ? "已在水中的提醒至少需要一個外露且已擦防曬乳的部位。"
          : "請重新確認入水時間，或選擇不確定。"
      ];
    }

    if (Object.keys(fieldErrors).length > 0) {
      throw new SetupValidationError(fieldErrors);
    }

    await ensureIdentities();
    const timestamp = dependencies.now().toISOString();
    const zoneIdByDraftKey = new Map(
      draft.zones.map((zone) => [zone.draftZoneKey, dependencies.createId()])
    );

    // 沒有塗抹部位、或沒有可信包裝標示時都不送出 applicationGroup：
    // 前者沒東西可記，後者記了也產不出期限，reducer 會改走 untimed。
    const applicationGroup =
      topicalZones.length === 0 || draft.applications.length === 0
        ? null
        : {
            groupId: dependencies.createId(),
            appliedAt: applicationTimeState.value!,
            applications: draft.applications.map((application) => ({
              eventId: dependencies.createId(),
              zoneInstanceIds: application.draftZoneKeys.map((draftZoneKey) =>
                zoneIdByDraftKey.get(draftZoneKey)!
              ),
              sourceProductId: application.sourceProductId,
              productSnapshotFingerprint:
                application.productSnapshotFingerprint,
              productLabelSnapshot: application.productLabelSnapshot
            }))
          };

    const waterStart =
      draft.initialContext !== "water_active"
        ? null
        : {
            eventId: dependencies.createId(),
            activityIntervalId: dependencies.createId(),
            zoneInstanceIds: waterEligibleDraftZones.map((zone) =>
              zoneIdByDraftKey.get(zone.draftZoneKey)!
            ),
            startConfidence: waterStartState.value!.confidence,
            activityStartedAt:
              waterStartState.value!.confidence === "confirmed"
                ? waterStartState.value!.activityStartedAt
                : null,
            effectiveOccurredAt: timestamp
          };

    const parsed = StartSessionCommandV1Schema.safeParse({
      commandVersion: COMMAND_SCHEMA_VERSION,
      commandType: "start_session",
      commandId: dependencies.createId(),
      idempotencyKey: dependencies.createId(),
      owner: {
        type: "guest",
        localVisitorId: localVisitorId!
      },
      deviceLocalId: deviceLocalId!,
      sessionId: dependencies.createId(),
      clientSequence: 1,
      clientCreatedAt: timestamp,
      payload: {
        sessionStartedEventId: dependencies.createId(),
        rulesetVersion: DEFAULT_RULESET_VERSION,
        bodyZoneSchemaVersion: BODY_ZONE_SCHEMA_VERSION,
        setupEntryMode: draft.setupEntryMode,
        presetDecision: draft.presetDecision ?? "not_shown",
        suggestedPresetVersion: draft.suggestedPresetVersion,
        effectiveStartedAt: timestamp,
        initialContext: draft.initialContext,
        initialShade: draft.initialShade ?? "unknown",
        zones: draft.zones.map((zone) => ({
          zoneInstanceId: zoneIdByDraftKey.get(zone.draftZoneKey)!,
          trackingEventId: dependencies.createId(),
          methodEventId: dependencies.createId(),
          bodyZoneCode: zone.bodyZoneCode,
          customLabel: zone.customLabel,
          skinExposureStatus: zone.skinExposureStatus,
          methodCertainty: "confirmed",
          methodComponents: zone.methodComponents
        })),
        applicationGroup,
        waterStart
      }
    });

    if (!parsed.success) {
      throw new SetupValidationError(issuesToFieldErrors(parsed.error.issues));
    }
    return parsed.data;
  }

  function requireDraft(): SetupDraftV1 {
    if (draftState.value === null) {
      throw new SetupValidationError({
        draft: ["找不到目前設定草稿，請重新開始。"]
      });
    }
    return draftState.value;
  }

  function dispose(): void {
    disposed = true;
  }

  return {
    phase: shallowReadonly(phaseState),
    saveStatus: shallowReadonly(saveStatusState),
    draft: shallowReadonly(draftState),
    recoveryPending: shallowReadonly(recoveryPendingState),
    applicationTime: shallowReadonly(applicationTimeState),
    waterStart: shallowReadonly(waterStartState),
    fieldErrors: shallowReadonly(fieldErrorsState),
    submitError: shallowReadonly(submitErrorState),
    hasTopicalZones,
    ensureLoaded,
    resumeDraft,
    restartDraft,
    recommendedResumeStep,
    ensureRecommendedProtection,
    saveContext,
    saveProtection,
    savePendingTiming,
    saveTiming,
    cancel,
    submit,
    dispose
  };
}

function ownerKeyFor(localVisitorId: string): string {
  return `guest:${localVisitorId}`;
}

function hasTopicalMethod(zone: SetupDraftZoneV1): boolean {
  return zone.methodComponents.some(
    (component) => component === "sunscreen" || component === "other_topical"
  );
}

function issuesToFieldErrors(
  issues: ReadonlyArray<{
    path: PropertyKey[];
    message: string;
  }>
): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of issues) {
    const path = issue.path.join(".") || "_root";
    (fieldErrors[path] ??= []).push(issue.message);
  }
  return fieldErrors;
}

/**
 * 設定流程的驗證錯誤。
 *
 * 2026-08-31 改為 export：`SetupPage.vue` 需要分辨「草稿不存在」與「其他
 * 儲存失敗」，才能給出不同的下一步。在那之前它只能用同一句話涵蓋至少
 * 三種完全不同的失敗，使用者問「為什麼」時答不出來。
 */
export class SetupValidationError extends Error {
  readonly fieldErrors: Record<string, string[]>;

  constructor(fieldErrors: Record<string, string[]>) {
    super("Setup validation failed");
    this.fieldErrors = fieldErrors;
  }
}
