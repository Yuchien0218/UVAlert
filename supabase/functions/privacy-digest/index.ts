import { createClient } from "npm:@supabase/supabase-js@2";
import { constantTimeEqual } from "../_shared/push-auth.ts";
import { sendResendEmail } from "./email.ts";
import {
  createPrivacyDigestHandler,
  createPrivacyDigestRpcDependencies,
  type PrivacyDigestDependencies
} from "./handler.ts";

function createProductionDependencies(): PrivacyDigestDependencies {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const client =
    !supabaseUrl?.trim() || !serviceRoleKey?.trim()
      ? null
      : createClient(supabaseUrl, serviceRoleKey, {
          auth: { persistSession: false, autoRefreshToken: false }
        });

  function requireClient() {
    if (client === null) {
      throw new Error("PRIVACY_DIGEST_DATABASE_NOT_CONFIGURED");
    }
    return client;
  }

  const rpcDependencies = createPrivacyDigestRpcDependencies({
    async rpc(name, parameters) {
      return await requireClient().rpc(name, parameters);
    }
  });

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
    claim: rpcDependencies.claim,
    settle: rpcDependencies.settle,
    sendEmail(input) {
      return sendResendEmail(
        globalThis.fetch,
        input.apiKey,
        input.recipient,
        input.email,
        input.idempotencyKey
      );
    },
    now() {
      return new Date();
    },
    reportError(code) {
      console.error(code);
    }
  };
}

async function sha256(value: string): Promise<Uint8Array> {
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))
  );
}

const handlePrivacyDigest = createPrivacyDigestHandler(
  createProductionDependencies()
);

Deno.serve(handlePrivacyDigest);
