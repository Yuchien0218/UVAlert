import { ref, type Ref } from "vue";

export interface LineNotificationDependencies {
  readonly identity: {
    getOrCreateLocalVisitorId(): Promise<string>;
    getOrCreateDeviceLocalId?(): Promise<string>;
  };
  readonly apiBaseUrl?: string | undefined;
  readonly lineChannelId?: string | undefined;
  readonly fetch?: typeof fetch | undefined;
  readonly getLocationHref?: (() => string) | undefined;
  readonly setLocationHref?: ((url: string) => void) | undefined;
  readonly getStorage?: (() => Storage | null) | undefined;
}

export interface LineNotificationController {
  readonly isBound: Readonly<Ref<boolean>>;
  readonly lineUserId: Readonly<Ref<string | null>>;
  readonly isLoading: Readonly<Ref<boolean>>;
  readonly isConfigured: Readonly<Ref<boolean>>;
  readonly error: Readonly<Ref<string | null>>;
  readonly actionMessage: Readonly<Ref<string | null>>;

  fetchStatus(): Promise<void>;
  startBinding(redirectUri?: string): void;
  handleCallback(code: string, redirectUri?: string): Promise<boolean>;
  unbind(): Promise<boolean>;
  sendTest(): Promise<boolean>;
  clearError(): void;
  clearActionMessage(): void;
}

const DEFAULT_API_BASE_URL = "/v1";

function resolveApiBaseUrl(baseUrl?: string): string {
  const url = baseUrl?.trim() || DEFAULT_API_BASE_URL;
  return url.replace(/\/+$/, "");
}

export function createLineNotificationController(
  deps: LineNotificationDependencies
): LineNotificationController {
  const isBound = ref(false);
  const lineUserId = ref<string | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const actionMessage = ref<string | null>(null);

  const channelId =
    deps.lineChannelId ||
    (typeof import.meta !== "undefined" && import.meta.env
      ? import.meta.env.VITE_LINE_LOGIN_CHANNEL_ID ||
        import.meta.env.VITE_LINE_CHANNEL_ID
      : "");

  const isConfigured = ref(Boolean(channelId?.trim()));

  const fetchFn = deps.fetch ?? globalThis.fetch.bind(globalThis);
  const apiBase = resolveApiBaseUrl(
    deps.apiBaseUrl ||
      (typeof import.meta !== "undefined" && import.meta.env
        ? import.meta.env.VITE_API_BASE_URL
        : undefined)
  );

  const getLocationHref =
    deps.getLocationHref ??
    (() => (typeof window !== "undefined" ? window.location.href : ""));

  const setLocationHref =
    deps.setLocationHref ??
    ((url: string) => {
      if (typeof window !== "undefined") {
        window.location.href = url;
      }
    });

  const getStorage =
    deps.getStorage ??
    (() => (typeof window !== "undefined" ? window.sessionStorage : null));

  function clearError() {
    error.value = null;
  }

  function clearActionMessage() {
    actionMessage.value = null;
  }

  async function fetchStatus(): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const visitorId = await deps.identity.getOrCreateLocalVisitorId();
      const endpoint = `${apiBase}/line-subscription/status?visitorId=${encodeURIComponent(visitorId)}`;
      const res = await fetchFn(endpoint, {
        method: "GET",
        headers: { Accept: "application/json" }
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message || `查詢失敗 (${res.status})`);
      }

      const data = await res.json();
      isBound.value = Boolean(data?.bound);
      lineUserId.value = data?.lineUserId ?? null;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "無法取得 LINE 綁定狀態";
    } finally {
      isLoading.value = false;
    }
  }

  function startBinding(customRedirectUri?: string): void {
    if (!channelId?.trim()) {
      error.value = "尚未設定 LINE Channel ID，請於系統環境變數中設定。";
      return;
    }

    clearError();
    clearActionMessage();

    let currentOrigin = "";
    let currentPath = "";
    if (typeof window !== "undefined" && window.location) {
      currentOrigin = window.location.origin;
      currentPath = window.location.pathname;
    }

    const redirectUri =
      customRedirectUri ||
      (currentOrigin ? `${currentOrigin}${currentPath}` : getLocationHref());

    const state = `line_state_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const storage = getStorage();
    if (storage) {
      storage.setItem("line_oauth_state", state);
    }

    const authUrl = new URL("https://access.line.me/oauth2/v2.1/authorize");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", channelId.trim());
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("scope", "profile openid");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("bot_prompt", "aggressive");

    setLocationHref(authUrl.toString());
  }

  async function handleCallback(
    code: string,
    customRedirectUri?: string
  ): Promise<boolean> {
    if (!code?.trim()) {
      error.value = "未取得有效的授權碼";
      return false;
    }

    isLoading.value = true;
    clearError();
    clearActionMessage();

    try {
      const visitorId = await deps.identity.getOrCreateLocalVisitorId();

      let currentOrigin = "";
      let currentPath = "";
      if (typeof window !== "undefined" && window.location) {
        currentOrigin = window.location.origin;
        currentPath = window.location.pathname;
      }

      const redirectUri =
        customRedirectUri ||
        (currentOrigin ? `${currentOrigin}${currentPath}` : getLocationHref());

      const endpoint = `${apiBase}/line-subscription/exchange`;
      const res = await fetchFn(endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          code: code.trim(),
          redirectUri,
          localVisitorId: visitorId
        })
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error?.message || `綁定失敗 (${res.status})`);
      }

      isBound.value = true;
      if (data?.lineUserId) {
        lineUserId.value = data.lineUserId;
      }
      actionMessage.value = "LINE 補擦提醒已成功綁定！";
      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "LINE 授權綁定失敗";
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function unbind(): Promise<boolean> {
    isLoading.value = true;
    clearError();
    clearActionMessage();

    try {
      const visitorId = await deps.identity.getOrCreateLocalVisitorId();
      const endpoint = `${apiBase}/line-subscription/unbind`;
      const res = await fetchFn(endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          localVisitorId: visitorId
        })
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error?.message || `解除綁定失敗 (${res.status})`);
      }

      isBound.value = false;
      lineUserId.value = null;
      actionMessage.value = "已解除 LINE 補擦提醒綁定。";
      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "解除綁定失敗";
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function sendTest(): Promise<boolean> {
    isLoading.value = true;
    clearError();
    clearActionMessage();

    try {
      const visitorId = await deps.identity.getOrCreateLocalVisitorId();
      const endpoint = `${apiBase}/line-subscription/test`;
      const res = await fetchFn(endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          localVisitorId: visitorId
        })
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error?.message || `發送失敗 (${res.status})`);
      }

      actionMessage.value = "測試提醒已傳送至您的 LINE，請查看訊息！";
      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "測試提醒發送失敗";
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    isBound,
    lineUserId,
    isLoading,
    isConfigured,
    error,
    actionMessage,
    fetchStatus,
    startBinding,
    handleCallback,
    unbind,
    sendTest,
    clearError,
    clearActionMessage
  };
}
