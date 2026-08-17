import { requirePermanentUser } from "../_shared/auth.ts";
import {
  corsHeaders,
  errorResponse,
  jsonResponse,
  toResponse,
  withCors
} from "../_shared/http.ts";
import {
  parseSyncCommitRequest,
  SyncValidationError,
  validateSyncCommitResult
} from "../_shared/sync.ts";

export async function handleCommit(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }
  if (request.method !== "POST") {
    return toResponse(
      errorResponse({ status: 405, code: "VALIDATION_ERROR", message: "只接受 POST" })
    );
  }
  const auth = await requirePermanentUser(request);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return toResponse(
      errorResponse({ status: 422, code: "VALIDATION_ERROR", message: "JSON 格式不正確" })
    );
  }

  let parsed;
  try {
    parsed = parseSyncCommitRequest(body);
  } catch (error) {
    return toResponse(
      errorResponse({
        status: 422,
        code: "VALIDATION_ERROR",
        message: error instanceof SyncValidationError ? error.message : "同步資料格式不正確"
      })
    );
  }

  const { data, error } = await auth.context.client.rpc("commit_sync_batch", {
    p_user_id: auth.context.userId,
    p_idempotency_key: parsed.idempotencyKey,
    p_records: parsed.records,
    p_tombstones: parsed.tombstones,
    p_now: new Date().toISOString()
  });
  if (error !== null) {
    if (isConflictError(error)) {
      return toResponse(
        errorResponse({ status: 409, code: "SYNC_CONFLICT", message: "同步資料版本已在其他裝置更新" })
      );
    }
    return toResponse(
      errorResponse({ status: 500, code: "SERVER_ERROR", message: "同步尚未完成，本機資料維持原狀" })
    );
  }

  try {
    return jsonResponse(validateSyncCommitResult(data));
  } catch {
    return toResponse(
      errorResponse({ status: 500, code: "SERVER_ERROR", message: "同步服務回應格式不正確" })
    );
  }
}

function isConflictError(error: { code?: string; message?: string; details?: string }): boolean {
  return (
    error.code === "40001" ||
    error.message === "SYNC_CONFLICT" ||
    error.details?.includes("SYNC_CONFLICT") === true
  );
}

Deno.serve(async (request) => withCors(await handleCommit(request), request));
