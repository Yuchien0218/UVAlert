import { createClient } from "npm:@supabase/supabase-js@2";
import { errorResponse, toResponse } from "./http.ts";

export type AuthContext = {
  userId: string;
  accessToken: string;
  client: ReturnType<typeof createClient>;
};

export type AuthFailure = {
  ok: false;
  response: Response;
};

export type AuthSuccess = {
  ok: true;
  context: AuthContext;
};

export type AuthResult = AuthFailure | AuthSuccess;

export async function requirePermanentUser(
  request: Request
): Promise<AuthResult> {
  const authorization = request.headers.get("Authorization");
  if (authorization === null || !authorization.startsWith("Bearer ")) {
    return {
      ok: false,
      response: toResponse(
        errorResponse({
          status: 401,
          code: "AUTH_REQUIRED",
          message: "需要登入才能同步資料"
        })
      )
    };
  }

  const accessToken = authorization.slice("Bearer ".length).trim();
  if (accessToken === "") {
    return {
      ok: false,
      response: toResponse(
        errorResponse({
          status: 401,
          code: "AUTH_REQUIRED",
          message: "登入狀態無效"
        })
      )
    };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (supabaseUrl === undefined || publishableKey === undefined) {
    return {
      ok: false,
      response: toResponse(
        errorResponse({
          status: 500,
          code: "SERVER_ERROR",
          message: "同步服務尚未完成設定"
        })
      )
    };
  }

  const client = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data, error } = await client.auth.getUser(accessToken);
  if (error !== null || data.user === null || data.user.is_anonymous === true) {
    return {
      ok: false,
      response: toResponse(
        errorResponse({
          status: 401,
          code: "AUTH_REQUIRED",
          message: "需要永久登入帳號才能同步資料"
        })
      )
    };
  }

  return {
    ok: true,
    context: { userId: data.user.id, accessToken, client }
  };
}
