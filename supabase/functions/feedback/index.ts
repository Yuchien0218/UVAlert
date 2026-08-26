import { createClient } from "npm:@supabase/supabase-js@2";
import {
  canonicalFeedback,
  FeedbackValidationError,
  parseFeedbackRequest,
  type FeedbackReceipt
} from "../_shared/feedback.ts";
import {
  hashClientFingerprint,
  SlidingWindowRateLimiter
} from "../_shared/rate-limit.ts";
import {
  corsHeaders,
  errorResponse,
  jsonResponse,
  toResponse,
  withCors
} from "../_shared/http.ts";

const limiter = new SlidingWindowRateLimiter({
  maxRequests: 5,
  windowMs: 10 * 60 * 1000
});

export async function handleFeedback(request: Request): Promise<Response> {
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

  let parsed;
  try {
    parsed = parseFeedbackRequest(await request.json());
  } catch (error) {
    return toResponse(
      errorResponse({
        status: 422,
        code: "VALIDATION_ERROR",
        message:
          error instanceof FeedbackValidationError
            ? error.message
            : "JSON 格式不正確"
      })
    );
  }

  const fingerprint = await hashClientFingerprint([
    request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-forwarded-for") ??
      "unknown",
    request.headers.get("user-agent") ?? "unknown"
  ]);
  const limit = limiter.check(fingerprint);
  if (!limit.allowed) {
    const response = toResponse(
      errorResponse({
        status: 429,
        code: "RATE_LIMITED",
        message: "回報次數較多，請稍後再試"
      })
    );
    response.headers.set("Retry-After", String(limit.retryAfterSeconds));
    return response;
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (supabaseUrl === undefined || serviceRoleKey === undefined) {
    return toResponse(
      errorResponse({
        status: 500,
        code: "SERVER_ERROR",
        message: "回報服務尚未完成設定"
      })
    );
  }
  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const dedupeHash = await hashClientFingerprint([
    fingerprint,
    canonicalFeedback(parsed)
  ]);
  const existing = await client
    .from("feedback_submissions")
    .select("id,created_at")
    .eq("dedupe_hash", dedupeHash)
    .maybeSingle();
  if (existing.error !== null) {
    return toResponse(
      errorResponse({
        status: 500,
        code: "SERVER_ERROR",
        message: "目前無法處理回報"
      })
    );
  }
  if (existing.data !== null) {
    return jsonResponse(toReceipt(existing.data));
  }

  const createdAt = new Date().toISOString();
  const insertResult = await client
    .from("feedback_submissions")
    .insert({
      feedback_type: parsed.feedbackType,
      message: parsed.message,
      contact_email: parsed.contactEmail,
      app_version: parsed.appVersion,
      route: parsed.route,
      user_agent_summary: parsed.userAgentSummary,
      dedupe_hash: dedupeHash,
      created_at: createdAt,
      updated_at: createdAt
    })
    .select("id,created_at")
    .single();
  if (insertResult.error !== null) {
    // A concurrent identical request can win the unique dedupe index.  Read
    // that receipt instead of creating another row or exposing DB details.
    const duplicate = await client
      .from("feedback_submissions")
      .select("id,created_at")
      .eq("dedupe_hash", dedupeHash)
      .maybeSingle();
    if (duplicate.error === null && duplicate.data !== null) {
      return jsonResponse(toReceipt(duplicate.data));
    }
    return toResponse(
      errorResponse({
        status: 500,
        code: "SERVER_ERROR",
        message: "回報尚未送出"
      })
    );
  }
  return jsonResponse(toReceipt(insertResult.data));
}

function toReceipt(row: { id: string; created_at: string }): FeedbackReceipt {
  return {
    schemaVersion: "feedback-v1",
    receiptId: row.id,
    createdAt: new Date(row.created_at).toISOString()
  };
}

Deno.serve(async (request) => withCors(await handleFeedback(request), request));
