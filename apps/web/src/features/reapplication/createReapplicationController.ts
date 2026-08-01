import {
  COMMAND_SCHEMA_VERSION,
  fingerprintProductLabelSnapshot,
  ReapplyCommandV1Schema,
  type ProductLabelSnapshotV1,
  type ReapplyCommandV1,
  type SessionProjection
} from "@sunshield/contracts";
import type {
  DeviceIdentityPort,
  LocalIdentityPort,
  ReapplicationRepositoryPort
} from "@sunshield/platform";
import { shallowReadonly, shallowRef, type ShallowRef } from "vue";
import type { AppBootController } from "../../app/createAppBootController";

export type ReapplicationPhase = "idle" | "loading" | "ready" | "submitting" | "success" | "error";
export type ReapplicationError = "validation" | "state_changed" | "product_changed" | "persistence" | "refresh_failed" | "not_found" | null;

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

interface Dependencies {
  repository: ReapplicationRepositoryPort;
  identity: LocalIdentityPort & DeviceIdentityPort;
  boot: AppBootController;
  createId(): string;
  now(): Date;
  getConnectivity(): "online" | "offline";
}

export function createReapplicationController(dependencies: Dependencies): ReapplicationController {
  const phase = shallowRef<ReapplicationPhase>("idle");
  const session = shallowRef<SessionProjection | null>(null);
  const suggestedZoneIds = shallowRef<string[]>([]);
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
      context = await dependencies.repository.getReapplicationContext(visitorId);
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
        selectable: product.status === "active"
        ,restriction: product.currentSnapshot.ruleEligibilityAtApplication === "eligible" ? null : "此產品可留下使用紀錄，但不會建立補擦倒數。"
      });
    }
    const nextAssignments: Record<string, string> = {};
    for (const application of context.currentApplications) {
      const savedChoiceId = application.sourceProductId === null ? null : `product:${application.sourceProductId}`;
      let choiceId = savedChoiceId !== null && choices.get(savedChoiceId)?.snapshotFingerprint === application.productSnapshotFingerprint
        ? savedChoiceId
        : `session:${fingerprintProductLabelSnapshot(application.productLabelSnapshot)}`;
      if (!choices.has(choiceId)) {
        choices.set(choiceId, {
          choiceId,
          displayName: "本次使用產品",
          sourceProductId: null,
          snapshotFingerprint: fingerprintProductLabelSnapshot(application.productLabelSnapshot),
          snapshot: application.productLabelSnapshot,
          selectable: true,
          restriction: application.productLabelSnapshot.ruleEligibilityAtApplication === "eligible" ? null : "此產品可留下使用紀錄，但不會建立補擦倒數。"
        });
      }
      for (const zoneId of application.zoneInstanceIds) nextAssignments[zoneId] = choiceId;
    }
    productChoices.value = [...choices.values()];
    assignments.value = nextAssignments;
    const suggested = context.session.zones.filter((zone) =>
      zone.trackingStatus === "active" &&
      zone.methodComponents.some((component) => component === "sunscreen" || component === "other_topical") &&
      (zone.timingStatus === "reapply_due" || zone.timingStatus === "reapply_soon")
    ).map((zone) => zone.zoneInstanceId);
    suggestedZoneIds.value = suggested.length > 0
      ? suggested
      : context.session.primaryAction.affectedZoneInstanceIds.filter((zoneId) => nextAssignments[zoneId] !== undefined);
    selectedZoneIds.value = [...suggestedZoneIds.value];
    referenceNow.value = dependencies.now().toISOString();
    appliedAt.value = referenceNow.value;
    pendingCommand = null;
    phase.value = "ready";
  }

  function selectSuggested(): void { selectedZoneIds.value = [...suggestedZoneIds.value]; pendingCommand = null; }
  function selectAll(): void {
    selectedZoneIds.value = session.value?.zones.filter((zone) => zone.trackingStatus === "active" && zone.methodComponents.some((component) => component === "sunscreen" || component === "other_topical")).map((zone) => zone.zoneInstanceId) ?? [];
    pendingCommand = null;
  }
  function toggleZone(zoneId: string): void {
    selectedZoneIds.value = selectedZoneIds.value.includes(zoneId) ? selectedZoneIds.value.filter((id) => id !== zoneId) : [...selectedZoneIds.value, zoneId];
    pendingCommand = null;
  }
  function assignProduct(zoneId: string, choiceId: string): void { assignments.value = { ...assignments.value, [zoneId]: choiceId }; pendingCommand = null; }
  function setAppliedAt(value: string): void { appliedAt.value = value; pendingCommand = null; }
  function setQuickTime(minutesAgo: number): void { const now = dependencies.now(); referenceNow.value = now.toISOString(); setAppliedAt(new Date(now.getTime() - minutesAgo * 60_000).toISOString()); }

  async function submit(): Promise<boolean> {
    if (session.value === null || phase.value === "submitting" || success.value !== null) return false;
    const errors: Record<string, string[]> = {};
    if (selectedZoneIds.value.length === 0) errors.zones = ["請至少選擇一個實際補擦的部位。"];
    for (const zoneId of selectedZoneIds.value) {
      const choice = productChoices.value.find((item) => item.choiceId === assignments.value[zoneId]);
      if (choice === undefined || !choice.selectable) errors[`product.${zoneId}`] = ["請選擇這個部位目前可使用的產品。"];
    }
    const appliedAtMs = Date.parse(appliedAt.value);
    if (!Number.isFinite(appliedAtMs) || appliedAtMs > dependencies.now().getTime()) errors.appliedAt = ["實際塗抹時間不能晚於目前時間。"];
    if (Object.keys(errors).length > 0) { fieldErrors.value = errors; error.value = "validation"; return false; }
    phase.value = "submitting";
    fieldErrors.value = {};
    if (pendingCommand === null) pendingCommand = await buildCommand();
    let result;
    try {
      result = await dependencies.repository.reapply(pendingCommand, { status: "trusted", trustedNow: dependencies.now().toISOString(), connectivity: dependencies.getConnectivity() });
    } catch {
      error.value = "persistence";
      phase.value = "error";
      return false;
    }
    if (!result.ok) {
      if (result.code === "PERSISTENCE_ERROR") error.value = "persistence";
      else if (result.code === "PRODUCT_CONFLICT") { error.value = "product_changed"; pendingCommand = null; }
      else if (result.code === "NOT_FOUND") { error.value = "not_found"; pendingCommand = null; }
      else if (result.code === "REVISION_CONFLICT" || result.code === "CLIENT_SEQUENCE_CONFLICT") { error.value = "state_changed"; pendingCommand = null; }
      else error.value = "validation";
      phase.value = "error";
      return false;
    }
    const committedCommand = pendingCommand;
    pendingCommand = null;
    success.value = {
      groupId: committedCommand.payload.applicationConfirmationId,
      zoneIds: [...selectedZoneIds.value],
      appliedAt: committedCommand.payload.appliedAt,
      productGroups: committedCommand.payload.applications.map((application) => ({
        displayName: productChoices.value.find((choice) => choice.snapshotFingerprint === application.productSnapshotFingerprint && choice.sourceProductId === application.sourceProductId)?.displayName ?? "本次使用產品",
        zoneIds: application.zoneInstanceIds
      })),
      committedRevision: result.revision ?? session.value.revision + 1
    };
    try {
      await dependencies.boot.refresh();
      if (dependencies.boot.currentSession.value?.revision !== result.revision) error.value = "refresh_failed";
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
      if ((dependencies.boot.currentSession.value?.revision ?? 0) >= success.value.committedRevision) {
        error.value = null;
        return true;
      }
    } catch { /* committed receipt stays authoritative */ }
    error.value = "refresh_failed";
    return false;
  }

  async function buildCommand(): Promise<ReapplyCommandV1> {
    const [visitorId, deviceId] = await Promise.all([dependencies.identity.getOrCreateLocalVisitorId(), dependencies.identity.getOrCreateDeviceLocalId()]);
    const groups = new Map<string, { choice: ReapplicationProductChoice; zoneIds: string[] }>();
    for (const zoneId of selectedZoneIds.value) {
      const choiceId = assignments.value[zoneId]!;
      const choice = productChoices.value.find((item) => item.choiceId === choiceId)!;
      const group = groups.get(choiceId) ?? { choice, zoneIds: [] };
      group.zoneIds.push(zoneId);
      groups.set(choiceId, group);
    }
    return ReapplyCommandV1Schema.parse({
      commandVersion: COMMAND_SCHEMA_VERSION, commandType: "record_reapplication", commandId: dependencies.createId(), idempotencyKey: dependencies.createId(),
      owner: { type: "guest", localVisitorId: visitorId }, deviceLocalId: deviceId, sessionId: session.value!.sessionId,
      clientSequence: session.value!.revision + 1, clientCreatedAt: dependencies.now().toISOString(), expectedRevision: session.value!.revision,
      payload: { applicationConfirmationId: dependencies.createId(), appliedAt: new Date(appliedAt.value).toISOString(), applications: [...groups.values()].map(({ choice, zoneIds }) => ({ eventId: dependencies.createId(), zoneInstanceIds: zoneIds, sourceProductId: choice.sourceProductId, productSnapshotFingerprint: choice.snapshotFingerprint, productLabelSnapshot: choice.snapshot })) }
    });
  }

  function resetError(): void { error.value = null; if (phase.value === "error") phase.value = "ready"; }
  function dispose(): void { disposed = true; }
  return { phase: shallowReadonly(phase), session: shallowReadonly(session), suggestedZoneIds: shallowReadonly(suggestedZoneIds), selectedZoneIds: shallowReadonly(selectedZoneIds), productChoices: shallowReadonly(productChoices), assignments: shallowReadonly(assignments), appliedAt: shallowReadonly(appliedAt), referenceNow: shallowReadonly(referenceNow), fieldErrors: shallowReadonly(fieldErrors), error: shallowReadonly(error), success: shallowReadonly(success), load, selectSuggested, selectAll, toggleZone, assignProduct, setAppliedAt, setQuickTime, submit, refreshCommitted, resetError, dispose };
}
