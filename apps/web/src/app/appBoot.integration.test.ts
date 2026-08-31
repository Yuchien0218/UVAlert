import {
  LocalSessionRepository,
  NoopCrossContextNotifier,
  SunshieldDatabase
} from "@sunshield/persistence-web";
import {
  makeClock,
  makeProductSnapshot,
  makeStartSessionCommand
} from "@sunshield/test-fixtures";
import { afterEach, describe, expect, it } from "vitest";
import { createNotificationController } from "../features/notification/createNotificationController";
import { IndexedDbLocalIdentity } from "../adapters/IndexedDbLocalIdentity";
import { createAppBootController } from "./createAppBootController";

const databases: SunshieldDatabase[] = [];

afterEach(async () => {
  for (const database of databases.splice(0)) {
    database.close();
    await database.delete();
  }
});

describe("App Boot with real IndexedDB projection", () => {
  it("passes boot connectivity into notification composition without Push API setup", () => {
    const boot = createAppBootController({
      contextId: "notification-wiring",
      repository: {} as never,
      identity: {} as never,
      connectivity: {
        getCurrentStatus: () => "offline",
        subscribe: () => () => undefined
      },
      lifecycle: { subscribeForeground: () => () => undefined },
      crossContext: { subscribe: () => () => undefined }
    });
    const notifications = createNotificationController({
      notifications: {
        isSupported: () => false,
        ensureReady: async () => undefined,
        getPermission: () => "unsupported",
        requestPermission: async () => "unsupported",
        schedule: async () => undefined,
        cancel: async () => undefined,
        cancelAll: async () => undefined,
        canDeliverInBackground: () => false,
        sendTest: async () => false
      },
      remotePush: {
        isSupported: () => false,
        enable: async () => "unsupported",
        schedule: async () => "unsupported",
        cancel: async () => "unsupported",
        disable: async () => "unsupported",
        flushPendingIntent: async () => "unsupported"
      },
      currentSession: boot.currentSession,
      connectivity: boot.connectivity,
      createOperationId: () => "operation-1"
    });

    expect(boot.connectivity.value).toBe("offline");
    expect(notifications.backgroundPushState.value).toBe("unsupported");
    notifications.dispose();
    boot.dispose();
  });

  it("restores the committed session projection for the local visitor", async () => {
    const database = new SunshieldDatabase(
      `web-boot-${Date.now()}-${Math.random()}`
    );
    databases.push(database);
    const notifier = new NoopCrossContextNotifier();
    const repository = new LocalSessionRepository({
      database,
      sourceContextId: "writer",
      notifier
    });
    const identity = new IndexedDbLocalIdentity({
      database,
      createId: () => "visitor-1"
    });
    const command = makeStartSessionCommand({
      idPrefix: "web-boot",
      snapshot: makeProductSnapshot({
        reapplicationIntervalStatus: "explicit_minutes",
        reapplicationIntervalMinutes: 120
      })
    });

    await repository.open();
    const result = await repository.startSession(
      command,
      makeClock("2026-07-29T11:00:00.000Z")
    );
    expect(result.ok).toBe(true);

    const controller = createAppBootController({
      contextId: "reader",
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

    await controller.ensureBooted();

    expect(controller.phase.value).toBe("ready");
    expect(controller.currentSession.value?.sessionId).toBe(command.sessionId);
    expect(
      controller.currentSession.value?.primaryAction.presentationType
    ).toBe("timed_ring");
    expect(controller.currentSession.value?.zones).toHaveLength(1);
  });

  it("creates the local visitor id atomically and reuses it", async () => {
    const database = new SunshieldDatabase(
      `web-identity-${Date.now()}-${Math.random()}`
    );
    databases.push(database);
    let calls = 0;
    const identity = new IndexedDbLocalIdentity({
      database,
      createId: () => {
        calls += 1;
        return "visitor-stable";
      }
    });

    const [first, second] = await Promise.all([
      identity.getOrCreateLocalVisitorId(),
      identity.getOrCreateLocalVisitorId()
    ]);

    expect(first).toBe("visitor-stable");
    expect(second).toBe("visitor-stable");
    expect(calls).toBe(1);
    expect(await database.AppMetadata.count()).toBe(1);
  });
});
