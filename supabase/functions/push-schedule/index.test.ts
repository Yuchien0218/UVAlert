import { describe, expect, it, vi } from "vitest";
import {
  createPushScheduleHandler,
  type PushScheduleDependencies,
  type StoredScheduleState
} from "./handler";

const deviceId = "10000000-0000-4000-8000-000000000001";
const operationId = "20000000-0000-4000-8000-000000000001";
const nextOperationId = "20000000-0000-4000-8000-000000000002";
const authorization = `Device ${deviceId}.AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8`;
const now = new Date("2026-08-30T10:00:00.000Z");
const dueAt = "2026-08-30T10:30:00.000Z";
const intentRevision = 7;

function makeDependencies(
  overrides: Partial<PushScheduleDependencies> = {}
): PushScheduleDependencies {
  return {
    now: vi.fn(() => now),
    authenticateDevice: vi.fn(async () => ({
      state: "authenticated",
      deviceId
    })),
    consumeRateLimit: vi.fn(async () => "allowed"),
    readSchedule: vi.fn(async () => null),
    upsertSchedule: vi.fn(async (input) => ({
      state: "scheduled",
      dueAt: input.dueAt,
      operationId: input.operationId,
      intentRevision: input.intentRevision
    })),
    cancelSchedule: vi.fn(async (input) => ({
      state: "cancelled",
      dueAt: null,
      operationId: input.operationId,
      intentRevision: input.intentRevision
    })),
    reportError: vi.fn(),
    ...overrides
  };
}

function request(
  method: string,
  body?: unknown,
  requestAuthorization: string | undefined = authorization
) {
  const headers = new Headers();
  if (body !== undefined) headers.set("Content-Type", "application/json");
  if (requestAuthorization !== undefined) {
    headers.set("Authorization", requestAuthorization);
  }
  return new Request("https://api.test/push-schedule", {
    method,
    headers,
    body:
      body === undefined
        ? undefined
        : JSON.stringify({ ...body, intentRevision: body.intentRevision ?? intentRevision })
  });
}

