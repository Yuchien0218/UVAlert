import { createClient } from "npm:@supabase/supabase-js@2";
import webPush from "web-push";
import { constantTimeEqual } from "../_shared/push-auth.ts";
import {
  createPushDispatcher,
  type ClaimedPushSchedule,
  type PushDispatcherDependencies
} from "./handler.ts";
import { createPushSender } from "./pushSender.ts";

function createProductionDependencies(): PushDispatcherDependencies {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const client =
    supabaseUrl === undefined || serviceRoleKey === undefined
      ? null
      : createClient(supabaseUrl, serviceRoleKey, {
          auth: { persistSession: false, autoRefreshToken: false }
        });
  const sender = createPushSender({
    sendNotification(subscription, payload, options) {
      return webPush.sendNotification(subscription, payload, options);
    }
  });

  function requireClient() {
    if (client === null) throw new Error("PUSH_DATABASE_NOT_CONFIGURED");
    return client;
  }

  return {
    readSecret(name) {
      return Deno.env.get(name);
    },
    async compareSecret(left, right) {
      const [leftDigest, rightDigest] = await Promise.all([
        sha256(left),
        sha256(right)
      ]);
      return constantTimeEqual(leftDigest, rightDigest);
    },
    now() {
      return new Date();
    },
    async claimDue(input) {
      const { data, error } = await requireClient().rpc(
        "claim_due_push_schedules",
        {
          p_limit: input.limit,
          p_now: input.now,
          p_lease: input.lease
        }
      );
      if (error !== null || !Array.isArray(data)) {
        throw new Error("PUSH_CLAIM_FAILED");
      }
      return data.map(mapClaimedSchedule);
    },
    async renewClaim(input) {
      const { data, error } = await requireClient().rpc(
        "renew_push_schedule_claim",
        {
          p_device_id: input.deviceId,
          p_claim_token: input.claimToken,
          p_endpoint: input.endpoint,
          p_p256dh: input.p256dh,
          p_auth: input.auth,
          p_now: input.now
        }
      );
      if (error !== null || typeof data !== "boolean") {
        throw new Error("PUSH_CLAIM_RENEWAL_FAILED");
      }
      return data;
    },
    send: sender,
    async settle(input) {
      const { data, error } = await requireClient().rpc(
        "settle_claimed_push_schedule",
        {
          p_device_id: input.deviceId,
          p_claim_token: input.claimToken,
          p_endpoint: input.endpoint,
          p_p256dh: input.p256dh,
          p_auth: input.auth,
          p_outcome: input.outcome,
          p_now: input.now,
          p_error_code: input.errorCode,
          p_retry_at: input.retryAt
        }
      );
      if (error !== null || typeof data !== "boolean") {
        throw new Error("PUSH_SETTLEMENT_FAILED");
      }
      return data;
    },
    async expireSubscription(input) {
      const { data, error } = await requireClient().rpc(
        "expire_claimed_push_subscription",
        {
          p_device_id: input.deviceId,
          p_claim_token: input.claimToken,
          p_endpoint: input.endpoint,
          p_p256dh: input.p256dh,
          p_auth: input.auth,
          p_now: input.now
        }
      );
      if (error !== null || typeof data !== "boolean") {
        throw new Error("PUSH_EXPIRY_FAILED");
      }
      return data;
    },
    reportError(code) {
      console.error(code);
    }
  };
}

function mapClaimedSchedule(row: Record<string, unknown>): ClaimedPushSchedule {
  const mapped = {
    deviceId: row.device_id,
    endpoint: row.endpoint,
    p256dh: row.p256dh,
    auth: row.auth,
    dueAt: row.due_at,
    attemptCount: row.attempt_count,
    claimToken: row.claim_token
  };
  if (
    typeof mapped.deviceId !== "string" ||
    typeof mapped.endpoint !== "string" ||
    typeof mapped.p256dh !== "string" ||
    typeof mapped.auth !== "string" ||
    typeof mapped.dueAt !== "string" ||
    typeof mapped.attemptCount !== "number" ||
    typeof mapped.claimToken !== "string"
  ) {
    throw new Error("PUSH_CLAIM_RESULT_INVALID");
  }
  return mapped as ClaimedPushSchedule;
}

async function sha256(value: string): Promise<Uint8Array> {
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))
  );
}

const handleDispatch = createPushDispatcher(createProductionDependencies());

Deno.serve(handleDispatch);
