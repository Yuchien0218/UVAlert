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

function makeDependencies(
  overrides: Partial<ParseSunscreenLabelDependencies> = {}
): ParseSunscreenLabelDependencies {
  return {
    readSecret: vi.fn((key: string) => {
      if (key === "OPENROUTER_API_KEY") return "sk-or-test-key";
      if (key === "OPENROUTER_MODEL") return "openai/gpt-4o-mini";
      return undefined;
    }),
    fetchUpstream: vi.fn(async () => {
      const mockResult = {
        displayName: "安耐曬 金鑽高效防曬露 NA",
        spf: 50,
        paGrade: "PA++++",
        waterResistanceStatus: "80",
        reapplicationIntervalMinutes: 120,
        preExposureWaitMinutes: 15,
        expiryDate: "2027-08-31",
        sunscreenClaimConfirmed: true,
        notes: "背面註明耐水 80 分鐘"
      };

      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify(mockResult)
              }
            }
          ]
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    }),
    now: vi.fn(() => new Date("2026-10-27T12:00:00.000Z")),
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
    // 缺少 images
    const response = await handler(
      makeRequest("POST", { clientLocalTime: "2026-10-27T20:00:00+08:00" })
    );

    expect(response.status).toBe(400);
  });

  it("rejects request when images array is empty with 400", async () => {
    const handler = createParseSunscreenLabelHandler(makeDependencies());
    const response = await handler(
      makeRequest("POST", {
        images: [],
        clientLocalTime: "2026-10-27T20:00:00+08:00"
      })
    );

    expect(response.status).toBe(400);
  });

  it("returns 500 when OPENROUTER_API_KEY is not configured", async () => {
    const handler = createParseSunscreenLabelHandler(
      makeDependencies({
        readSecret: vi.fn(() => undefined)
      })
    );

    const response = await handler(
      makeRequest("POST", {
        images: ["data:image/jpeg;base64,front_photo"],
        clientLocalTime: "2026-10-27T20:00:00+08:00"
      })
    );

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error.code).toBe("CONFIG_ERROR");
  });

  it("returns 502 when OpenRouter upstream fails", async () => {
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
        clientLocalTime: "2026-10-27T20:00:00+08:00"
      })
    );

    expect(response.status).toBe(502);
    const json = await response.json();
    expect(json.error.code).toBe("UPSTREAM_ERROR");
  });

  it("successfully passes images to OpenRouter and returns structured response", async () => {
    const fetchUpstream = vi.fn(async () => {
      const mockResult = {
        displayName: "安耐曬 金鑽高效防曬露 NA",
        spf: 50,
        paGrade: "PA++++",
        waterResistanceStatus: "80",
        reapplicationIntervalMinutes: 120,
        preExposureWaitMinutes: 15,
        expiryDate: "2027-08-31",
        sunscreenClaimConfirmed: true,
        notes: "包裝辨識正常"
      };

      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify(mockResult)
              }
            }
          ]
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    });

    const handler = createParseSunscreenLabelHandler(
      makeDependencies({ fetchUpstream })
    );

    const response = await handler(
      makeRequest("POST", {
        images: [
          "data:image/jpeg;base64,front_photo",
          "data:image/jpeg;base64,back_photo"
        ],
        clientLocalTime: "2026-10-27T20:00:00+08:00"
      })
    );

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.displayName).toBe("安耐曬 金鑽高效防曬露 NA");
    expect(data.spf).toBe(50);
    expect(data.paGrade).toBe("PA++++");
    expect(data.waterResistanceStatus).toBe("80");
    expect(data.expiryDate).toBe("2027-08-31");
    expect(data.sunscreenClaimConfirmed).toBe(true);

    // 驗證 upstream 呼叫參數
    expect(fetchUpstream).toHaveBeenCalledTimes(1);
    const [url, init] = fetchUpstream.mock.calls[0] as unknown as [
      string,
      RequestInit
    ];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer sk-or-test-key");
    expect(headers["HTTP-Referer"]).toBe("https://uvalert.tw");
    expect(headers["X-Title"]).toBe("UVAlert");

    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("openai/gpt-4o-mini");
    expect(body.messages[1].content).toHaveLength(3); // 1 說明文字 + 2 張圖
  });
});