describe("anonymous push schedule handler", () => {
  it("returns 204 for OPTIONS without authentication", async () => {
    const dependencies = makeDependencies();
    const response = await createPushScheduleHandler(dependencies)(
      request("OPTIONS", undefined, undefined)
    );

    expect(response.status).toBe(204);
    expect(dependencies.authenticateDevice).not.toHaveBeenCalled();
  });

  it("PUT schedules one due time using server time and device identity", async () => {
    const dependencies = makeDependencies();
    const response = await createPushScheduleHandler(dependencies)(
      request("PUT", { dueAt, operationId, intentRevision })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      state: "scheduled",
      dueAt
    });
    expect(dependencies.upsertSchedule).toHaveBeenCalledWith({
      deviceId,
      dueAt,
      operationId,
      intentRevision,
      now: now.toISOString()
    });
  });

  it("replays the same schedule operation without rewriting", async () => {
    let stored: StoredScheduleState | null = null;
    const upsertSchedule = vi.fn(async (input) => {
      stored = {
        state: "scheduled" as const,
        dueAt: input.dueAt,
        operationId: input.operationId,
        intentRevision: input.intentRevision
      };
      return stored;
    });
    const dependencies = makeDependencies({
      readSchedule: vi.fn(async () => stored),
      upsertSchedule
    });
    const handler = createPushScheduleHandler(dependencies);

    const first = await handler(request("PUT", { dueAt, operationId }));
    const replay = await handler(request("PUT", { dueAt, operationId }));

    expect(first.status).toBe(200);
    expect(replay.status).toBe(200);
    await expect(replay.json()).resolves.toEqual({ state: "scheduled", dueAt });
    expect(upsertSchedule).toHaveBeenCalledOnce();
  });

  it("a new operation overwrites the device single-row schedule", async () => {
    const upsertSchedule = vi.fn(async (input) => ({
      state: "scheduled" as const,
      dueAt: input.dueAt,
      operationId: input.operationId
    }));
    const dependencies = makeDependencies({ upsertSchedule });
    const handler = createPushScheduleHandler(dependencies);
    const replacementDueAt = "2026-08-30T11:00:00.000Z";

    await handler(request("PUT", { dueAt, operationId }));
    await handler(
      request("PUT", { dueAt: replacementDueAt, operationId: nextOperationId })
    );

    expect(upsertSchedule).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        deviceId,
        dueAt: replacementDueAt,
        operationId: nextOperationId
      })
    );
  });

  it("DELETE cancels and repeated cancellation remains successful", async () => {
    let stored: StoredScheduleState | null = null;
    const cancelSchedule = vi.fn(async (input) => {
      stored = {
        state: "cancelled" as const,
        dueAt: null,
        operationId: input.operationId,
        intentRevision: input.intentRevision
      };
      return stored;
    });
    const dependencies = makeDependencies({
      readSchedule: vi.fn(async () => stored),
      cancelSchedule
    });
    const handler = createPushScheduleHandler(dependencies);

    const first = await handler(request("DELETE", { operationId }));
    const replay = await handler(request("DELETE", { operationId }));

    expect(first.status).toBe(200);
    expect(replay.status).toBe(200);
    await expect(replay.json()).resolves.toEqual({ state: "cancelled" });
    expect(cancelSchedule).toHaveBeenCalledOnce();
  });

  it("DELETE forwards authenticated activity time into the atomic schedule operation", async () => {
    const dependencies = makeDependencies();
    const response = await createPushScheduleHandler(dependencies)(
      request("DELETE", { operationId })
    );

    expect(response.status).toBe(200);
    expect(dependencies.cancelSchedule).toHaveBeenCalledWith({
      deviceId,
      operationId,
      intentRevision,
      now: now.toISOString()
    });
  });

  it.each([
    [{ state: "invalid" } as const, 401],
    [{ state: "unavailable" } as const, 500]
  ])(
    "maps authentication state to a controlled response",
    async (state, status) => {
      const dependencies = makeDependencies({
        authenticateDevice: vi.fn(async () => state)
      });
      const response = await createPushScheduleHandler(dependencies)(
        request("PUT", { dueAt, operationId })
      );

      expect(response.status).toBe(status);
      expect(dependencies.upsertSchedule).not.toHaveBeenCalled();
    }
  );

  it("rejects revoked subscriptions and persistent rate limiting", async () => {
    const revoked = await createPushScheduleHandler(
      makeDependencies({
        authenticateDevice: vi.fn(async () => ({ state: "invalid" }))
      })
    )(request("DELETE", { operationId }));
    expect(revoked.status).toBe(401);

    const limitedDependencies = makeDependencies({
      consumeRateLimit: vi.fn(async () => "limited")
    });
    const limited = await createPushScheduleHandler(limitedDependencies)(
      request("DELETE", { operationId })
    );
    expect(limited.status).toBe(429);
    expect(limitedDependencies.cancelSchedule).not.toHaveBeenCalled();
  });

  it("rejects malformed input and unsupported methods", async () => {
    const handler = createPushScheduleHandler(makeDependencies());
    expect(
      (await handler(request("POST", { dueAt, operationId }))).status
    ).toBe(405);
    expect(
      (await handler(request("PUT", { dueAt: "missing-zone", operationId })))
        .status
    ).toBe(422);
  });

  it("returns a controlled 500 without leaking Session data on database failure", async () => {
    const reportError = vi.fn();
    const privateValue = "session-private-value";
    const response = await createPushScheduleHandler(
      makeDependencies({
        upsertSchedule: vi.fn(async () => {
          throw new Error(privateValue);
        }),
        reportError
      })
    )(request("PUT", { dueAt, operationId }));
    const text = await response.text();

    expect(response.status).toBe(500);
    expect(text).not.toContain(privateValue);
    expect(JSON.stringify(reportError.mock.calls)).not.toContain(privateValue);
    expect(reportError).toHaveBeenCalledWith("PUSH_SCHEDULE_WRITE_FAILED");
  });
});
