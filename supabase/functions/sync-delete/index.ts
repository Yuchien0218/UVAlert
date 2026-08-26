import { requirePermanentUser } from "../_shared/auth.ts";
import {
  corsHeaders,
  errorResponse,
  jsonResponse,
  toResponse,
  withCors
} from "../_shared/http.ts";
import {
  parseSyncDeleteRequest,
  SyncValidationError,
  validateSyncDeleteResult
} from "../_shared/sync.ts";

export async function handleDelete(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }
  if (request.method !== "POST") {
    return toResponse(
      errorResponse({
        status: 405,
        code: "VALIDATION_ERROR",
        message: "只接受 POST"
      })
    );
  }
  const auth = await requirePermanentUser(request);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return toResponse(
      errorResponse({
        status: 422,
        code: "VALIDATION_ERROR",
        message: "JSON 格式不正確"
      })
    );
  }

  let parsed;
  try {
    parsed = parseSyncDeleteRequest(body);
  } catch (error) {
    return toResponse(
      errorResponse({
        status: 422,
        code: "VALIDATION_ERROR",
        message:
          error instanceof SyncValidationError
            ? error.message
            : "同步資料格式不正確"
      })
    );
  }

  const { data, error } = await auth.context.client.rpc("delete_sync_batch", {
    p_user_id: auth.context.userId,
    p_idempotency_key: parsed.idempotencyKey,
    p_records: parsed.records,
    p_now: new Date().toISOString()
  });
  if (error !== null) {
    if (error.code === "40001" || error.message === "SYNC_CONFLICT") {
      return toResponse(
        errorResponse({
          status: 409,
          code: "SYNC_CONFLICT",
          message: "同步資料版本已在其他裝置更新"
        })
      );
    }
    return toResponse(
      errorResponse({
        status: 500,
        code: "SERVER_ERROR",
        message: "刪除同步資料尚未完成"
      })
    );
  }

  try {
    return jsonResponse(validateSyncDeleteResult(data));
  } catch {
    return toResponse(
      errorResponse({
        status: 500,
        code: "SERVER_ERROR",
        message: "同步服務回應格式不正確"
      })
    );
  }
}

Deno.serve(async (request) => withCors(await handleDelete(request), request));
