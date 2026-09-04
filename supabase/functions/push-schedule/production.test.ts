import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const deviceId = "10000000-0000-4000-8000-000000000001";
const operationId = "20000000-0000-4000-8000-000000000001";
const legacyOperationId = "20000000-0000-4000-8000-000000000002";
const dueAt = "2026-08-30T10:30:00.000Z";

const runtime = vi.hoisted(() => {
  let servedHandler: ((request: Request) => Promise<Response>) | undefined;
  let selectedScheduleColumns = "";
  const scheduleRow: Record<string, unknown> = {
    status: "pending",
    due_at: "2026-08-30T10:30:00.000Z",
    last_operation_id: "20000000-0000-4000-8000-000000000001",
    last_intent_revision: 7
  };

  function projectedScheduleRow() {
    const selected = new Set(selectedScheduleColumns.split(","));
    return Object.fromEntries(
      Object.entries(scheduleRow).filter(([key]) => selected.has(key))
    );
  }

  const client = {
    from: vi.fn((table: string) => ({
      select: vi.fn((columns: string) => {
        if (table === "push_schedules") selectedScheduleColumns = columns;
        return {
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({
              data:
                table === "push_subscriptions"
                  ? { device_secret_hash: "hash", status: "active" }
                  : projectedScheduleRow(),
              error: null
            }))
          }))
        };
      })
    })),
    rpc: vi.fn(async (name: string) => {
      if (name === "consume_push_rate_limit") {
        return { data: true, error: null };
      }
      if (name === "apply_push_schedule_operation") {
        return {
          data: [
            {
              state: "scheduled",
              due_at: "2026-08-30T10:30:00.000Z",
              operation_id: operationId,
              replayed: false
            }
          ],
          error: null
        };
      }
      return { data: null, error: new Error("unexpected write") };
    })
  };

  return {
    client,
    getServedHandler: () => servedHandler,
    setServedHandler: (handler: (request: Request) => Promise<Response>) => {
      servedHandler = handler;
    },
    reset() {
      servedHandler = undefined;
      selectedScheduleColumns = "";
      client.from.mockClear();
      client.rpc.mockClear();
    }
  };
});

vi.mock("npm:@supabase/supabase-js@2", () => ({
  createClient: vi.fn(() => runtime.client)
}));

vi.mock("../_shared/push-auth.ts", () => ({
  parseDeviceAuthorization: vi.fn(() => ({
    deviceId,
    deviceSecret: "device-secret"
  })),
  verifyDeviceSecret: vi.fn(async () => true)
}));

describe("production push schedule dependencies", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-30T10:00:00.000Z"));
    vi.resetModules();
    runtime.reset();
    vi.stubGlobal("Deno", {
      env: {
        get: (key: string) =>
          ({
            SUPABASE_URL: "https://project.supabase.co",
            SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
            DEVICE_CREDENTIAL_PEPPER: "pepper"
          })[key]
      },
      serve: runtime.setServedHandler
    });
    await import("./index.ts");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("replays a stored operation using the actual selected row shape", async () => {
    const handler = runtime.getServedHandler();
    expect(handler).toBeDefined();

    const response = await handler!(
      new Request("https://api.test/push-schedule", {
        method: "PUT",
        headers: {
          Authorization: `Device ${deviceId}.device-secret`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ dueAt, operationId, intentRevision: 7 })
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      state: "scheduled",
      dueAt
    });
  });

  it("routes a pre-revision request through the compatibility RPC signature", async () => {
    const handler = runtime.getServedHandler();
    expect(handler).toBeDefined();

    const response = await handler!(
      new Request("https://api.test/push-schedule", {
        method: "PUT",
        headers: {
          Authorization: `Device ${deviceId}.device-secret`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ dueAt, operationId: legacyOperationId })
      })
    );

    expect(response.status).toBe(200);
    expect(runtime.client.rpc).toHaveBeenCalledWith(
      "apply_push_schedule_operation",
      {
        p_device_id: deviceId,
        p_operation_id: legacyOperationId,
        p_action: "schedule",
        p_due_at: dueAt,
        p_now: "2026-08-30T10:00:00.000Z"
      }
    );
  });
});
