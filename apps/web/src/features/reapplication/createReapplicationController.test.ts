import { describe, expect, it, vi } from "vitest";
import { makeProductSnapshot } from "../../../../../packages/test-fixtures/src/index";
import { createReapplicationController } from "./createReapplicationController";

function context() {
  const snapshot = makeProductSnapshot();
  const snapshotB = makeProductSnapshot({ capturedAt: "2026-08-01T08:05:00.000Z" });
  return {
    session: {
      sessionId: "session-1", rulesetVersion: "rules", revision: 1, overallStatus: "attention_required", sessionNextDueAt: null,
      zones: [
        { sessionId: "session-1", zoneInstanceId: "zone-a", bodyZoneCode: "face_nose_cheeks", customLabel: null, trackingStatus: "active", skinExposureStatus: "exposed", methodCertainty: "confirmed", methodComponents: ["sunscreen"], currentActivationSequence: 1, currentApplicationId: "app-a", currentApplicationEligibility: "eligible", activeProductSafetyBlock: false, recordStatus: "sunscreen_recorded", timingStatus: "reapply_due", activeLabelReadyAt: null, generalDueAt: null, activeWaterDeadline: null, eventTriggeredDeadline: null, zoneDueAt: null, zoneTimerStartedAt: null, zoneNextActionAt: null, activeCauseRefs: [], activeRuleIds: [], reasonCodes: [], derivedFromEventRefs: [] },
        { sessionId: "session-1", zoneInstanceId: "zone-b", bodyZoneCode: "ears", customLabel: null, trackingStatus: "active", skinExposureStatus: "exposed", methodCertainty: "confirmed", methodComponents: ["sunscreen"], currentActivationSequence: 1, currentApplicationId: "app-b", currentApplicationEligibility: "eligible", activeProductSafetyBlock: false, recordStatus: "sunscreen_recorded", timingStatus: "reapply_soon", activeLabelReadyAt: null, generalDueAt: null, activeWaterDeadline: null, eventTriggeredDeadline: null, zoneDueAt: null, zoneTimerStartedAt: null, zoneNextActionAt: null, activeCauseRefs: [], activeRuleIds: [], reasonCodes: [], derivedFromEventRefs: [] }
      ],
      primaryAction: { presentationType: "due_card", variant: null, actionKind: "record_reapplication", affectedZoneInstanceIds: ["zone-a"], actionAt: null, reasonCodes: [], derivedFromEventRefs: [] },
      derivedFromEventRefs: []
    },
    currentApplications: [
      { schemaVersion: "1.0.0", id: "app-a", sessionId: "session-1", commandId: "c", idempotencyKey: "i", effectiveOccurredAt: "2026-08-01T08:00:00.000Z", clientCreatedAt: "2026-08-01T08:00:00.000Z", clientSequence: 1, localAppliedSequence: 1, eventType: "application_recorded", applicationConfirmationId: "g", zoneInstanceIds: ["zone-a"], appliedAt: "2026-08-01T08:00:00.000Z", sourceProductId: "product-a", productSnapshotFingerprint: "fp-a", productLabelSnapshot: snapshot },
      { schemaVersion: "1.0.0", id: "app-b", sessionId: "session-1", commandId: "c", idempotencyKey: "i", effectiveOccurredAt: "2026-08-01T08:00:00.000Z", clientCreatedAt: "2026-08-01T08:00:00.000Z", clientSequence: 1, localAppliedSequence: 1, eventType: "application_recorded", applicationConfirmationId: "g", zoneInstanceIds: ["zone-b"], appliedAt: "2026-08-01T08:00:00.000Z", sourceProductId: "product-b", productSnapshotFingerprint: "fp-b", productLabelSnapshot: snapshotB }
    ],
    products: []
  } as any;
}

/**
 * 首次記錄變體（`complete_protection_record`）：部位 `recordStatus === "unrecorded"`，
 * 沒有任何既有 Application，因此不會出現在 `currentApplications` 裡。
 */
function firstRecordContext() {
  const source = context();
  source.session.zones = [
    { ...source.session.zones[0], zoneInstanceId: "zone-new", currentApplicationId: null, currentApplicationEligibility: null, recordStatus: "unrecorded", timingStatus: "untimed_action" }
  ];
  source.session.primaryAction = {
    presentationType: "untimed_action", variant: null, actionKind: "complete_protection_record",
    affectedZoneInstanceIds: ["zone-new"], actionAt: null, reasonCodes: [], derivedFromEventRefs: []
  };
  source.currentApplications = [];
  source.products = [
    { productId: "product-a", displayName: "常用防曬", status: "active", snapshotFingerprint: "fp-a", currentSnapshot: makeProductSnapshot() }
  ];
  return source;
}

