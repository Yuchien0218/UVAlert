import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createParseSunscreenLabelHandler,
  type ParseSunscreenLabelDependencies
} from "./handler";

beforeEach(() => {
  vi.stubGlobal("Deno", {
    env: {
      get: vi.fn((key: string) => {
        if (key === "ALLOWED_ORIGINS") return "https://uvalert.tw";
        return undefined;
      })
    }
  });
});

const MOCK_SUNSCREEN_RESULT = {
  displayName: "NOV 娜芙 防曬水凝乳 SPF32",
  spf: 32,
  paGrade: "PA+++",
  waterResistanceStatus: "no_claim",
  reapplicationIntervalMinutes: null,
  preExposureWaitMinutes: null,
  expiryDate: null,
  sunscreenClaimConfirmed: true,
  notes: "背面標示無紫外線吸收劑"
};

function makeGeminiResponse(result: unknown = MOCK_SUNSCREEN_RESULT): Response {
  return new Response(
    JSON.stringify({
      candidates: [
        {
          content: {
            parts: [{ text: JSON.stringify(result) }]
          }
        }
      ]
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" }
    }
  );
}

function makeDependencies(
  overrides: Partial<ParseSunscreenLabelDependencies> = {}
): ParseSunscreenLabelDependencies {
  return {
    readSecret: vi.fn((key: string) => {
      if (key === "GEMINI_API_KEY") return "AIza-test-gemini-key";
      return undefined;
    }),
    fetchUpstream: vi.fn(async () => makeGeminiResponse()),
    now: vi.fn(() => new Date("2026-11-01T12:00:00.000Z")),
    ...overrides
  };
}

function makeRequest(
  method = "POST",
  body?: unknown,
  headers: Record<string, string> = {}
): Request {
  const reqHeaders = new Headers(headers);
  if (body !== undefined && !reqHeaders.has("Content-Type")) {
    reqHeaders.set("Content-Type", "application/json");
  }

  return new Request("https://api.test/v1/parse-sunscreen-label", {
    method,
    headers: reqHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
}

describe("parse-sunscreen-label handler", () => {
  it("handles OPTIONS preflight with 204 and CORS headers", async () => {
    const handler = createParseSunscreenLabelHandler(makeDependencies());
    const response = await handler(makeRequest("OPTIONS"));

    expect(response.status).toBe(204);
  });

  it("rejects non-POST methods with 405", async () => {
    const handler = createParseSunscreenLabelHandler(makeDependencies());
    const response = await handler(makeRequest("GET"));

    expect(response.status).toBe(405);
  });

  it("rejects invalid request body with 400", async () => {
    const handler = createParseSunscreenLabelHandler(makeDependencies());
    const response = await handler(
      makeRequest("POST", { clientLocalTime: "2026-11-01T20:00:00+08:00" })
    );

    expect(response.status).toBe(400);
  });

  it("rejects request when images array is empty with 400", async () => {
    const handler = createParseSunscreenLabelHandler(makeDependencies());
    const response = await handler(
      makeRequest("POST", {
        images: [],
        clientLocalTime: "2026-11-01T20:00:00+08:00"
      })
    );

    expect(response.status).toBe(400);
  });

  it("returns 500 CONFIG_ERROR when neither GEMINI_API_KEY nor OPENROUTER_API_KEY is configured", async () => {
    const handler = createParseSunscreenLabelHandler(
      makeDependencies({
        readSecret: vi.fn(() => undefined)
      })
    );

    const response = await handler(
      makeRequest("POST", {
        images: ["data:image/jpeg;base64,front_photo"],
        clientLocalTime: "2026-11-01T20:00:00+08:00"
      })
    );

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error.code).toBe("CONFIG_ERROR");
    expect(json.error.message).toContain("GEMINI_API_KEY");
  });

  it("uses Google Gemini generateContent as primary provider when GEMINI_API_KEY is set (even if OPENROUTER_API_KEY also exists)", async () => {
    const fetchUpstream = vi.fn(async () => makeGeminiResponse());
    const handler = createParseSunscreenLabelHandler(
      makeDependencies({
        readSecret: vi.fn((key: string) => {
          if (key === "GEMINI_API_KEY") return '  "AIza-real-key" \r\n';
          if (key === "OPENROUTER_API_KEY") return "sk-or-exhausted-key";
          return undefined;
        }),
        fetchUpstream
      })
    );

    const response = await handler(
      makeRequest("POST", {
        images: [
          "data:image/jpeg;base64,FRONT_B64",
          "data:image/png;base64,BACK_B64"
        ],
        clientLocalTime: "2026-11-01T22:15:00+08:00"
      })
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.displayName).toBe("NOV 娜芙 防曬水凝乳 SPF32");
    expect(data.spf).toBe(32);
    expect(data.paGrade).toBe("PA+++");
    expect(data.waterResistanceStatus).toBe("no_claim");
    expect(data.sunscreenClaimConfirmed).toBe(true);

    expect(fetchUpstream).toHaveBeenCalledTimes(1);
    const [url, init] = fetchUpstream.mock.calls[0] as unknown as [
      string,
      RequestInit
    ];
    expect(url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent"
    );
    expect(response.headers.get("X-Vision-Model")).toBe(
      "gemini-3.5-flash-lite"
    );
    const headers = init.headers as Record<string, string>;
    expect(headers["x-goog-api-key"]).toBe("AIza-real-key");

    const parsedBody = JSON.parse(init.body as string);
    expect(parsedBody.generationConfig.responseMimeType).toBe(
      "application/json"
    );
    expect(parsedBody.generationConfig.thinkingConfig).toBeUndefined();
    expect(parsedBody.contents[0].parts).toEqual([
      expect.objectContaining({ text: expect.stringContaining("防曬乳包裝照片") }),
      { inlineData: { mimeType: "image/jpeg", data: "FRONT_B64" } },
      { inlineData: { mimeType: "image/png", data: "BACK_B64" } }
    ]);
  });

  it("auto-discovers active Gemini Flash model via /v1beta/models when default model returns 404 and ignores thought parts", async () => {
    const fetchUpstream = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("gemini-3.5-flash-lite:generateContent")) {
        return new Response(
          JSON.stringify({
            error: {
              code: 404,
              message: "models/gemini-3.5-flash-lite is not found"
            }
          }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.endsWith("/v1beta/models?pageSize=100")) {
        return new Response(
          JSON.stringify({
            models: [
              {
                name: "models/text-embedding-004",
                supportedGenerationMethods: ["embedContent"]
              },
              {
                name: "models/gemini-3.9-flash-image",
                supportedGenerationMethods: ["generateContent"]
              },
              {
                name: "models/gemini-flash-latest",
                supportedGenerationMethods: ["generateContent"]
              },
              {
                name: "models/gemini-3.9-flash",
                supportedGenerationMethods: ["generateContent"]
              }
            ]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.includes("gemini-3.9-flash:generateContent")) {
        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    { thought: true, text: "Internal reasoning about SPF 32..." },
                    { text: JSON.stringify(MOCK_SUNSCREEN_RESULT) }
                  ]
                }
              }
            ]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("Unexpected URL", { status: 500 });
    });

    const handler = createParseSunscreenLabelHandler(
      makeDependencies({ fetchUpstream })
    );

    const response = await handler(
      makeRequest("POST", {
        images: ["data:image/jpeg;base64,FRONT_B64"],
        clientLocalTime: "2026-11-01T22:25:00+08:00"
      })
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.displayName).toBe("NOV 娜芙 防曬水凝乳 SPF32");
    expect(fetchUpstream).toHaveBeenCalledTimes(3);
  });

  it("classifies Gemini 400 API_KEY_INVALID as UPSTREAM_AUTH_ERROR and 429 as RATE_LIMITED", async () => {
    const handlerInvalidKey = createParseSunscreenLabelHandler(
      makeDependencies({
        fetchUpstream: vi.fn(async () =>
          new Response(
            JSON.stringify({
              error: {
                code: 400,
                message: "API key not valid. Please pass a valid API key.",
                status: "INVALID_ARGUMENT",
                details: [{ reason: "API_KEY_INVALID" }]
              }
            }),
            { status: 400 }
          )
        )
      })
    );

    const resInvalid = await handlerInvalidKey(
      makeRequest("POST", {
        images: ["data:image/jpeg;base64,front_photo"],
        clientLocalTime: "2026-11-01T20:00:00+08:00"
      })
    );
    expect(resInvalid.status).toBe(502);
    const jsonInvalid = await resInvalid.json();
    expect(jsonInvalid.error.code).toBe("UPSTREAM_AUTH_ERROR");

    const handlerRateLimit = createParseSunscreenLabelHandler(
      makeDependencies({
        fetchUpstream: vi.fn(async () =>
          new Response(
            JSON.stringify({
              error: {
                code: 429,
                message: "Resource has been exhausted",
                status: "RESOURCE_EXHAUSTED"
              }
            }),
            { status: 429 }
          )
        )
      })
    );

    const res429 = await handlerRateLimit(
      makeRequest("POST", {
        images: ["data:image/jpeg;base64,front_photo"],
        clientLocalTime: "2026-11-01T20:00:00+08:00"
      })
    );
    expect(res429.status).toBe(429);
    const json429 = await res429.json();
    expect(json429.error.code).toBe("RATE_LIMITED");
  });

  it("returns 502 UPSTREAM_ERROR when upstream fails with 5xx", async () => {
    const handler = createParseSunscreenLabelHandler(
      makeDependencies({
        fetchUpstream: vi.fn(async () => {
          return new Response("Service Unavailable", { status: 503 });
        })
      })
    );

    const response = await handler(
      makeRequest("POST", {
        images: ["data:image/jpeg;base64,front_photo"],
        clientLocalTime: "2026-11-01T20:00:00+08:00"
      })
    );

    expect(response.status).toBe(502);
    const json = await response.json();
    expect(json.error.code).toBe("UPSTREAM_ERROR");
  });

  it("supports fallback to OpenRouter when GEMINI_API_KEY is absent and OPENROUTER_API_KEY is present", async () => {
    const fetchUpstream = vi.fn(async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify(MOCK_SUNSCREEN_RESULT)
              }
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const handler = createParseSunscreenLabelHandler(
      makeDependencies({
        readSecret: vi.fn((key: string) => {
          if (key === "OPENROUTER_API_KEY") return ' "sk-or-test-key" ';
          if (key === "OPENROUTER_MODEL") return ' "openai/gpt-4o-mini" ';
          return undefined;
        }),
        fetchUpstream
      })
    );

    const response = await handler(
      makeRequest("POST", {
        images: ["data:image/jpeg;base64,front_photo"],
        clientLocalTime: "2026-11-01T20:00:00+08:00"
      })
    );

    expect(response.status).toBe(200);
    const [url, init] = fetchUpstream.mock.calls[0] as unknown as [
      string,
      RequestInit
    ];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer sk-or-test-key");
  });
});
