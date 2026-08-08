import type {
  CommandReceiptRecord,
  CommandResult,
  EndSessionCommandV1,
  ReapplyCommandV1,
  ReducerClock,
  ReportContextEventCommandV1,
  SessionEventStreamV1,
  SessionProjection,
  StartSessionCommandV1,
  ZoneProjection
} from "@sunshield/contracts";
import {
  EndSessionCommandV1Schema,
  ReapplyCommandV1Schema,
  ReportContextEventCommandV1Schema,
  fingerprintProductLabelSnapshot,
  StartSessionCommandV1Schema
} from "@sunshield/contracts";
import {
  DomainInvariantError,
  makeSessionEndedEvent,
  ownerKeyFor,
  planContextEvent,
  planStartSession,
  planReapplication,
  reduceSession,
  validateWaterIntervals
} from "@sunshield/domain";
import type { OpenWaterInterval } from "@sunshield/platform";
import {
  type CrossContextNotifier,
  NoopCrossContextNotifier
} from "../cross-context";
import { SunshieldDatabase } from "../db/database";
import { LocalProductCatalogRepository } from "./local-product-catalog-repository";

type TransactionOutcome = {
  result: CommandResult<SessionProjection>;
  committed: boolean;
};

export class LocalSessionRepository {
  readonly #database: SunshieldDatabase;
  readonly #notifier: CrossContextNotifier;
  readonly #sourceContextId: string;

  constructor(options: {
    database: SunshieldDatabase;
    sourceContextId: string;
    notifier?: CrossContextNotifier;
  }) {
    this.#database = options.database;
    this.#sourceContextId = options.sourceContextId;
    this.#notifier = options.notifier ?? new NoopCrossContextNotifier();
  }

  async open(): Promise<void> {
    await this.#database.open();
  }

