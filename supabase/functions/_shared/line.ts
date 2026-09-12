export interface LineNotificationDeps {
  fetch?: typeof fetch;
  readEnv?: (key: string) => string | undefined;
}

export interface FeedbackNotificationPayload {
  feedbackType: string;
  message: string;
  contactEmail?: string | null;
  appVersion?: string;
  route?: string;
  createdAt?: string;
}

const FEEDBACK_TYPE_NAMES: Record<string, string> = {
  bug: "功能無法正常使用",
  feature_request: "我有功能建議",
  content_correction: "衛教內容需要更正",
  privacy_request: "隱私／帳號資料請求"
};

export function formatFeedbackLineMessage(
  feedback: FeedbackNotificationPayload
): string {
  const typeName =
    FEEDBACK_TYPE_NAMES[feedback.feedbackType] ?? feedback.feedbackType;
  const email = feedback.contactEmail?.trim() || "未提供（匿名）";
  const time = feedback.createdAt
    ? new Date(feedback.createdAt).toLocaleString("zh-TW", {
        timeZone: "Asia/Taipei",
        hour12: false
      })
    : new Date().toLocaleString("zh-TW", {
        timeZone: "Asia/Taipei",
        hour12: false
      });
  const version = feedback.appVersion ?? "web-v1";
  const route = feedback.route ?? "/";

  return [
    "【UVAlert 收到新的意見回饋】",
    `類型：${typeName}`,
    `時間：${time}`,
    `聯絡信箱：${email}`,
    `版本路徑：${version} (${route})`,
    "",
    "回饋內容：",
    feedback.message
  ].join("\n");
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function resolveAccessToken(
  deps: Required<LineNotificationDeps>
): Promise<string | null> {
  const directToken = deps.readEnv("LINE_CHANNEL_ACCESS_TOKEN");
  if (directToken?.trim()) {
    return directToken.trim();
  }

  const channelId = deps.readEnv("LINE_CHANNEL_ID")?.trim();
  const channelSecret = deps.readEnv("LINE_CHANNEL_SECRET")?.trim();

  if (!channelId || !channelSecret) {
    return null;
  }

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60 * 1000) {
    return cachedToken.token;
  }

  try {
    const res = await deps.fetch("https://api.line.me/v2/oauth/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: channelId,
        client_secret: channelSecret
      })
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!data.access_token) return null;

    cachedToken = {
      token: data.access_token,
      expiresAt: now + (data.expires_in ?? 2592000) * 1000
    };

    return cachedToken.token;
  } catch {
    return null;
  }
}

export async function sendLinePushNotification(
  text: string,
  deps: LineNotificationDeps = {}
): Promise<{ sent: boolean; reason?: string }> {
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

  const toUserId = readEnv("LINE_USER_ID")?.trim();
  if (!toUserId) {
    return { sent: false, reason: "LINE_USER_ID not configured" };
  }

  const accessToken = await resolveAccessToken({
    fetch: fetchFn,
    readEnv
  });
  if (!accessToken) {
    return { sent: false, reason: "LINE channel credentials not configured" };
  }

  try {
    const response = await fetchFn("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        to: toUserId,
        messages: [{ type: "text", text }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return {
        sent: false,
        reason: `LINE API responded with ${response.status}: ${errorText}`
      };
    }

    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      reason: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function notifyFeedbackLine(
  feedback: FeedbackNotificationPayload,
  deps: LineNotificationDeps = {}
): Promise<void> {
  try {
    const message = formatFeedbackLineMessage(feedback);
    const result = await sendLinePushNotification(message, deps);
    if (!result.sent && result.reason && !result.reason.includes("not configured")) {
      console.warn("[LINE Push Notification Warning]:", result.reason);
    }
  } catch (error) {
    console.warn("[LINE Push Notification Failed]:", error);
  }
}