describe("createReapplicationController", () => {
  it("首次記錄變體：沒有既有 Application 的部位仍被預選", async () => {
    const source = firstRecordContext();
    const controller = createReapplicationController({ repository: { getReapplicationContext: vi.fn().mockResolvedValue(source), reapply: vi.fn() }, identity: { getOrCreateLocalVisitorId: vi.fn().mockResolvedValue("visitor"), getOrCreateDeviceLocalId: vi.fn().mockResolvedValue("device") }, boot: { refresh: vi.fn(), currentSession: { value: source.session } } as any, createId: vi.fn(() => crypto.randomUUID()), now: () => new Date("2026-08-01T10:00:00.000Z"), getConnectivity: () => "online" });

    await controller.load();

    // 先前以「已有既有 Application」過濾 primaryAction 部位，
    // 導致首次記錄開啟時零選取，使用者得自己找回該選哪些部位。
    expect(controller.selectedZoneIds.value).toEqual(["zone-new"]);
    expect(controller.assignments.value["zone-new"]).toBeUndefined();
  });

  it("首次記錄變體：未指派產品時擋下提交並顯示就近錯誤", async () => {
    const source = firstRecordContext();
    const reapply = vi.fn().mockResolvedValue({ ok: true, data: { ...source.session, revision: 2 }, sessionId: "session-1", revision: 2, committedEventIds: [] });
    const boot = { refresh: vi.fn(), currentSession: { value: { ...source.session, revision: 2 } } } as any;
    const controller = createReapplicationController({ repository: { getReapplicationContext: vi.fn().mockResolvedValue(source), reapply } as any, identity: { getOrCreateLocalVisitorId: vi.fn().mockResolvedValue("visitor"), getOrCreateDeviceLocalId: vi.fn().mockResolvedValue("device") }, boot, createId: vi.fn(() => crypto.randomUUID()), now: () => new Date("2026-08-01T10:00:00.000Z"), getConnectivity: () => "online" });
    await controller.load();

    expect(await controller.submit()).toBe(false);
    expect(controller.fieldErrors.value["product.zone-new"]).toBeDefined();
    // 沒有產品就送出會為從未塗抹的部位建立 Application，進而產生不該存在的倒數。
    expect(reapply).not.toHaveBeenCalled();

    controller.assignProduct("zone-new", "product:product-a");
    expect(await controller.submit()).toBe(true);
    expect(reapply).toHaveBeenCalledTimes(1);
  });

  it("預選 due/soon 並保留不同部位目前的不同產品", async () => {
    const controller = createReapplicationController({ repository: { getReapplicationContext: vi.fn().mockResolvedValue(context()), reapply: vi.fn() }, identity: { getOrCreateLocalVisitorId: vi.fn().mockResolvedValue("visitor"), getOrCreateDeviceLocalId: vi.fn().mockResolvedValue("device") }, boot: { refresh: vi.fn(), currentSession: { value: context().session } } as any, createId: vi.fn(() => crypto.randomUUID()), now: () => new Date("2026-08-01T10:00:00.000Z"), getConnectivity: () => "online" });
    await controller.load();
    expect(controller.selectedZoneIds.value).toEqual(["zone-a", "zone-b"]);
    expect(controller.assignments.value["zone-a"]).not.toBe(controller.assignments.value["zone-b"]);
  });

  it("持久化失敗後重試沿用同一 idempotency command", async () => {
    const source = context();
    const calls: any[] = [];
    const boot = { currentSession: { value: source.session }, refresh: vi.fn(async () => { boot.currentSession.value = { ...source.session, revision: 2 }; }) } as any;
    const repository = {
      getReapplicationContext: vi.fn().mockResolvedValue(source),
      reapply: vi.fn(async (command: any) => {
        calls.push(command);
        return calls.length === 1
          ? { ok: false, code: "PERSISTENCE_ERROR", retryable: true }
          : { ok: true, data: { ...source.session, revision: 2 }, sessionId: "session-1", revision: 2, committedEventIds: [] };
      })
    };
    let id = 0;
    const controller = createReapplicationController({ repository: repository as any, identity: { getOrCreateLocalVisitorId: vi.fn().mockResolvedValue("visitor"), getOrCreateDeviceLocalId: vi.fn().mockResolvedValue("device") }, boot, createId: () => `id-${++id}`, now: () => new Date("2026-08-01T10:00:00.000Z"), getConnectivity: () => "online" });
    await controller.load();
    expect(await controller.submit()).toBe(false);
    controller.resetError();
    expect(await controller.submit()).toBe(true);
    expect(calls[1].idempotencyKey).toBe(calls[0].idempotencyKey);
    expect(calls[1].commandId).toBe(calls[0].commandId);
  });

  it("commit 後 refresh 拋錯仍保留成功，且不允許再次提交", async () => {
    const source = context();
    const repository = {
      getReapplicationContext: vi.fn().mockResolvedValue(source),
      reapply: vi.fn().mockResolvedValue({ ok: true, data: { ...source.session, revision: 2 }, sessionId: "session-1", revision: 2, committedEventIds: [] })
    };
    const boot = { currentSession: { value: source.session }, refresh: vi.fn().mockRejectedValue(new Error("refresh failed")) } as any;
    const controller = createReapplicationController({ repository: repository as any, identity: { getOrCreateLocalVisitorId: vi.fn().mockResolvedValue("visitor"), getOrCreateDeviceLocalId: vi.fn().mockResolvedValue("device") }, boot, createId: () => crypto.randomUUID(), now: () => new Date("2026-08-01T10:00:00.000Z"), getConnectivity: () => "online" });
    await controller.load();
    expect(await controller.submit()).toBe(true);
    expect(controller.phase.value).toBe("success");
    expect(controller.error.value).toBe("refresh_failed");
    expect(await controller.submit()).toBe(false);
    expect(repository.reapply).toHaveBeenCalledTimes(1);
  });
});