  async startSession(
    rawCommand: StartSessionCommandV1,
    clock: ReducerClock
  ): Promise<CommandResult<SessionProjection>> {
    const parsed = StartSessionCommandV1Schema.safeParse(rawCommand);
    if (!parsed.success) {
      return validationFailure(parsed.error.issues);
    }

    let plan;
    try {
      plan = planStartSession(parsed.data, clock);
    } catch (error) {
      return mapPlanningError(error);
    }

    try {
      const outcome = await this.#database.transaction(
        "rw",
        [
          this.#database.ProtectionSessions,
          this.#database.ProtectionZoneStates,
          this.#database.SessionStartedEvents,
          this.#database.ZoneTrackingEvents,
          this.#database.ZoneMethodEvents,
          this.#database.ApplicationConfirmationGroups,
          this.#database.ApplicationEvents,
          this.#database.ContextEvents,
          this.#database.ActiveSessionLocks,
          this.#database.ClientSequences,
          this.#database.CommandReceipts,
          this.#database.ZoneIdentityLocks
        ],
        async (): Promise<TransactionOutcome> => {
          const existingReceipt =
            await this.#database.CommandReceipts.get(
              parsed.data.idempotencyKey
            );
          if (existingReceipt !== undefined) {
            return {
              result:
                existingReceipt.result as CommandResult<SessionProjection>,
              committed: false
            };
          }

          const ownerKey = ownerKeyFor(
            parsed.data.owner.localVisitorId
          );
          const activeLock =
            await this.#database.ActiveSessionLocks.get(ownerKey);
          if (activeLock !== undefined) {
            return {
              result: {
                ok: false,
                code: "ACTIVE_SESSION_CONFLICT",
                retryable: false
              },
              committed: false
            };
          }

          const sequenceKey: [string, string] = [
            parsed.data.deviceLocalId,
            parsed.data.sessionId
          ];
          const currentSequence =
            await this.#database.ClientSequences.get(sequenceKey);
          if (
            currentSequence !== undefined &&
            parsed.data.clientSequence <= currentSequence.lastSequence
          ) {
            return {
              result: {
                ok: false,
                code: "CLIENT_SEQUENCE_CONFLICT",
                retryable: false
              },
              committed: false
            };
          }

          await this.#database.ActiveSessionLocks.add({
            ownerKey,
            sessionId: parsed.data.sessionId,
            createdAt: clock.trustedNow
          });
          await this.#database.ProtectionSessions.add(plan.session);
          await this.#database.SessionStartedEvents.add(
            plan.stream.sessionStarted
          );
          await this.#database.ZoneTrackingEvents.bulkAdd(
            plan.stream.zoneTrackingEvents
          );
          await this.#database.ZoneMethodEvents.bulkAdd(
            plan.stream.zoneMethodEvents
          );
          if (plan.stream.applicationConfirmationGroups.length > 0) {
            await this.#database.ApplicationConfirmationGroups.bulkAdd(
              plan.stream.applicationConfirmationGroups
            );
          }
          if (plan.stream.applicationEvents.length > 0) {
            await this.#database.ApplicationEvents.bulkAdd(
              plan.stream.applicationEvents
            );
          }
          if (plan.stream.contextEvents.length > 0) {
            await this.#database.ContextEvents.bulkAdd(
              plan.stream.contextEvents
            );
          }
          await this.#database.ProtectionZoneStates.bulkPut(
            plan.projection.zones
          );

          for (const zone of parsed.data.payload.zones) {
            if (zone.bodyZoneCode !== "custom") {
              await this.#database.ZoneIdentityLocks.add({
                sessionId: parsed.data.sessionId,
                bodyZoneCode: zone.bodyZoneCode,
                zoneInstanceId: zone.zoneInstanceId
              });
            }
          }
          await this.#database.ClientSequences.put({
            deviceLocalId: parsed.data.deviceLocalId,
            sessionId: parsed.data.sessionId,
            lastSequence: parsed.data.clientSequence
          });

          const result: CommandResult<SessionProjection> = {
            ok: true,
            data: plan.projection,
            sessionId: parsed.data.sessionId,
            revision: 1,
            committedEventIds: plan.committedEventIds
          };
          const receipt: CommandReceiptRecord = {
            idempotencyKey: parsed.data.idempotencyKey,
            commandId: parsed.data.commandId,
            sessionId: parsed.data.sessionId,
            result,
            createdAt: clock.trustedNow
          };
          await this.#database.CommandReceipts.add(receipt);
          return { result, committed: true };
        }
      );

      if (outcome.committed && outcome.result.ok) {
        this.#publishCommit(
          outcome.result.sessionId,
          outcome.result.revision
        );
      }
      return outcome.result;
    } catch {
      return {
        ok: false,
        code: "PERSISTENCE_ERROR",
        retryable: true
      };
    }
  }

  async endSession(
    rawCommand: EndSessionCommandV1,
    clock: ReducerClock
  ): Promise<CommandResult<SessionProjection>> {
    const parsed = EndSessionCommandV1Schema.safeParse(rawCommand);
    if (!parsed.success) {
      return validationFailure(parsed.error.issues);
    }

    try {
      const outcome = await this.#database.transaction(
        "rw",
        [
          this.#database.ProtectionSessions,
          this.#database.ProtectionZoneStates,
          this.#database.SessionStartedEvents,
          this.#database.ZoneTrackingEvents,
          this.#database.ZoneMethodEvents,
          this.#database.ApplicationConfirmationGroups,
          this.#database.ApplicationEvents,
          this.#database.ProductSafetyEvents,
          this.#database.ContextEvents,
          this.#database.SessionEndedEvents,
          this.#database.ActiveSessionLocks,
          this.#database.ClientSequences,
          this.#database.CommandReceipts
        ],
        async (): Promise<TransactionOutcome> => {
          const existingReceipt =
            await this.#database.CommandReceipts.get(
              parsed.data.idempotencyKey
            );
          if (existingReceipt !== undefined) {
            return {
              result:
                existingReceipt.result as CommandResult<SessionProjection>,
              committed: false
            };
          }

          const session = await this.#database.ProtectionSessions.get(
            parsed.data.sessionId
          );
          if (session === undefined) {
            return {
              result: {
                ok: false,
                code: "NOT_FOUND",
                retryable: false
              },
              committed: false
            };
          }
          const commandOwnerKey = ownerKeyFor(
            parsed.data.owner.localVisitorId
          );
          if (session.ownerKey !== commandOwnerKey) {
            return {
              result: {
                ok: false,
                code: "NOT_FOUND",
                retryable: false
              },
              committed: false
            };
          }
          if (session.revision !== parsed.data.expectedRevision) {
            return {
              result: {
                ok: false,
                code: "REVISION_CONFLICT",
                currentRevision: session.revision,
                retryable: false
              },
              committed: false
            };
          }

          const sequenceKey: [string, string] = [
            parsed.data.deviceLocalId,
            parsed.data.sessionId
          ];
          const currentSequence =
            await this.#database.ClientSequences.get(sequenceKey);
          if (
            currentSequence !== undefined &&
            parsed.data.clientSequence <= currentSequence.lastSequence
          ) {
            return {
              result: {
                ok: false,
                code: "CLIENT_SEQUENCE_CONFLICT",
                retryable: false
              },
              committed: false
            };
          }

          const stream = await this.#loadEventStream(parsed.data.sessionId);
          const endedEvent = makeSessionEndedEvent(parsed.data);
          stream.sessionEndedEvents.push(endedEvent);
          const revision = session.revision + 1;
          const projection = reduceSession({ stream, revision, clock });

          await this.#database.SessionEndedEvents.add(endedEvent);
          await this.#database.ProtectionZoneStates.bulkPut(
            projection.zones
          );
          await this.#database.ProtectionSessions.put({
            ...session,
            endedAt: parsed.data.payload.effectiveOccurredAt,
            endedReason: parsed.data.payload.endedReason,
            overallStatus: projection.overallStatus,
            sessionNextDueAt: projection.sessionNextDueAt,
            primaryAction: projection.primaryAction,
            derivedFromEventRefs: projection.derivedFromEventRefs,
            revision,
            updatedAt: clock.trustedNow
          });
          const activeLock =
            await this.#database.ActiveSessionLocks.get(commandOwnerKey);
          if (activeLock?.sessionId === parsed.data.sessionId) {
            await this.#database.ActiveSessionLocks.delete(
              commandOwnerKey
            );
          }
          await this.#database.ClientSequences.put({
            deviceLocalId: parsed.data.deviceLocalId,
            sessionId: parsed.data.sessionId,
            lastSequence: parsed.data.clientSequence
          });

          const result: CommandResult<SessionProjection> = {
            ok: true,
            data: projection,
            sessionId: parsed.data.sessionId,
            revision,
            committedEventIds: [endedEvent.id]
          };
          await this.#database.CommandReceipts.add({
            idempotencyKey: parsed.data.idempotencyKey,
            commandId: parsed.data.commandId,
            sessionId: parsed.data.sessionId,
            result,
            createdAt: clock.trustedNow
          });
          return { result, committed: true };
        }
      );

      if (outcome.committed && outcome.result.ok) {
        this.#publishCommit(
          outcome.result.sessionId,
          outcome.result.revision
        );
      }
      return outcome.result;
    } catch (error) {
      if (error instanceof DomainInvariantError) {
        return {
          ok: false,
          code:
            error.code === "CORRECTION_CONFLICT"
              ? "CORRECTION_CONFLICT"
              : "VALIDATION_ERROR",
          retryable: false
        };
      }
      return {
        ok: false,
        code: "PERSISTENCE_ERROR",
        retryable: true
      };
    }
  }

  async reapply(
    rawCommand: ReapplyCommandV1,
    clock: ReducerClock
  ): Promise<CommandResult<SessionProjection>> {
    const parsed = ReapplyCommandV1Schema.safeParse(rawCommand);
    if (!parsed.success) return validationFailure(parsed.error.issues);
    if (Date.parse(parsed.data.payload.appliedAt) > Date.parse(clock.trustedNow)) {
      return { ok: false, code: "VALIDATION_ERROR", fieldErrors: { "payload.appliedAt": ["實際塗抹時間不得晚於可信現在"] }, retryable: false };
    }

    try {
      const outcome = await this.#database.transaction(
        "rw",
        [
          this.#database.ProtectionSessions,
          this.#database.ProtectionZoneStates,
          this.#database.SessionStartedEvents,
          this.#database.ZoneTrackingEvents,
          this.#database.ZoneMethodEvents,
          this.#database.ApplicationConfirmationGroups,
          this.#database.ApplicationEvents,
          this.#database.ProductSafetyEvents,
          this.#database.ContextEvents,
          this.#database.SessionEndedEvents,
          this.#database.ActiveSessionLocks,
          this.#database.ClientSequences,
          this.#database.CommandReceipts,
          this.#database.SunscreenProducts
        ],
        async (): Promise<TransactionOutcome> => {
          const existingReceipt = await this.#database.CommandReceipts.get(parsed.data.idempotencyKey);
          if (existingReceipt !== undefined) {
            return { result: existingReceipt.result as CommandResult<SessionProjection>, committed: false };
          }
          const session = await this.#database.ProtectionSessions.get(parsed.data.sessionId);
          if (session === undefined || session.endedAt !== null) {
            return { result: { ok: false, code: "NOT_FOUND", retryable: false }, committed: false };
          }
          const ownerKey = ownerKeyFor(parsed.data.owner.localVisitorId);
          const lock = await this.#database.ActiveSessionLocks.get(ownerKey);
          if (session.ownerKey !== ownerKey || lock?.sessionId !== session.id) {
            return { result: { ok: false, code: "NOT_FOUND", retryable: false }, committed: false };
          }
          if (session.revision !== parsed.data.expectedRevision) {
            return { result: { ok: false, code: "REVISION_CONFLICT", currentRevision: session.revision, retryable: false }, committed: false };
          }
          const sequenceKey: [string, string] = [parsed.data.deviceLocalId, parsed.data.sessionId];
          const sequence = await this.#database.ClientSequences.get(sequenceKey);
          if (sequence !== undefined && parsed.data.clientSequence <= sequence.lastSequence) {
            return { result: { ok: false, code: "CLIENT_SEQUENCE_CONFLICT", retryable: false }, committed: false };
          }

          const currentZones = await this.#database.ProtectionZoneStates.where("sessionId").equals(session.id).toArray();
          const validTopicalZones = new Set(currentZones.filter((zone) =>
            zone.trackingStatus === "active" &&
            zone.skinExposureStatus === "exposed" &&
            zone.methodCertainty === "confirmed" &&
            zone.methodComponents.some((component) => component === "sunscreen" || component === "other_topical")
          ).map((zone) => zone.zoneInstanceId));
          for (const application of parsed.data.payload.applications) {
            if (application.zoneInstanceIds.some((zoneId) => !validTopicalZones.has(zoneId))) {
              return { result: { ok: false, code: "VALIDATION_ERROR", retryable: false }, committed: false };
            }
            if (application.sourceProductId !== null) {
              const product = await this.#database.SunscreenProducts.get(application.sourceProductId);
              if (product === undefined || product.status !== "active" ||
                product.snapshotFingerprint !== application.productSnapshotFingerprint ||
                JSON.stringify(product.currentSnapshot) !== JSON.stringify(application.productLabelSnapshot)) {
                return { result: { ok: false, code: "PRODUCT_CONFLICT", retryable: false }, committed: false };
              }
            } else if (fingerprintProductLabelSnapshot(application.productLabelSnapshot) !== application.productSnapshotFingerprint) {
              return { result: { ok: false, code: "PRODUCT_CONFLICT", retryable: false }, committed: false };
            }
          }

          const stream = await this.#loadEventStream(session.id);
          const plan = planReapplication(parsed.data, stream, session, clock);
          await this.#database.ApplicationConfirmationGroups.add(plan.group);
          await this.#database.ApplicationEvents.bulkAdd(plan.events);
          await this.#database.ProtectionZoneStates.bulkPut(plan.projection.zones);
          await this.#database.ProtectionSessions.put(plan.session);
          await this.#database.ClientSequences.put({ deviceLocalId: parsed.data.deviceLocalId, sessionId: parsed.data.sessionId, lastSequence: parsed.data.clientSequence });

          const result: CommandResult<SessionProjection> = {
            ok: true,
            data: plan.projection,
            sessionId: session.id,
            revision: plan.session.revision,
            committedEventIds: plan.committedEventIds
          };
          await this.#database.CommandReceipts.add({ idempotencyKey: parsed.data.idempotencyKey, commandId: parsed.data.commandId, sessionId: session.id, result, createdAt: clock.trustedNow });
          return { result, committed: true };
        }
      );
      if (outcome.committed && outcome.result.ok) this.#publishCommit(outcome.result.sessionId, outcome.result.revision);
      return outcome.result;
    } catch (error) {
      if (error instanceof DomainInvariantError) return mapPlanningError(error);
      return { ok: false, code: "PERSISTENCE_ERROR", retryable: true };
    }
  }

  async reportContextEvent(
    rawCommand: ReportContextEventCommandV1,
    clock: ReducerClock
  ): Promise<CommandResult<SessionProjection>> {
    const parsed = ReportContextEventCommandV1Schema.safeParse(rawCommand);
    if (!parsed.success) return validationFailure(parsed.error.issues);
    if (Date.parse(parsed.data.payload.effectiveOccurredAt) > Date.parse(clock.trustedNow)) {
      return { ok: false, code: "VALIDATION_ERROR", fieldErrors: { "payload.effectiveOccurredAt": ["事件發生時間不得晚於可信現在"] }, retryable: false };
    }

    try {
      const outcome = await this.#database.transaction(
        "rw",
        [
          this.#database.ProtectionSessions,
          this.#database.ProtectionZoneStates,
          this.#database.SessionStartedEvents,
          this.#database.ZoneTrackingEvents,
          this.#database.ZoneMethodEvents,
          this.#database.ApplicationConfirmationGroups,
          this.#database.ApplicationEvents,
          this.#database.ProductSafetyEvents,
          this.#database.ContextEvents,
          this.#database.SessionEndedEvents,
          this.#database.ActiveSessionLocks,
          this.#database.ClientSequences,
          this.#database.CommandReceipts
        ],
        async (): Promise<TransactionOutcome> => {
          const existingReceipt = await this.#database.CommandReceipts.get(parsed.data.idempotencyKey);
          if (existingReceipt !== undefined) {
            return { result: existingReceipt.result as CommandResult<SessionProjection>, committed: false };
          }
          const session = await this.#database.ProtectionSessions.get(parsed.data.sessionId);
          if (session === undefined || session.endedAt !== null) {
            return { result: { ok: false, code: "NOT_FOUND", retryable: false }, committed: false };
          }
          const ownerKey = ownerKeyFor(parsed.data.owner.localVisitorId);
          const lock = await this.#database.ActiveSessionLocks.get(ownerKey);
          if (session.ownerKey !== ownerKey || lock?.sessionId !== session.id) {
            return { result: { ok: false, code: "NOT_FOUND", retryable: false }, committed: false };
          }
          if (session.revision !== parsed.data.expectedRevision) {
            return { result: { ok: false, code: "REVISION_CONFLICT", currentRevision: session.revision, retryable: false }, committed: false };
          }
          const sequenceKey: [string, string] = [parsed.data.deviceLocalId, parsed.data.sessionId];
          const sequence = await this.#database.ClientSequences.get(sequenceKey);
          if (sequence !== undefined && parsed.data.clientSequence <= sequence.lastSequence) {
            return { result: { ok: false, code: "CLIENT_SEQUENCE_CONFLICT", retryable: false }, committed: false };
          }

          // 事件只能掛在這個 Session 仍在追蹤的部位上。
          const currentZones = await this.#database.ProtectionZoneStates.where("sessionId").equals(session.id).toArray();
          const trackedZones = new Set(
            currentZones.filter((zone) => zone.trackingStatus === "active").map((zone) => zone.zoneInstanceId)
          );
          if (parsed.data.payload.detail.zoneInstanceIds.some((zoneId: string) => !trackedZones.has(zoneId))) {
            return { result: { ok: false, code: "VALIDATION_ERROR", fieldErrors: { "payload.detail.zoneInstanceIds": ["含有不屬於目前提醒或已停止追蹤的部位"] }, retryable: false }, committed: false };
          }

          const stream = await this.#loadEventStream(session.id);
          const plan = planContextEvent(parsed.data, stream, session, clock);
          await this.#database.ContextEvents.add(plan.event);
          await this.#database.ProtectionZoneStates.bulkPut(plan.projection.zones);
          await this.#database.ProtectionSessions.put(plan.session);
          await this.#database.ClientSequences.put({ deviceLocalId: parsed.data.deviceLocalId, sessionId: parsed.data.sessionId, lastSequence: parsed.data.clientSequence });

          const result: CommandResult<SessionProjection> = {
            ok: true,
            data: plan.projection,
            sessionId: session.id,
            revision: plan.session.revision,
            committedEventIds: plan.committedEventIds
          };
          await this.#database.CommandReceipts.add({ idempotencyKey: parsed.data.idempotencyKey, commandId: parsed.data.commandId, sessionId: session.id, result, createdAt: clock.trustedNow });
          return { result, committed: true };
        }
      );
      if (outcome.committed && outcome.result.ok) this.#publishCommit(outcome.result.sessionId, outcome.result.revision);
      return outcome.result;
    } catch (error) {
      if (error instanceof DomainInvariantError) return mapPlanningError(error);
      return { ok: false, code: "PERSISTENCE_ERROR", retryable: true };
    }
  }

  async getCurrentSession(
    localVisitorId: string
  ): Promise<SessionProjection | null> {
    const lock = await this.#database.ActiveSessionLocks.get(
      ownerKeyFor(localVisitorId)
    );
    if (lock === undefined) return null;
    const session = await this.#database.ProtectionSessions.get(
      lock.sessionId
    );
    if (session === undefined) return null;
    const zones = await this.#database.ProtectionZoneStates.where(
      "sessionId"
    )
      .equals(session.id)
      .toArray();
    let hydratedZones = zones;
    if (
      zones.some(
        (zone) =>
          (
            zone as ZoneProjection & {
              zoneTimerStartedAt?: string | null;
            }
          ).zoneTimerStartedAt === undefined
      )
    ) {
      const stream = await this.#loadEventStream(session.id);
      hydratedZones = zones.map((zone) =>
        hydrateZoneTimerStartedAt(zone, stream)
      );
    }
    return {
      sessionId: session.id,
      rulesetVersion: session.rulesetVersion,
      revision: session.revision,
      overallStatus: session.overallStatus,
      sessionNextDueAt: session.sessionNextDueAt,
      zones: hydratedZones,
      primaryAction: session.primaryAction,
      derivedFromEventRefs: session.derivedFromEventRefs
    };
  }

  /**
   * 讀取目前 Session 的完整事件流。
   *
   * S-07 最近事件清單需要它才能列出可更正的事件；該清單是 S-10
   * `/reminder/event/:id/correct` 取得事件 id 的唯一入口。
   */
  async getCurrentSessionEventStream(
    localVisitorId: string
  ): Promise<SessionEventStreamV1 | null> {
    const session = await this.getCurrentSession(localVisitorId);
    if (session === null) return null;
    return this.#loadEventStream(session.sessionId);
  }

  async getReapplicationContext(localVisitorId: string) {
    const session = await this.getCurrentSession(localVisitorId);
    if (session === null) return null;
    const stream = await this.#loadEventStream(session.sessionId);
    const currentIds = new Set(
      session.zones
        .map((zone) => zone.currentApplicationId)
        .filter((id): id is string => id !== null)
    );
    const currentApplications = stream.applicationEvents.filter((event) =>
      currentIds.has(event.id)
    );
    const products = await new LocalProductCatalogRepository(this.#database).listProducts();
    return { session, currentApplications, products };
  }

  /**
   * S-09 回報狀況的讀取側。
   *
   * 除了 Session 本身，還要知道有沒有「未關閉的水上區間」：
   * 有的話不得再建立入水起點，沒有的話不得顯示離水事件。
   * 部位集合必須完整沿用起點，離水才不會被 `validateWaterIntervals` 擋下。
   */
  async getContextEventContext(localVisitorId: string, trustedNow: string) {
    const session = await this.getCurrentSession(localVisitorId);
    if (session === null) return null;
    const stream = await this.#loadEventStream(session.sessionId);
    let openWaterInterval: OpenWaterInterval | null = null;
    try {
      const intervals = validateWaterIntervals(
        stream.contextEvents,
        trustedNow
      );
      const open = intervals.find((interval) => interval.end === null);
      openWaterInterval =
        open === undefined
          ? null
          : {
              activityIntervalId: open.start.activityIntervalId,
              zoneInstanceIds: [...open.start.zoneInstanceIds],
              startConfidence: open.start.startConfidence,
              activityStartedAt: open.start.activityStartedAt
            };
    } catch {
      // 既有事件流已經不合法時不再往下推導，讓頁面只顯示一般原因事件。
      openWaterInterval = null;
    }
    return { session, openWaterInterval };
  }

  async #loadEventStream(sessionId: string): Promise<SessionEventStreamV1> {
    const [
      sessionStartedEvents,
      zoneMethodEvents,
      zoneTrackingEvents,
      applicationConfirmationGroups,
      applicationEvents,
      productSafetyEvents,
      contextEvents,
      sessionEndedEvents
    ] = await Promise.all([
      this.#database.SessionStartedEvents.where("sessionId")
        .equals(sessionId)
        .toArray(),
      this.#database.ZoneMethodEvents.where("sessionId")
        .equals(sessionId)
        .toArray(),
      this.#database.ZoneTrackingEvents.where("sessionId")
        .equals(sessionId)
        .toArray(),
      this.#database.ApplicationConfirmationGroups.where("sessionId")
        .equals(sessionId)
        .toArray(),
      this.#database.ApplicationEvents.where("sessionId")
        .equals(sessionId)
        .toArray(),
      this.#database.ProductSafetyEvents.where("sessionId")
        .equals(sessionId)
        .toArray(),
      this.#database.ContextEvents.where("sessionId")
        .equals(sessionId)
        .toArray(),
      this.#database.SessionEndedEvents.where("sessionId")
        .equals(sessionId)
        .toArray()
    ]);
    const sessionStarted = sessionStartedEvents[0];
    if (sessionStarted === undefined || sessionStartedEvents.length !== 1) {
      throw new DomainInvariantError(
        "INVALID_EVENT_STREAM",
        "SessionStartedEvent 必須恰好一筆"
      );
    }
    return {
      sessionStarted,
      zoneMethodEvents,
      zoneTrackingEvents,
      applicationConfirmationGroups,
      applicationEvents,
      productSafetyEvents,
      contextEvents,
      sessionEndedEvents
    };
  }

  #publishCommit(sessionId?: string, revision?: number): void {
    this.#notifier.publish({
      kind: "data-committed",
      sourceContextId: this.#sourceContextId,
      ...(sessionId === undefined ? {} : { sessionId }),
      ...(revision === undefined ? {} : { revision })
    });
  }
}

