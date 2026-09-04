import { createClient } from "npm:@supabase/supabase-js@2";
import { withCors } from "../_shared/http.ts";
import {
  parseDeviceAuthorization,
  verifyDeviceSecret
} from "../_shared/push-auth.ts";
import {
  createPushScheduleHandler,
  type PushScheduleDependencies,
  type StoredScheduleState
} from "./handler.ts";

const dummySecretHash = "0".repeat(64);

function createProductionDependencies(): PushScheduleDependencies {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const client =
    supabaseUrl === undefined || serviceRoleKey === undefined
      ? null
      : createClient(supabaseUrl, serviceRoleKey, {
          auth: { persistSession: false, autoRefreshToken: false }
        });

  function requireClient() {
    if (client === null) throw new Error("PUSH_DATABASE_NOT_CONFIGURED");
    return client;
  }

  async function applyOperation(input: {
    deviceId: string;
    operationId: string;
    action: "schedule" | "cancel";
    dueAt: string | null;
    intentRevision: number;
    now: string;
  }): Promise<StoredScheduleState> {
    const { data, error } = await requireClient().rpc(
      "apply_push_schedule_operation",
      {
        p_device_id: input.deviceId,
        p_operation_id: input.operationId,
        p_action: input.action,
        p_due_at: input.dueAt,
        p_now: input.now,
        p_intent_revision: input.intentRevision
      }
    );
    if (error !== null || !Array.isArray(data) || data.length !== 1) {
      throw new Error("PUSH_SCHEDULE_OPERATION_FAILED");
    }
    const row = data[0] as Record<string, unknown>;
    if (
      !["scheduled", "cancelled"].includes(String(row.state)) ||
      typeof row.operation_id !== "string"
    ) {
      throw new Error("PUSH_SCHEDULE_RESULT_INVALID");
    }
    return {
      state: row.state as "scheduled" | "cancelled",
      dueAt: typeof row.due_at === "string" ? row.due_at : null,
      operationId: row.operation_id,
      intentRevision: Number(row.intent_revision)
    };
  }

  return {
    now() {
      return new Date();
    },
    async authenticateDevice(authorization) {
      const pepper = Deno.env.get("DEVICE_CREDENTIAL_PEPPER");
      if (pepper === undefined || pepper.trim() === "") {
        return { state: "unavailable" };
      }
      let credentials;
      try {
        credentials = parseDeviceAuthorization(authorization);
      } catch {
        return { state: "invalid" };
      }
      try {
        const { data, error } = await requireClient()
          .from("push_subscriptions")
          .select("device_secret_hash,status")
          .eq("device_id", credentials.deviceId)
          .maybeSingle();
        if (error !== null) throw new Error("PUSH_SUBSCRIPTION_READ_FAILED");
        const matches = await verifyDeviceSecret(
          credentials.deviceSecret,
          data?.device_secret_hash ?? dummySecretHash,
          pepper
        );
        return data?.status === "active" && matches
          ? { state: "authenticated", deviceId: credentials.deviceId }
          : { state: "invalid" };
      } catch {
        console.error("PUSH_SCHEDULE_AUTH_FAILED");
        return { state: "unavailable" };
      }
    },
    async consumeRateLimit(input) {
      try {
        const { data, error } = await requireClient().rpc(
          "consume_push_rate_limit",
          {
            p_scope: "device",
            p_key_hash: input.deviceId,
            p_limit: input.limit,
            p_window: input.window,
            p_now: input.now
          }
        );
        if (error !== null || typeof data !== "boolean") {
          throw new Error("PUSH_RATE_LIMIT_FAILED");
        }
        return data ? "allowed" : "limited";
      } catch {
        return "unavailable";
      }
    },
    async readSchedule(deviceId) {
      const { data, error } = await requireClient()
        .from("push_schedules")
        .select("status,due_at,last_operation_id")
        .eq("device_id", deviceId)
        .maybeSingle();
      if (error !== null) throw new Error("PUSH_SCHEDULE_READ_FAILED");
      if (data === null) return null;
      return {
        state: data.status === "cancelled" ? "cancelled" : "scheduled",
        dueAt: data.status === "cancelled" ? null : data.due_at,
        operationId: data.last_operation_id,
        intentRevision: Number(data.last_intent_revision)
      };
    },
    upsertSchedule(input) {
      return applyOperation({ ...input, action: "schedule" });
    },
    cancelSchedule(input) {
      return applyOperation({ ...input, action: "cancel", dueAt: null });
    },
    reportError(code) {
      console.error(code);
    }
  };
}

const handleSchedule = createPushScheduleHandler(
  createProductionDependencies()
);

Deno.serve(async (request) => withCors(await handleSchedule(request), request));
