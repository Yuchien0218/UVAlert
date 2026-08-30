import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { SunshieldDatabase } from "../db/database";
import { LocalPushStateRepository } from "./local-push-state-repository";

const databases: SunshieldDatabase[] = [];

afterEach(async () => {
  await Promise.all(databases.map((database) => database.delete()));
  databases.length = 0;
});

function makeRepository(name: string): LocalPushStateRepository {
  const database = new SunshieldDatabase(`${name}-${crypto.randomUUID()}`);
  databases.push(database);
  return new LocalPushStateRepository(database);
}

describe("LocalPushStateRepository", () => {
  it("persists credentials for the current anonymous device", async () => {
    const repository = makeRepository("push-credentials");

    await expect(repository.readCredentials()).resolves.toBeNull();

    await repository.writeCredentials({
      deviceId: "device-a",
      deviceSecret: "secret-a"
    });

    await expect(repository.readCredentials()).resolves.toEqual({
      deviceId: "device-a",
      deviceSecret: "secret-a"
    });

    await repository.clearCredentials();
    await expect(repository.readCredentials()).resolves.toBeNull();
  });

  it("keeps only the latest remote delivery intent", async () => {
    const repository = makeRepository("push-latest-intent");

    await repository.replacePendingIntent({
      kind: "schedule",
      dueAt: "2026-08-30T10:30:00.000Z",
      operationId: "11111111-1111-4111-8111-111111111111"
    });
    await repository.replacePendingIntent({
      kind: "cancel",
      operationId: "22222222-2222-4222-8222-222222222222"
    });

    await expect(repository.readPendingIntent()).resolves.toEqual({
      kind: "cancel",
      operationId: "22222222-2222-4222-8222-222222222222"
    });
  });

  it("does not let an older response clear a newer pending intent", async () => {
    const repository = makeRepository("push-intent-race");
    const olderOperationId = "11111111-1111-4111-8111-111111111111";
    const newerOperationId = "22222222-2222-4222-8222-222222222222";

    await repository.replacePendingIntent({
      kind: "schedule",
      dueAt: "2026-08-30T10:30:00.000Z",
      operationId: newerOperationId
    });

    await repository.clearPendingIntent(olderOperationId);
    await expect(repository.readPendingIntent()).resolves.toEqual({
      kind: "schedule",
      dueAt: "2026-08-30T10:30:00.000Z",
      operationId: newerOperationId
    });

    await repository.clearPendingIntent(newerOperationId);
    await expect(repository.readPendingIntent()).resolves.toBeNull();
  });

  it("updates credentials without discarding the pending intent", async () => {
    const repository = makeRepository("push-shared-record");

    await repository.replacePendingIntent({
      kind: "cancel",
      operationId: "33333333-3333-4333-8333-333333333333"
    });
    await repository.writeCredentials({
      deviceId: "device-b",
      deviceSecret: "secret-b"
    });

    await expect(repository.readPendingIntent()).resolves.toEqual({
      kind: "cancel",
      operationId: "33333333-3333-4333-8333-333333333333"
    });
  });
});
