import {
  corsHeaders,
  errorResponse,
  jsonResponse,
  toResponse
} from "../_shared/http.ts";
import {
  hashClientFingerprint,
  SlidingWindowRateLimiter
} from "../_shared/rate-limit.ts";

export interface ParseSunscreenLabelDependencies {
  readSecret(name: string): string | undefined;
  fetchUpstream(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response>;
  now(): Date;
  limiter?: SlidingWindowRateLimiter;
}

export interface ParseSunscreenLabelPayload {
  displayName: string | null;
  spf: number | null;
  paGrade: string | null;
  waterResistanceStatus:
    "40" | "80" | "not_water_resistant" | "no_claim" | "unknown";
  reapplicationIntervalMinutes: number | null;
  preExposureWaitMinutes: number | null;
  expiryDate: string | null;
  sunscreenClaimConfirmed: boolean;
  notes: string | null;
}

const DEFAULT_SYSTEM_PROMPT = `你是一位專業的化妝品包裝與防曬規範審查員。請檢視所附的防曬乳包裝照片（正面或背面），提取各項防曬與產品標示。
輸出必須是符合指定格式的純 JSON 物件，嚴禁包含 markdown 格式碼或額外說明文字。

輸出 JSON 欄位定義：
1. displayName: (string | null) 提取最顯著的產品品名（包含品牌，如「安耐曬 金鑽高效防曬露」）。若有多語言，以繁體中文或英日文原名為主，最多 80 字。
2. spf: (number | null) 數值化數字。若是 "SPF 50+"，填 50；若未標註填 null。
3. paGrade: (string | null) 如 "PA++++", "PA+++", "Broad Spectrum", "Boots 3 Star"。若無填 null。
4. waterResistanceStatus: ("40" | "80" | "not_water_resistant" | "no_claim" | "unknown")
   - 看到 "80 min", "Very Water Resistant", "耐水 80 分鐘" 等 -> "80"
   - 看到 "40 min", "Water Resistant", "耐水 40 分鐘" 等 -> "40"
   - 看到 "不防水", "non-water resistant" 等 -> "not_water_resistant"
   - 包裝背面無提及耐水特性 -> "no_claim"
   - 模糊或無法判斷 -> "unknown"
5. reapplicationIntervalMinutes: (number | null) 指示每幾小時補擦。若註明 "at least every 2 hours" 或每兩小時補擦填 120。若未提及填 null。
6. preExposureWaitMinutes: (number | null) 塗抹後等待時間。如 "15 minutes before" 填 15。未提及填 null。
7. expiryDate: (string | null) 格式須為 "YYYY-MM-DD"。若只有月份如 "EXP 2027/08"，填該月最後一天 "2027-08-31"。未找到填 null。
8. sunscreenClaimConfirmed: (boolean) 是否明確為防曬產品（true 或 false）。
9. notes: (string | null) 任何反光、不確定或需使用者留意的簡短提示（繁體中文，50 字內）。`;

const defaultLimiter = new SlidingWindowRateLimiter({
  maxRequests: 30,
  windowMs: 60 * 60 * 1000 // 1 小時 30 次
});

export function createParseSunscreenLabelHandler(
  dependencies: ParseSunscreenLabelDependencies
) {
  const limiter = dependencies.limiter ?? defaultLimiter;

  return async function handleParseSunscreenLabel(
    request: Request
  ): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    if (request.method !== "POST") {
      return toResponse(
        errorResponse({
          status: 405,
          code: "METHOD_NOT_ALLOWED",
          message: "只接受 POST"
        })
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return toResponse(
        errorResponse({
          status: 400,
          code: "VALIDATION_ERROR",
          message: "JSON 格式不正確"
        })
      );
    }

    if (
      typeof body !== "object" ||
      body === null ||
      !("images" in body) ||
      !Array.isArray((body as { images: unknown }).images) ||
      (body as { images: unknown[] }).images.length === 0 ||
      (body as { images: unknown[] }).images.length > 2 ||
      !("clientLocalTime" in body) ||
      typeof (body as { clientLocalTime: unknown }).clientLocalTime !== "string"
    ) {
      return toResponse(
        errorResponse({
          status: 400,
          code: "VALIDATION_ERROR",
          message: "請提供 1~2 張防曬乳外包裝照片與本地時間戳"
        })
      );
    }

    const { images, clientLocalTime } = body as {
      images: string[];
      clientLocalTime: string;
    };

    // Rate Limiting 防護
    const fingerprint = await hashClientFingerprint([
      request.headers.get("cf-connecting-ip") ??
        request.headers.get("x-forwarded-for") ??
        "unknown",
      request.headers.get("user-agent") ?? "unknown"
    ]);

    const limitCheck = limiter.check(fingerprint);
    if (!limitCheck.allowed) {
      return toResponse(
        errorResponse({
          status: 429,
          code: "RATE_LIMITED",
          message: "照片辨識頻率較高，請稍候再試"
        })
      );
    }

    // 檢查 API 金鑰
    const apiKey = dependencies.readSecret("OPENROUTER_API_KEY");
    if (!apiKey) {
      return toResponse(
        errorResponse({
          status: 500,
          code: "CONFIG_ERROR",
          message: "OPENROUTER_API_KEY 未設定"
        })
      );
    }

    const model =
      dependencies.readSecret("OPENROUTER_MODEL") ?? "openai/gpt-4o-mini";

    // 組裝 OpenRouter 視覺多模態請求
    const imageContents = images.map((img) => ({
      type: "image_url",
      image_url: {
        url: img.startsWith("data:") ? img : `data:image/jpeg;base64,${img}`
      }
    }));

    const userMessageContent = [
      {
        type: "text",
        text: `請分析所附的防曬乳包裝照片。當前客戶端時間為 ${clientLocalTime}。請依照要求回傳 JSON 物件。`
      },
      ...imageContents
    ];

    let upstreamResponse: Response;
    try {
      upstreamResponse = await dependencies.fetchUpstream(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "https://uvalert.tw",
            "X-Title": "UVAlert"
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: DEFAULT_SYSTEM_PROMPT },
              { role: "user", content: userMessageContent }
            ],
            response_format: { type: "json_object" }
          })
        }
      );
    } catch (error) {
      console.error("OpenRouter fetch error:", error);
      return toResponse(
        errorResponse({
          status: 502,
          code: "UPSTREAM_ERROR",
          message: "連線至辨識服務失敗，請檢查網路連線"
        })
      );
    }

    if (!upstreamResponse.ok) {
      console.error(
        "OpenRouter HTTP error:",
        upstreamResponse.status,
        await upstreamResponse.text().catch(() => "")
      );
      return toResponse(
        errorResponse({
          status: 502,
          code: "UPSTREAM_ERROR",
          message: "視覺辨識服務暫時無法回應，請稍後再試"
        })
      );
    }

    let upstreamJson: unknown;
    try {
      upstreamJson = await upstreamResponse.json();
    } catch {
      return toResponse(
        errorResponse({
          status: 502,
          code: "UPSTREAM_ERROR",
          message: "視覺辨識服務回傳非預期資料"
        })
      );
    }

    const contentText =
      (upstreamJson as { choices?: Array<{ message?: { content?: string } }> })
        ?.choices?.[0]?.message?.content ?? "";

    let parsedResult: unknown;
    try {
      // 處理可能夾帶的 ```json 標記
      const cleanJson = contentText
        .replace(/^```json\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      parsedResult = JSON.parse(cleanJson);
    } catch {
      return toResponse(
        errorResponse({
          status: 502,
          code: "UPSTREAM_ERROR",
          message: "無法解析包裝辨識結果"
        })
      );
    }

    const sanitized = sanitizeResult(parsedResult);
    return jsonResponse(sanitized, 200, corsHeaders(request));
  };
}

function sanitizeResult(raw: unknown): ParseSunscreenLabelPayload {
  const obj =
    typeof raw === "object" && raw !== null
      ? (raw as Record<string, unknown>)
      : {};

  const displayName =
    typeof obj.displayName === "string" && obj.displayName.trim().length > 0
      ? obj.displayName.trim().slice(0, 80)
      : null;

  const spf =
    typeof obj.spf === "number" && Number.isInteger(obj.spf) && obj.spf > 0
      ? obj.spf
      : null;

  const paGrade =
    typeof obj.paGrade === "string" && obj.paGrade.trim().length > 0
      ? obj.paGrade.trim().slice(0, 20)
      : null;

  const validWaterStatuses = [
    "40",
    "80",
    "not_water_resistant",
    "no_claim",
    "unknown"
  ] as const;

  const waterResistanceStatus =
    typeof obj.waterResistanceStatus === "string" &&
    validWaterStatuses.includes(
      obj.waterResistanceStatus as (typeof validWaterStatuses)[number]
    )
      ? (obj.waterResistanceStatus as (typeof validWaterStatuses)[number])
      : "unknown";

  const reapplicationIntervalMinutes =
    typeof obj.reapplicationIntervalMinutes === "number" &&
    Number.isInteger(obj.reapplicationIntervalMinutes) &&
    obj.reapplicationIntervalMinutes > 0
      ? obj.reapplicationIntervalMinutes
      : null;

  const preExposureWaitMinutes =
    typeof obj.preExposureWaitMinutes === "number" &&
    Number.isInteger(obj.preExposureWaitMinutes) &&
    obj.preExposureWaitMinutes > 0
      ? obj.preExposureWaitMinutes
      : null;

  const expiryDate =
    typeof obj.expiryDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(obj.expiryDate.trim())
      ? obj.expiryDate.trim()
      : null;

  const sunscreenClaimConfirmed =
    typeof obj.sunscreenClaimConfirmed === "boolean"
      ? obj.sunscreenClaimConfirmed
      : true;

  const notes =
    typeof obj.notes === "string" && obj.notes.trim().length > 0
      ? obj.notes.trim().slice(0, 300)
      : null;

  return {
    displayName,
    spf,
    paGrade,
    waterResistanceStatus,
    reapplicationIntervalMinutes,
    preExposureWaitMinutes,
    expiryDate,
    sunscreenClaimConfirmed,
    notes
  };
}
