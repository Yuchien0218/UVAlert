import {
  SyncCommitRequestV1Schema,
  SyncCommitResultV1Schema,
  SyncDeleteRequestV1Schema,
  SyncDeleteResultV1Schema,
  SyncManifestV1Schema,
  SyncReadRequestV1Schema,
  SyncReadResponseV1Schema,
  type SyncCommitRequestV1,
  type SyncCommitResultV1,
  type SyncDeleteRequestV1,
  type SyncDeleteResultV1,
  type SyncManifestV1,
  type SyncReadRequestV1,
  type SyncReadResponseV1
} from "@sunshield/contracts";
import type {
  AuthPort,
  CloudError,
  CloudErrorCode,
  CloudSyncPort
} from "@sunshield/platform";

type FetchPort = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

const KNOWN_ERROR_CODES: readonly CloudErrorCode[] = [
  "AUTH_REQUIRED",
  "FORBIDDEN",
  "SYNC_CONFLICT",
  "VALIDATION_ERROR",
  "RATE_LIMITED",
  "UPSTREAM_UNAVAILABLE",
  "SERVER_ERROR"
];

export class SupabaseCloudSyncAdapter implements CloudSyncPort {
  readonly #auth: AuthPort;
  readonly #fetch: FetchPort;
  readonly #baseUrl: string;

  constructor(options: {
    auth: AuthPort;
    fetch?: FetchPort;
    baseUrl?: string;
  }) {
    this.#auth = options.auth;
    this.#fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.#baseUrl = trimTrailingSlash(
      options.baseUrl ?? import.meta.env.VITE_API_BASE_URL ?? "/v1"
    );
  }

  async getManifest(): Promise<SyncManifestV1> {
    return this.#request(
      "/sync/manifest",
      { method: "GET" },
      SyncManifestV1Schema
    );
  }

  async read(request: SyncReadRequestV1): Promise<SyncReadResponseV1> {
    const parsed = SyncReadRequestV1Schema.parse(request);
    return this.#request(
      "/sync/read",
      jsonRequest(parsed),
      SyncReadResponseV1Schema
    );
  }

  async commit(request: SyncCommitRequestV1): Promise<SyncCommitResultV1> {
    const parsed = SyncCommitRequestV1Schema.parse(request);
    return this.#request(
      "/sync/commit",
      jsonRequest(parsed),
      SyncCommitResultV1Schema
    );
  }

  async delete(request: SyncDeleteRequestV1): Promise<SyncDeleteResultV1> {
    const parsed = SyncDeleteRequestV1Schema.parse(request);
    return this.#request(
      "/sync/delete",
      jsonRequest(parsed),
      SyncDeleteResultV1Schema
    );
  }

  async deleteAccount(): Promise<void> {
    await this.#requestRaw("/account/delete", jsonRequest({ confirm: true }));
  }

  async #request<T>(
    path: string,
    init: RequestInit,
    schema: { parse(input: unknown): T }
  ): Promise<T> {
    const response = await this.#requestRaw(path, init);
    const body = await readJson(response);
    try {
      return schema.parse(body);
    } catch (error) {
      throw makeCloudError(502, "SERVER_ERROR", "雲端回應格式不正確", error);
    }
  }

  async #requestRaw(path: string, init: RequestInit): Promise<Response> {
    const accessToken = await this.#getAccessToken();
    let response: Response;
    try {
      response = await this.#fetch(`${this.#baseUrl}${path}`, {
        ...init,
        headers: {
          Accept: "application/json",
          ...(init.body === undefined
            ? {}
            : { "Content-Type": "application/json" }),
          ...(init.headers ?? {}),
          Authorization: `Bearer ${accessToken}`
        }
      });
    } catch (error) {
      throw makeCloudError(
        503,
        "UPSTREAM_UNAVAILABLE",
        "目前無法連線到同步服務",
        error
      );
    }

    if (!response.ok) {
      const body = await readJson(response);
      throw makeCloudError(
        response.status,
        readErrorCode(body, response.status),
        readErrorMessage(body, response.status),
        undefined,
        readConflictList(body)
      );
    }
    return response;
  }

  async #getAccessToken(): Promise<string> {
    let state;
    try {
      state = await this.#auth.getState();
    } catch (error) {
      throw makeCloudError(401, "AUTH_REQUIRED", "請先登入 UVAlert", error);
    }
    if (state.kind !== "signed_in") {
      throw makeCloudError(401, "AUTH_REQUIRED", "請先登入 UVAlert");
    }
    // AuthState deliberately only exposes expiry metadata.  The adapter that
    // talks to the API may provide the token through this optional method,
    // keeping the token out of UI state and local snapshots.
    const tokenProvider = this.#auth as AuthPort & {
      getAccessToken?: () => Promise<string | null>;
    };
    let token: string | null | undefined;
    try {
      token = await tokenProvider.getAccessToken?.();
    } catch (error) {
      throw makeCloudError(
        401,
        "AUTH_REQUIRED",
        "無法取得登入憑證，請重新登入",
        error
      );
    }
    if (token === null || token === undefined || token.trim() === "") {
      throw makeCloudError(401, "AUTH_REQUIRED", "登入狀態已過期，請重新登入");
    }
    return token;
  }
}

