import {
  corsHeaders,
  errorResponse,
  type ErrorResponse,
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

const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";
const DEFAULT_OPENROUTER_MODEL = "openai/gpt-4o-mini";
const UPSTREAM_TIMEOUT_MS = 45_000;

const defaultLimiter = new SlidingWindowRateLimiter({
  maxRequests: 30,
  windowMs: 60 * 60 * 1000 // 1 小時 30 次
});

function sanitizeSecret(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;
  const cleaned = raw.trim().replace(/^["']+|["']+$/g, "").trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

function parseImageForGemini(img: string): { mimeType: string; data: string } {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/u.exec(
    img.trim()
  );
  if (match) {
    return {
      mimeType: match[1],
      data: match[2].replace(/\s+/gu, "")
    };
  }
  return {
    mimeType: "image/jpeg",
    data: img.replace(/\s+/gu, "")
  };
}

async function discoverActiveGeminiFlashModels(
  fetchUpstream: ParseSunscreenLabelDependencies["fetchUpstream"],
  apiKey: string,
  excludeModel: string
): Promise<string[]> {
  try {
    const res = await fetchUpstream(
      "https://generativelanguage.googleapis.com/v1beta/models?pageSize=100",
      {
        method: "GET",
        headers: { "x-goog-api-key": apiKey },
        signal: AbortSignal.timeout(10_000)
      }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      models?: Array<{
        name?: string;
        supportedGenerationMethods?: string[];
      }>;
    };
    const candidates = (data.models ?? [])
      .filter(
        (m) =>
          typeof m.name === "string" &&
          Array.isArray(m.supportedGenerationMethods) &&
          m.supportedGenerationMethods.includes("generateContent") &&
          /gemini.*flash/iu.test(m.name) &&
          !/tts|audio|live|imagen|image|embedding|robotics|thinking-exp/iu.test(
            m.name
          )
      )
      .map((m) => (m.name as string).replace(/^models\//u, ""))
      .filter((id) => id !== excludeModel);

    if (candidates.length === 0) return [];
    // 優先選取具明確版本號之穩定 flash-lite 模型（免費額度最高、延遲最低），其次為穩定標準 flash
    const rankCandidate = (id: string): number => {
      const isVersioned = /^gemini-\d/iu.test(id);
      const isPreview = /preview|exp/iu.test(id);
      const isLite = /lite/iu.test(id);
      if (isVersioned && !isPreview && isLite) return 0;
      if (isVersioned && !isPreview && !isLite) return 1;
      if (isVersioned && isPreview && isLite) return 2;
      if (isVersioned && isPreview && !isLite) return 3;
      return isLite ? 4 : 5;
    };
    candidates.sort((a, b) => {
      const rankDiff = rankCandidate(a) - rankCandidate(b);
      if (rankDiff !== 0) return rankDiff;
      return b.localeCompare(a, undefined, { numeric: true });
    });
    return candidates;
  } catch {
    return [];
  }
}

function classifyUpstreamError(
  upstreamStatus: number,
  upstreamText: string
): ErrorResponse {
  if (
    upstreamStatus === 401 ||
    (upstreamStatus === 400 &&
      /API_KEY_INVALID|API key not valid/iu.test(upstreamText))
  ) {
    return errorResponse({
      status: 502,
      code: "UPSTREAM_AUTH_ERROR",
      message: "視覺辨識金鑰無效或已失效，請檢查金鑰設定"
    });
  }
  if (
    upstreamStatus === 402 ||
    (upstreamStatus === 403 &&
      /key limit exceeded|credit limit|insufficient credits/iu.test(
        upstreamText
      ))
  ) {
    return errorResponse({
      status: 502,
      code: "UPSTREAM_QUOTA_ERROR",
      message: "視覺辨識金鑰已達額度上限或餘額不足"
    });
  }
  if (upstreamStatus === 403) {
    return errorResponse({
      status: 502,
      code: "UPSTREAM_AUTH_ERROR",
      message: "視覺辨識服務拒絕存取（HTTP 403）"
    });
  }
  if (upstreamStatus === 429) {
    return errorResponse({
      status: 429,
      code: "RATE_LIMITED",
      message: "視覺辨識服務目前請求較多，請稍後再試"
    });
  }
  if (
    upstreamStatus === 400 ||
    upstreamStatus === 404 ||
    upstreamStatus === 422
  ) {
    return errorResponse({
      status: 502,
      code: "UPSTREAM_REQUEST_ERROR",
      message: `視覺辨識請求格式或模型設定不相容（HTTP ${upstreamStatus}）`
    });
  }
  return errorResponse({
    status: 502,
    code: "UPSTREAM_ERROR",
    message: `視覺辨識服務暫時無法回應（HTTP ${upstreamStatus}），請稍後再試`
  });
}

export function createParseSunscreenLabelHandler(
  dependencies: ParseSunscreenLabelDependencies
) {
  const limiter = dependencies.limiter ?? defaultLimiter;
  let cachedDiscoveredGeminiModel: string | null = null;

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

    // 優先使用免費額度充裕之 Google AI Studio GEMINI_API_KEY；若未設定才退回 OPENROUTER_API_KEY
    const geminiApiKey = sanitizeSecret(
      dependencies.readSecret("GEMINI_API_KEY")
    );
    const openRouterApiKey = sanitizeSecret(
      dependencies.readSecret("OPENROUTER_API_KEY")
    );

    if (!geminiApiKey && !openRouterApiKey) {
      return toResponse(
        errorResponse({
          status: 500,
          code: "CONFIG_ERROR",
          message: "GEMINI_API_KEY 未設定"
        })
      );
    }

    const promptText = `請分析所附的防曬乳包裝照片。當前客戶端時間為 ${clientLocalTime}。請依照要求回傳 JSON 物件。`;
    const useGemini = Boolean(geminiApiKey);

    let upstreamResponse: Response;
    let preReadUpstreamErrorText: string | undefined;
    let usedModel = "";
    try {
      if (useGemini && geminiApiKey) {
        const configuredGeminiModel = sanitizeSecret(
          dependencies.readSecret("GEMINI_MODEL")
        );
        const initialModel =
          configuredGeminiModel ??
          cachedDiscoveredGeminiModel ??
          DEFAULT_GEMINI_MODEL;

        const buildGeminiPayload = (
          modelId: string,
          includeThinkingConfig: boolean
        ): string => {
          // flash-lite 與 2.0 系列預設已為極速推論，不需額外傳遞 thinkingConfig 避免相容性重試
          const needsLowThinking =
            includeThinkingConfig &&
            !/lite|^gemini-2\.0|^gemini-1\./iu.test(modelId);
          const thinkingConfig = !needsLowThinking
            ? undefined
            : /^gemini-2\.5/iu.test(modelId)
              ? { thinkingBudget: 0 }
              : { thinkingLevel: "low" };

          return JSON.stringify({
            systemInstruction: {
              parts: [{ text: DEFAULT_SYSTEM_PROMPT }]
            },
            contents: [
              {
                parts: [
                  { text: promptText },
                  ...images.map((img) => ({
                    inlineData: parseImageForGemini(img)
                  }))
                ]
              }
            ],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.1,
              ...(thinkingConfig ? { thinkingConfig } : {})
            }
          });
        };

        const callGemini = async (
          modelId: string
        ): Promise<{ response: Response; errorText?: string }> => {
          usedModel = modelId;
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:generateContent`;
          const res = await dependencies.fetchUpstream(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": geminiApiKey
            },
            body: buildGeminiPayload(modelId, true),
            signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
          });
          if (res.status === 400) {
            const errText = await res.text().catch(() => "");
            if (/thinking/iu.test(errText)) {
              const retryRes = await dependencies.fetchUpstream(endpoint, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-goog-api-key": geminiApiKey
                },
                body: buildGeminiPayload(modelId, false),
                signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
              });
              return { response: retryRes };
            }
            return { response: res, errorText: errText };
          }
          return { response: res };
        };

        let attempt = await callGemini(initialModel);

        // 若預設模型版本已退役回傳 404，自動查詢該金鑰可用之最新 Flash 模型並依序重試
        if (attempt.response.status === 404 && !configuredGeminiModel) {
          const fallbackModels = await discoverActiveGeminiFlashModels(
            dependencies.fetchUpstream,
            geminiApiKey,
            initialModel
          );
          for (const fallbackModel of fallbackModels.slice(0, 3)) {
            await attempt.response.body?.cancel().catch(() => undefined);
            attempt = await callGemini(fallbackModel);
            if (attempt.response.status !== 404) {
              cachedDiscoveredGeminiModel = fallbackModel;
              break;
            }
          }
        }

        upstreamResponse = attempt.response;
        preReadUpstreamErrorText = attempt.errorText;
      } else {
        const openRouterModel =
          sanitizeSecret(dependencies.readSecret("OPENROUTER_MODEL")) ??
          DEFAULT_OPENROUTER_MODEL;
        usedModel = openRouterModel;
        const imageContents = images.map((img) => ({
          type: "image_url",
          image_url: {
            url: img.startsWith("data:") ? img : `data:image/jpeg;base64,${img}`
          }
        }));

        upstreamResponse = await dependencies.fetchUpstream(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${openRouterApiKey}`,
              "HTTP-Referer": "https://uvalert.tw",
              "X-Title": "UVAlert"
            },
            body: JSON.stringify({
              model: openRouterModel,
              messages: [
                { role: "system", content: DEFAULT_SYSTEM_PROMPT },
                {
                  role: "user",
                  content: [{ type: "text", text: promptText }, ...imageContents]
                }
              ],
              response_format: { type: "json_object" }
            })
          }
        );
      }
    } catch (error) {
      console.error("Vision upstream fetch error:", error);
      const isTimeout =
        error instanceof Error &&
        (error.name === "TimeoutError" || error.name === "AbortError");
      const err = errorResponse({
        status: 502,
        code: "UPSTREAM_ERROR",
        message: isTimeout
          ? "視覺辨識服務回應逾時，請稍後再試"
          : "連線至辨識服務失敗，請檢查網路連線"
      });
      if (usedModel) err.headers["X-Vision-Model"] = usedModel;
      return toResponse(err);
    }

    if (!upstreamResponse.ok) {
      const upstreamText =
        preReadUpstreamErrorText ??
        (await upstreamResponse.text().catch(() => ""));
      console.error(
        useGemini ? "Gemini HTTP error:" : "OpenRouter HTTP error:",
        upstreamResponse.status
      );
      const err = classifyUpstreamError(upstreamResponse.status, upstreamText);
      if (usedModel) err.headers["X-Vision-Model"] = usedModel;
      return toResponse(err);
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

    const contentText = useGemini
      ? ((
          upstreamJson as {
            candidates?: Array<{
              content?: {
                parts?: Array<{ text?: string; thought?: boolean }>;
              };
            }>;
          }
        )?.candidates?.[0]?.content?.parts
          ?.filter((part) => !part.thought)
          .map((part) => part.text ?? "")
          .join("") ?? "")
      : ((
          upstreamJson as {
            choices?: Array<{ message?: { content?: string } }>;
          }
        )?.choices?.[0]?.message?.content ?? "");

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
    return jsonResponse(sanitized, 200, {
      ...corsHeaders(request),
      ...(usedModel ? { "X-Vision-Model": usedModel } : {})
    });
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