function hydrateZoneTimerStartedAt(
  zone: ZoneProjection,
  stream: SessionEventStreamV1
): ZoneProjection {
  const legacyZone = zone as ZoneProjection & {
    zoneTimerStartedAt?: string | null;
  };
  if (legacyZone.zoneTimerStartedAt !== undefined) {
    return zone;
  }

  let zoneTimerStartedAt: string | null = null;
  if (
    zone.zoneDueAt !== null &&
    zone.zoneDueAt === zone.generalDueAt &&
    zone.currentApplicationId !== null
  ) {
    zoneTimerStartedAt =
      stream.applicationEvents.find(
        (event) => event.id === zone.currentApplicationId
      )?.appliedAt ?? null;
  } else if (
    zone.zoneDueAt !== null &&
    zone.zoneDueAt === zone.activeWaterDeadline
  ) {
    const waterStart = stream.contextEvents.find(
      (event) =>
        event.contextType === "water_start" &&
        event.startConfidence === "confirmed" &&
        zone.derivedFromEventRefs.includes(event.id)
    );
    zoneTimerStartedAt =
      waterStart?.contextType === "water_start"
        ? waterStart.activityStartedAt
        : null;
  } else if (
    zone.zoneDueAt !== null &&
    zone.zoneDueAt === zone.eventTriggeredDeadline
  ) {
    zoneTimerStartedAt = zone.eventTriggeredDeadline;
  }

  return {
    ...zone,
    zoneTimerStartedAt
  };
}

function validationFailure(
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>
): CommandResult<never> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of issues) {
    const path = issue.path.join(".") || "_root";
    (fieldErrors[path] ??= []).push(issue.message);
  }
  return {
    ok: false,
    code: "VALIDATION_ERROR",
    fieldErrors,
    retryable: false
  };
}

function mapPlanningError(error: unknown): CommandResult<never> {
  if (error instanceof DomainInvariantError) {
    return {
      ok: false,
      code:
        error.code === "CORRECTION_CONFLICT"
          ? "CORRECTION_CONFLICT"
          : "VALIDATION_ERROR",
      retryable: false
    };
  }
  return {
    ok: false,
    code: "VALIDATION_ERROR",
    retryable: false
  };
}
