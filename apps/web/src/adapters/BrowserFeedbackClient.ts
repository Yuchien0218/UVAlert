import {
  FeedbackReceiptV1Schema,
  FeedbackRequestV1Schema,
  type FeedbackReceiptV1,
  type FeedbackRequestV1
} from "@sunshield/contracts";
import type { CloudError, FeedbackPort } from "@sunshield/platform";

type FetchPort = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

export class BrowserFeedbackClient implements FeedbackPort {
  readonly #fetch: FetchPort;
  readonly #endpoint: string;

  constructor(options: { fetch?: FetchPort; endpoint?: string } = {}) {
    this.#fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.#endpoint = options.endpoint ?? "/v1/feedback";
  }

  async submit(request: FeedbackRequestV1): Promise<FeedbackReceiptV1> {
    const parsed = FeedbackRequestV1Schema.parse(request);
    let response: Response;
    try {
      response = await this.#fetch(this.#endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(parsed)
      });
    } catch (error) {
      throw feedbackError(
        503,
        "UPSTREAM_UNAVAILABLE",
        "目前無法連線到回報服務",
        error
      );
    }
    const body = await readJson(response);
    if (!response.ok) {
      throw feedbackError(
        response.status,
        readCode(body, response.status),
        readMessage(body, response.status)
      );
    }
    try {
      return FeedbackReceiptV1Schema.parse(body);
    } catch (error) {
      throw feedbackError(502, "SERVER_ERROR", "回報服務回應格式不正確", error);
    }
  }
}

function feedbackError(
  status: number,
  code: CloudError["code"],
  message: string,
  cause?: unknown
): CloudError {
  return { status, code, message, ...(cause === undefined ? {} : { cause }) };
}

function readCode(body: unknown, status: number): CloudError["code"] {
  if (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof body.error === "object" &&
    body.error !== null &&
    "code" in body.error &&
    typeof body.error.code === "string"
  ) {
    const code = body.error.code;
    if (
      [
        "RATE_LIMITED",
        "VALIDATION_ERROR",
        "SERVER_ERROR",
        "UPSTREAM_UNAVAILABLE"
      ].includes(code)
    ) {
      return code as CloudError["code"];
    }
  }
  if (status === 422) return "VALIDATION_ERROR";
  if (status === 429) return "RATE_LIMITED";
  if (status === 503) return "UPSTREAM_UNAVAILABLE";
  return "SERVER_ERROR";
}

function readMessage(body: unknown, status: number): string {
  if (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof body.error === "object" &&
    body.error !== null &&
    "message" in body.error &&
    typeof body.error.message === "string"
  ) {
    return body.error.message;
  }
  return `回報服務回應 ${status}`;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