/** 未設定 Supabase 時仍可啟動免登入模式的明確 disabled adapter。 */
export class DisabledCloudSyncAdapter implements CloudSyncPort {
  getManifest(): Promise<never> {
    return Promise.reject(disabledError());
  }

  read(): Promise<never> {
    return Promise.reject(disabledError());
  }

  commit(): Promise<never> {
    return Promise.reject(disabledError());
  }

  delete(): Promise<never> {
    return Promise.reject(disabledError());
  }

  deleteAccount(): Promise<never> {
    return Promise.reject(disabledError());
  }
}

export function createSupabaseCloudSyncAdapter(options: {
  auth: AuthPort;
  fetch?: FetchPort;
  baseUrl?: string;
}): CloudSyncPort {
  const baseUrl = options.baseUrl ?? import.meta.env.VITE_API_BASE_URL;
  const hasSupabaseConfig =
    import.meta.env.VITE_SUPABASE_URL !== undefined &&
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY !== undefined;
  if (baseUrl === undefined && !hasSupabaseConfig) {
    return new DisabledCloudSyncAdapter();
  }
  return new SupabaseCloudSyncAdapter({
    ...options,
    ...(baseUrl === undefined ? {} : { baseUrl })
  });
}

function jsonRequest(body: unknown): RequestInit {
  return {
    method: "POST",
    body: JSON.stringify(body)
  };
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/$/, "");
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function readErrorCode(body: unknown, status: number): CloudErrorCode {
  if (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof body.error === "object" &&
    body.error !== null &&
    "code" in body.error &&
    typeof body.error.code === "string" &&
    KNOWN_ERROR_CODES.includes(body.error.code as CloudErrorCode)
  ) {
    return body.error.code as CloudErrorCode;
  }
  if (status === 401) return "AUTH_REQUIRED";
  if (status === 403) return "FORBIDDEN";
  if (status === 409) return "SYNC_CONFLICT";
  if (status === 422) return "VALIDATION_ERROR";
  if (status === 429) return "RATE_LIMITED";
  if (status === 502 || status === 503) return "UPSTREAM_UNAVAILABLE";
  return "SERVER_ERROR";
}

function readErrorMessage(body: unknown, status: number): string {
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
  return `同步服務回應 ${status}`;
}

function readConflictList(body: unknown) {
  if (
    typeof body === "object" &&
    body !== null &&
    "conflicts" in body &&
    Array.isArray(body.conflicts)
  ) {
    return body.conflicts;
  }
  return undefined;
}

function makeCloudError(
  status: number,
  code: CloudErrorCode,
  message: string,
  cause?: unknown,
  conflicts?: unknown[]
): CloudError {
  const result: CloudError = {
    status,
    code,
    message
  };
  if (cause !== undefined) result.cause = cause;
  if (conflicts !== undefined) {
    result.conflicts = conflicts as NonNullable<CloudError["conflicts"]>;
  }
  return result;
}

function disabledError(): CloudError {
  return {
    status: 503,
    code: "SERVER_ERROR",
    message: "雲端同步尚未設定"
  };
}
