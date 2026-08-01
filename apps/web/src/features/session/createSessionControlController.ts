import {
  COMMAND_SCHEMA_VERSION,
  EndSessionCommandV1Schema,
  type EndSessionCommandV1,
  type ReducerClock,
  type SessionProjection
} from "@sunshield/contracts";
import type {
  DeviceIdentityPort,
  LocalIdentityPort,
  SessionEndRepositoryPort
} from "@sunshield/platform";
import {
  shallowReadonly,
  shallowRef,
  type ShallowRef
} from "vue";
import type { AppBootController } from "../../app/createAppBootController";

export type SessionEndPhase = "idle" | "ending" | "error";

export type SessionEndError =
  | "state_changed"
  | "persistence_error"
  | "refresh_failed"
  | "validation_error"
  | null;

export interface SessionControlController {
  readonly endPhase: Readonly<ShallowRef<SessionEndPhase>>;
  readonly endError: Readonly<ShallowRef<SessionEndError>>;
  endCurrentSession(session: SessionProjection): Promise<boolean>;
  clearEndError(): void;
  dispose(): void;
}

interface SessionControlDependencies {
  repository: SessionEndRepositoryPort;
  identity: LocalIdentityPort & DeviceIdentityPort;
  boot: AppBootController;
  createId(): string;
  now(): Date;
  getConnectivity(): ReducerClock["connectivity"];
}

type PendingEndCommand = {
  sessionId: string;
  revision: number;
  command: EndSessionCommandV1;
};

export function createSessionControlController(
  dependencies: SessionControlDependencies
): SessionControlController {
  const endPhaseState = shallowRef<SessionEndPhase>("idle");
  const endErrorState = shallowRef<SessionEndError>(null);
  let pendingCommand: PendingEndCommand | null = null;
  let disposed = false;

  async function endCurrentSession(
    session: SessionProjection
  ): Promise<boolean> {
    if (disposed || endPhaseState.value === "ending") return false;

    endPhaseState.value = "ending";
    endErrorState.value = null;

    try {
      if (
        pendingCommand === null ||
        pendingCommand.sessionId !== session.sessionId ||
        pendingCommand.revision !== session.revision
      ) {
        pendingCommand = {
          sessionId: session.sessionId,
          revision: session.revision,
          command: await buildEndCommand(session)
        };
      }

      const command = pendingCommand.command;
      const clock: ReducerClock = {
        status: "trusted",
        trustedNow: command.payload.effectiveOccurredAt,
        connectivity: dependencies.getConnectivity()
      };
      const result = await dependencies.repository.endSession(
        command,
        clock
      );

      if (!result.ok) {
        if (
          result.code === "REVISION_CONFLICT" ||
          result.code === "CLIENT_SEQUENCE_CONFLICT" ||
          result.code === "NOT_FOUND"
        ) {
          pendingCommand = null;
          await dependencies.boot.refresh();
          if (
            result.code === "NOT_FOUND" &&
            dependencies.boot.currentSession.value === null
          ) {
            endPhaseState.value = "idle";
            return true;
          }
          endErrorState.value = "state_changed";
        } else if (result.code === "PERSISTENCE_ERROR") {
          endErrorState.value = "persistence_error";
        } else {
          pendingCommand = null;
          endErrorState.value = "validation_error";
        }
        endPhaseState.value = "error";
        return false;
      }

      pendingCommand = null;
      await dependencies.boot.refresh();
      if (
        dependencies.boot.currentSession.value?.sessionId ===
        session.sessionId
      ) {
        endErrorState.value = "refresh_failed";
        endPhaseState.value = "error";
        return false;
      }

      endPhaseState.value = "idle";
      return true;
    } catch {
      endErrorState.value = "persistence_error";
      endPhaseState.value = "error";
      return false;
    }
  }

  async function buildEndCommand(
    session: SessionProjection
  ): Promise<EndSessionCommandV1> {
    const [localVisitorId, deviceLocalId] = await Promise.all([
      dependencies.identity.getOrCreateLocalVisitorId(),
      dependencies.identity.getOrCreateDeviceLocalId()
    ]);
    const timestamp = dependencies.now().toISOString();
    return EndSessionCommandV1Schema.parse({
      commandVersion: COMMAND_SCHEMA_VERSION,
      commandType: "end_session",
      commandId: dependencies.createId(),
      idempotencyKey: dependencies.createId(),
      owner: {
        type: "guest",
        localVisitorId
      },
      deviceLocalId,
      sessionId: session.sessionId,
      clientSequence: session.revision + 1,
      clientCreatedAt: timestamp,
      expectedRevision: session.revision,
      payload: {
        sessionEndedEventId: dependencies.createId(),
        effectiveOccurredAt: timestamp,
        endedReason: "user_ended"
      }
    });
  }

  function clearEndError(): void {
    endErrorState.value = null;
    if (endPhaseState.value === "error") {
      endPhaseState.value = "idle";
    }
  }

  function dispose(): void {
    disposed = true;
  }

  return {
    endPhase: shallowReadonly(endPhaseState),
    endError: shallowReadonly(endErrorState),
    endCurrentSession,
    clearEndError,
    dispose
  };
}
