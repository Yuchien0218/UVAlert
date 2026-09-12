import { createClient } from "npm:@supabase/supabase-js@2";
import {
  corsHeaders,
  errorResponse,
  jsonResponse,
  toResponse,
  withCors
} from "../_shared/http.ts";
import { sendLinePushNotification } from "../_shared/line.ts";

export interface LineSubscriptionDeps {
  fetch?: typeof fetch;
  readEnv?: (key: string) => string | undefined;
  createDbClient?: (url: string, key: string) => any;
}

export async function handleLineSubscription(
  request: Request,
  deps: LineSubscriptionDeps = {}
): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  const readEnv =
    deps.readEnv ??
    ((key: string) => {
      try {
        return (
          globalThis.Deno?.env.get(key) ??
          (typeof process !== "undefined" ? process.env[key] : undefined)
        );
      } catch {
        return undefined;
      }
    });

  const fetchFn = deps.fetch ?? globalThis.fetch;

  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "");
  const action = path.split("/").pop();

  const supabaseUrl = readEnv("SUPABASE_URL");
  const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return toResponse(
      errorResponse({
        status: 500,
        code: "SERVER_ERROR",
        message: "服務尚未完成設定"
      })
    );
  }

  const dbClient =
    deps.createDbClient?.(supabaseUrl, serviceRoleKey) ??
    createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

  // 1. 查詢綁定狀態: POST/GET /status
  if (action === "status" || request.method === "GET") {
    let visitorId = url.searchParams.get("visitorId");
    if (!visitorId && request.method === "POST") {
      try {
        const body = await request.json();
        visitorId = body.localVisitorId ?? body.visitorId;
      } catch {
        // ignore
      }
    }

    if (!visitorId?.trim()) {
      return toResponse(
        errorResponse({
          status: 400,
          code: "VALIDATION_ERROR",
          message: "缺少訪客識別碼"
        })
      );
    }

    const { data, error } = await dbClient
      .from("line_push_subscriptions")
      .select("line_user_id, status")
      .eq("local_visitor_id", visitorId.trim())
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      return toResponse(
        errorResponse({
          status: 500,
          code: "DB_ERROR",
          message: "查詢狀態失敗"
        })
      );
    }

    return jsonResponse({
      bound: data !== null,
      lineUserId: data?.line_user_id
    });
  }

  // 2. 解除綁定: POST /unbind or DELETE
  if (action === "unbind" || request.method === "DELETE") {
    let visitorId = url.searchParams.get("visitorId");
    if (!visitorId) {
      try {
        const body = await request.json();
        visitorId = body.localVisitorId ?? body.visitorId;
      } catch {
        // ignore
      }
    }

    if (!visitorId?.trim()) {
      return toResponse(
        errorResponse({
          status: 400,
          code: "VALIDATION_ERROR",
          message: "缺少訪客識別碼"
        })
      );
    }

    const { error } = await dbClient
      .from("line_push_subscriptions")
      .update({ status: "revoked", updated_at: new Date().toISOString() })
      .eq("local_visitor_id", visitorId.trim())
      .eq("status", "active");

    if (error) {
      return toResponse(
        errorResponse({
          status: 500,
          code: "DB_ERROR",
          message: "解除綁定失敗"
        })
      );
    }

    return jsonResponse({ ok: true });
  }

  // 3. 發送測試提醒: POST /test
  if (action === "test") {
    let visitorId: string | null = null;
    try {
      const body = await request.json();
      visitorId = body.localVisitorId ?? body.visitorId;
    } catch {
      // ignore
    }

    if (!visitorId?.trim()) {
      return toResponse(
        errorResponse({
          status: 400,
          code: "VALIDATION_ERROR",
          message: "缺少訪客識別碼"
        })
      );
    }

    const { data, error } = await dbClient
      .from("line_push_subscriptions")
      .select("line_user_id")
      .eq("local_visitor_id", visitorId.trim())
      .eq("status", "active")
      .maybeSingle();

    if (error || !data) {
      return toResponse(
        errorResponse({
          status: 404,
          code: "NOT_FOUND",
          message: "尚未綁定 LINE 帳號"
        })
      );
    }

    const testMessage = [
      "【UVAlert 防曬晴報員】補擦提醒測試通知",
      "這是一則測試訊息，代表您的 LINE 補擦提醒通道連線完全正常！",
      "當您在網站啟動防曬計時後，保護力減弱時就會在這裡收到即時通知。"
    ].join("\n");

    const pushResult = await sendLinePushNotification(testMessage, {
      fetch: fetchFn,
      readEnv: (key) => {
        if (key === "LINE_USER_ID") return data.line_user_id;
        return readEnv(key);
      }
    });

    if (!pushResult.sent) {
      return toResponse(
        errorResponse({
          status: 502,
          code: "LINE_API_ERROR",
          message: pushResult.reason ?? "LINE 發送失敗"
        })
      );
    }

    return jsonResponse({ ok: true });
  }

  // 4. OAuth 授權碼換證並完成綁定: POST /exchange
  if (action === "exchange" || request.method === "POST") {
    let payload: {
      code?: string;
      redirectUri?: string;
      localVisitorId?: string;
    };
    try {
      payload = await request.json();
    } catch {
      return toResponse(
        errorResponse({
          status: 400,
          code: "VALIDATION_ERROR",
          message: "JSON 格式不正確"
        })
      );
    }

    const { code, redirectUri, localVisitorId } = payload;
    if (!code?.trim() || !redirectUri?.trim() || !localVisitorId?.trim()) {
      return toResponse(
        errorResponse({
          status: 400,
          code: "VALIDATION_ERROR",
          message: "缺少必要的授權碼、回調網址或訪客識別碼"
        })
      );
    }

    // LINE Login Channel 資訊 (優先使用專屬 LINE_LOGIN_*，若無則回退 LINE_CHANNEL_*)
    const clientId =
      readEnv("LINE_LOGIN_CHANNEL_ID") ?? readEnv("LINE_CHANNEL_ID");
    const clientSecret =
      readEnv("LINE_LOGIN_CHANNEL_SECRET") ?? readEnv("LINE_CHANNEL_SECRET");

    if (!clientId || !clientSecret) {
      return toResponse(
        errorResponse({
          status: 500,
          code: "SERVER_ERROR",
          message: "LINE 認證服務尚未設定"
        })
      );
    }

    // 向 LINE 交換 Access Token
    let tokenRes: Response;
    try {
      tokenRes = await fetchFn("https://api.line.me/oauth2/v2.1/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code.trim(),
          redirect_uri: redirectUri.trim(),
          client_id: clientId.trim(),
          client_secret: clientSecret.trim()
        })
      });
    } catch (err) {
      return toResponse(
        errorResponse({
          status: 502,
          code: "UPSTREAM_ERROR",
          message: "連線至 LINE 授權服務失敗"
        })
      );
    }

    if (!tokenRes.ok) {
      const errText = await tokenRes.text().catch(() => "");
      return toResponse(
        errorResponse({
          status: 400,
          code: "OAUTH_FAILED",
          message: `LINE 授權碼無效或已過期: ${errText}`
        })
      );
    }

    const tokenData = (await tokenRes.json()) as { access_token?: string };
    if (!tokenData.access_token) {
      return toResponse(
        errorResponse({
          status: 502,
          code: "OAUTH_FAILED",
          message: "未取得 LINE Access Token"
        })
      );
    }

    // 向 LINE 取得個人 Profile 資訊以取得專屬 userId
    let profileRes: Response;
    try {
      profileRes = await fetchFn("https://api.line.me/v2/profile", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
    } catch {
      return toResponse(
        errorResponse({
          status: 502,
          code: "UPSTREAM_ERROR",
          message: "取得 LINE 用戶資料失敗"
        })
      );
    }

    if (!profileRes.ok) {
      return toResponse(
        errorResponse({
          status: 502,
          code: "UPSTREAM_ERROR",
          message: "讀取 LINE 用戶資料失敗"
        })
      );
    }

    const profile = (await profileRes.json()) as {
      userId?: string;
      displayName?: string;
    };
    if (!profile.userId) {
      return toResponse(
        errorResponse({
          status: 502,
          code: "UPSTREAM_ERROR",
          message: "未包含 LINE User ID"
        })
      );
    }

    const now = new Date().toISOString();

    // 先將此訪客既有的 active 記錄撤銷
    await dbClient
      .from("line_push_subscriptions")
      .update({ status: "revoked", updated_at: now })
      .eq("local_visitor_id", localVisitorId.trim())
      .eq("status", "active");

    // 寫入新的綁定
    const { error: insertError } = await dbClient
      .from("line_push_subscriptions")
      .insert({
        local_visitor_id: localVisitorId.trim(),
        line_user_id: profile.userId,
        status: "active",
        created_at: now,
        updated_at: now
      });

    if (insertError) {
      return toResponse(
        errorResponse({
          status: 500,
          code: "DB_ERROR",
          message: "儲存綁定資訊失敗"
        })
      );
    }

    // 發送一則歡迎訊息
    const welcomeText = [
      `【UVAlert 防曬晴報員】綁定成功！`,
      `您已成功開啟 LINE 補擦防曬提醒。`,
      `當您在防曬晴報員啟動防曬計時後，防護力減弱時將會在此收到即時提醒通知。`
    ].join("\n");

    await sendLinePushNotification(welcomeText, {
      fetch: fetchFn,
      readEnv: (key) => {
        if (key === "LINE_USER_ID") return profile.userId;
        return readEnv(key);
      }
    });

    return jsonResponse({
      ok: true,
      lineUserId: profile.userId,
      displayName: profile.displayName
    });
  }

  return toResponse(
    errorResponse({
      status: 404,
      code: "NOT_FOUND",
      message: "未知的請求端點"
    })
  );
}

// 支援 Deno Serve 啟動
if (typeof Deno !== "undefined" && Deno.serve) {
  Deno.serve(async (request) =>
    withCors(await handleLineSubscription(request), request)
  );
}
