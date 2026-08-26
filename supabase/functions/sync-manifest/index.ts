import { requirePermanentUser } from "../_shared/auth.ts";
import {
  corsHeaders,
  errorResponse,
  jsonResponse,
  toResponse,
  withCors
} from "../_shared/http.ts";
import {
  readManifestForUser,
  type SyncRecordRow,
  type SyncTombstoneRow
} from "../_shared/sync.ts";

export async function handleManifest(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }
  if (request.method !== "GET") {
    return toResponse(
      errorResponse({
        status: 405,
        code: "VALIDATION_ERROR",
        message: "只接受 GET"
      })
    );
  }

  const auth = await requirePermanentUser(request);
  if (!auth.ok) return auth.response;

  const [recordsResult, tombstonesResult] = await Promise.all([
    auth.context.client
      .from("sync_records")
      .select(
        "record_kind,record_id,schema_version,revision,payload_fingerprint,updated_at"
      )
      .eq("user_id", auth.context.userId),
    auth.context.client
      .from("sync_tombstones")
      .select("record_kind,record_id,schema_version,revision,deleted_at")
      .eq("user_id", auth.context.userId)
  ]);

  if (recordsResult.error !== null || tombstonesResult.error !== null) {
    return toResponse(
      errorResponse({
        status: 500,
        code: "SERVER_ERROR",
        message: "目前無法讀取同步摘要"
      })
    );
  }

  try {
    return jsonResponse(
      readManifestForUser(
        (recordsResult.data ?? []) as SyncRecordRow[],
        (tombstonesResult.data ?? []) as SyncTombstoneRow[],
        new Date().toISOString()
      )
    );
  } catch {
    return toResponse(
      errorResponse({
        status: 500,
        code: "SERVER_ERROR",
        message: "同步資料格式無法驗證"
      })
    );
  }
}

Deno.serve(async (request) => withCors(await handleManifest(request), request));
