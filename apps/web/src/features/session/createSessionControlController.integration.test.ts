import {
  LocalSessionRepository,
  SunshieldDatabase,
  type CrossContextNotifier,
  type InvalidationMessage
} from "@sunshield/persistence-web";
import { makeClock, makeStartSessionCommand } from "@sunshield/test-fixtures";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAppBootController } from "../../app/createAppBootController";
import {
  createSessionControlController,
  type SessionControlController
} from "./createSessionControlController";

let databaseCounter = 0;
let database: SunshieldDatabase;
let repository: LocalSessionRepository;
let controller: SessionControlController;
let boot: ReturnType<typeof createAppBootController>;
let idSequence: number;

class SilentNotifier implements CrossContextNotifier {
  publish(_message: InvalidationMessage): void {}

  subscribe(_listener: (message: InvalidationMessage) => void): () => void {
    return () => undefined;
  }
}

beforeEach(async () => {
  databaseCounter += 1;
  database = new SunshieldDatabase(
    `sunshield-session-control-${databaseCounter}`
  );
  const notifier = new SilentNotifier();
  repository = new LocalSessionRepository({
    database,
    notifier,
    sourceContextId: "session-control-test"
  });
  await repository.open();

  const start = makeStartSessionCommand();
  await repository.startSession(start, makeClock());
  const identity = {
    getOrCreateLocalVisitorId: async () => "visitor-1",
    getOrCreateDeviceLocalId: async () => "device-1"
  };
  boot = createAppBootController({
    contextId: "session-control-test",
    repository,
    identity,
    connectivity: {
      getCurrentStatus: () => "online",
      subscribe: () => () => undefined
    },
    lifecycle: {
      subscribeForeground: () => () => undefined
    },
    crossContext: notifier
  });
  await boot.ensureBooted();

  idSequence = 0;
  controller = createSessionControlController({
    repository,
    identity,
    boot,
    createId: () => `session-end-id-${++idSequence}`,
    now: () => new Date("2026-07-29T11:00:00.000Z"),
    getConnectivity: () => "online"
  });
});

afterEach(async () => {
  controller.dispose();
  boot.dispose();
  database.close();
  await database.delete();
});

describe("Session control to EndSession transaction", () => {
  it("確認後原子結束 Session、保存原因並讓首頁回到無提醒狀態", async () => {
    const currentSession = boot.currentSession.value;
    if (currentSession === null) {
      throw new Error("Expected an active Session");
    }

    const ended = await controller.endCurrentSession(currentSession);

    expect(ended).toBe(true);
    expect(controller.endPhase.value).toBe("idle");
    expect(controller.endError.value).toBeNull();
    expect(boot.currentSession.value).toBeNull();
    expect(await database.ActiveSessionLocks.count()).toBe(0);
    expect(await database.SessionEndedEvents.count()).toBe(1);
    expect(
      await database.SessionEndedEvents.toCollection().first()
    ).toMatchObject({
      endedReason: "user_ended"
    });
    expect(
      await database.ProtectionSessions.toCollection().first()
    ).toMatchObject({
      overallStatus: "ended",
      endedReason: "user_ended",
      revision: 2
    });
  });
});
