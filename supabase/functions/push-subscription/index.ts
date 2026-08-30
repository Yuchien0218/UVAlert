import { createClient } from "npm:@supabase/supabase-js@2";
import { withCors } from "../_shared/http.ts";
import {
  createDeviceCredentials,
  hashDeviceSecret,
  verifyDeviceSecret
} from "../_shared/push-auth.ts";
import {
  createPushSubscriptionHandler,
  type PushSubscriptionDependencies
} from "./handler.ts";

function createProductionDependencies(): PushSubscriptionDependencies {
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

  return {
    readSecret(name) {
      return Deno.env.get(name);
    },
    now() {
      return new Date();
    },
    createCredentials() {
      return createDeviceCredentials({
        createDeviceId: () => crypto.randomUUID(),
        randomBytes(length) {
          return crypto.getRandomValues(new Uint8Array(length));
        }
      });
    },
    hashSecret: hashDeviceSecret,
    verifySecret: verifyDeviceSecret,
    hashRateLimitKey: hashDeviceSecret,
    readClientAddress(request) {
      return (
        request.headers.get("cf-connecting-ip") ??
        request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim() ??
        "unknown"
      );
    },
    async consumeRateLimit(input) {
      const { data, error } = await requireClient().rpc(
        "consume_push_rate_limit",
        {
          p_scope: input.scope,
          p_key_hash: input.keyHash,
          p_limit: input.limit,
          p_window: input.window,
          p_now: input.now
        }
      );
      if (error !== null || typeof data !== "boolean") {
        throw new Error("PUSH_RATE_LIMIT_FAILED");
      }
      return data;
    },
    async createSubscription(input) {
      const { error } = await requireClient()
        .from("push_subscriptions")
        .insert({
          device_id: input.deviceId,
          device_secret_hash: input.deviceSecretHash,
          endpoint: input.subscription.endpoint,
          p256dh: input.subscription.keys.p256dh,
          auth: input.subscription.keys.auth,
          status: "active",
          created_at: input.now,
          updated_at: input.now,
          last_active_at: input.now
        });
      if (error !== null) throw new Error("PUSH_SUBSCRIPTION_CREATE_FAILED");
    },
    async readSubscriptionAuth(deviceId) {
      const { data, error } = await requireClient()
        .from("push_subscriptions")
        .select("device_secret_hash,status")
        .eq("device_id", deviceId)
        .maybeSingle();
      if (error !== null) throw new Error("PUSH_SUBSCRIPTION_READ_FAILED");
      if (data === null) return null;
      return {
        deviceSecretHash: data.device_secret_hash,
        status: data.status
      };
    },
    async updateSubscription(input) {
      const { data, error } = await requireClient()
        .from("push_subscriptions")
        .update({
          endpoint: input.subscription.endpoint,
          p256dh: input.subscription.keys.p256dh,
          auth: input.subscription.keys.auth,
          updated_at: input.now,
          last_active_at: input.now
        })
        .eq("device_id", input.deviceId)
        .eq("status", "active")
        .select("device_id")
        .maybeSingle();
      if (error !== null) throw new Error("PUSH_SUBSCRIPTION_UPDATE_FAILED");
      return data !== null;
    },
    async deleteSubscription(deviceId) {
      const { data, error } = await requireClient()
        .from("push_subscriptions")
        .delete()
        .eq("device_id", deviceId)
        .eq("status", "active")
        .select("device_id")
        .maybeSingle();
      if (error !== null) throw new Error("PUSH_SUBSCRIPTION_DELETE_FAILED");
      return data !== null;
    },
    reportError(code) {
      console.error(code);
    },
    allowLocalHttp: supabaseUrl !== undefined && isLocalSupabaseUrl(supabaseUrl)
  };
}

function isLocalSupabaseUrl(value: string): boolean {
  try {
    return ["localhost", "127.0.0.1"].includes(new URL(value).hostname);
  } catch {
    return false;
  }
}

const handleSubscription = createPushSubscriptionHandler(
  createProductionDependencies()
);

Deno.serve(async (request) =>
  withCors(await handleSubscription(request), request)
);
