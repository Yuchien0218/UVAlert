import { createClient } from "npm:@supabase/supabase-js@2";
import { requirePermanentUser } from "../_shared/auth.ts";
import {
  AccountValidationError,
  parseAccountDeleteRequest
} from "../_shared/account.ts";
import {
  corsHeaders,
  errorResponse,
  jsonResponse,
  toResponse,
  withCors
} from "../_shared/http.ts";

export async function handleAccountDelete(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }
  if (request.method !== "POST") {
    return toResponse(errorResponse({ status: 405, code: "VALIDATION_ERROR", message: "只接受 POST" }));
  }
  const auth = await requirePermanentUser(request);
  if (!auth.ok) return auth.response;

  try {
    parseAccountDeleteRequest(await request.json());
  } catch (error) {
    return toResponse(errorResponse({
      status: 422,
      code: "VALIDATION_ERROR",
      message: error instanceof AccountValidationError ? error.message : "JSON 格式不正確"
    }));
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (supabaseUrl === undefined || serviceRoleKey === undefined) {
    return toResponse(errorResponse({ status: 500, code: "SERVER_ERROR", message: "帳號服務尚未完成設定" }));
  }
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  // These tables are UVAlert-owned data.  The RPC deletes them in one
  // database transaction. Feedback is anonymous and has no user_id, so it is
  // intentionally not removed by account deletion.
  const { error: dataError } = await adminClient.rpc("delete_uvalert_sync_data", {
    p_user_id: auth.context.userId
  });
  if (dataError !== null) {
    return toResponse(errorResponse({ status: 500, code: "SERVER_ERROR", message: "雲端資料尚未清除" }));
  }

  const { error } = await adminClient.auth.admin.deleteUser(auth.context.userId);
  if (error !== null) {
    return toResponse(errorResponse({ status: 500, code: "SERVER_ERROR", message: "UVAlert 帳號尚未刪除" }));
  }
  // Do not return the Auth user id, provider identity, or token.
  return jsonResponse({ deleted: true });
}

Deno.serve(async (request) => withCors(await handleAccountDelete(request), request));
