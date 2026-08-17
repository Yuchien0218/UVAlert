import { requirePermanentUser } from "../_shared/auth.ts";
import {
  corsHeaders,
  errorResponse,
  jsonResponse,
  toResponse,
  withCors
} from "../_shared/http.ts";
import {
  parseSyncReadRequest,
  readSelectedRecords,
  SyncValidationError,
  type SyncRecordRow,
  type SyncTombstoneRow
} from "../_shared/sync.ts";

export async function handleRead(request: Request): Promise<Response> {
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

  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch {
    return toResponse(
      errorResponse({ status: 422, code: "VALIDATION_ERROR", message: "JSON 格式不正確" })
    );
  }

  try {
    const parsed = parseSyncReadRequest(requestBody);
    const [recordsResult, tombstonesResult] = await Promise.all([
      auth.context.client
        .from("sync_records")
        .select("record_kind,record_id,schema_version,revision,payload_fingerprint,payload,updated_at")
        .eq("user_id", auth.context.userId),
      auth.context.client
        .from("sync_tombstones")
        .select("record_kind,record_id,schema_version,revision,deleted_at")
        .eq("user_id", auth.context.userId)
    ]);
    if (recordsResult.error !== null || tombstonesResult.error !== null) {
      return toResponse(
        errorResponse({ status: 500, code: "SERVER_ERROR", message: "目前無法讀取同步資料" })
      );
    }
    return jsonResponse(
      readSelectedRecords(
        (recordsResult.data ?? []) as SyncRecordRow[],
        (tombstonesResult.data ?? []) as SyncTombstoneRow[],
        parsed.recordKeys
      )
    );
  } catch (error) {
    const message =
      error instanceof SyncValidationError
        ? error.message
        : "同步資料格式無法驗證";
    return toResponse(
      errorResponse({ status: 422, code: "VALIDATION_ERROR", message })
    );
  }
}

Deno.serve(async (request) => withCors(await handleRead(request), request));
