import { describe, expect, it, vi } from "vitest";
import {
  createLineNotificationController,
  type LineNotificationDependencies
} from "./createLineNotificationController";

function createMockDeps(
  overrides: Partial<LineNotificationDependencies> = {}
): {
  deps: LineNotificationDependencies;
  mockFetch: ReturnType<typeof vi.fn>;
  mockSetLocation: ReturnType<typeof vi.fn>;
  mockStorage: Record<string, string>;
} {
  const mockFetch = vi.fn();
  const mockSetLocation = vi.fn();
  const mockStorage: Record<string, string> = {};

  const deps: LineNotificationDependencies = {
    identity: {
      getOrCreateLocalVisitorId: vi.fn(async () => "test-visitor-123"),
      getOrCreateDeviceLocalId: vi.fn(async () => "test-device-456")
    },
    apiBaseUrl: "https://api.test/v1",
    lineChannelId: "test-channel-id",
    fetch: mockFetch,
    getLocationHref: () => "https://uvalert.test/settings/notifications",
    setLocationHref: mockSetLocation,
    getStorage: () =>
      ({
        getItem: (k: string) => mockStorage[k] ?? null,
        setItem: (k: string, v: string) => {
          mockStorage[k] = v;
        },
        removeItem: (k: string) => {
          delete mockStorage[k];
        },
        clear: () => {
          Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
        }
      }) as unknown as Storage,
    ...overrides
  };

  return { deps, mockFetch, mockSetLocation, mockStorage };
}

describe("createLineNotificationController", () => {
  it("初始化狀態為未綁定且非載入中", () => {
    const { deps } = createMockDeps();
    const controller = createLineNotificationController(deps);

    expect(controller.isBound.value).toBe(false);
    expect(controller.lineUserId.value).toBeNull();
    expect(controller.isLoading.value).toBe(false);
    expect(controller.isConfigured.value).toBe(true);
    expect(controller.error.value).toBeNull();
  });

  describe("fetchStatus", () => {
    it("成功查詢已綁定狀態", async () => {
      const { deps, mockFetch } = createMockDeps();
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ bound: true, lineUserId: "U12345678" }),
          { status: 200 }
        )
      );

      const controller = createLineNotificationController(deps);
      await controller.fetchStatus();

      expect(controller.isBound.value).toBe(true);
      expect(controller.lineUserId.value).toBe("U12345678");
      expect(controller.error.value).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test/v1/line-subscription/status?visitorId=test-visitor-123",
        expect.objectContaining({ method: "GET" })
      );
    });

    it("成功查詢未綁定狀態", async () => {
      const { deps, mockFetch } = createMockDeps();
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ bound: false }), { status: 200 })
      );

      const controller = createLineNotificationController(deps);
      await controller.fetchStatus();

      expect(controller.isBound.value).toBe(false);
      expect(controller.lineUserId.value).toBeNull();
    });

    it("查詢失敗時記錄錯誤訊息", async () => {
      const { deps, mockFetch } = createMockDeps();
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error: { message: "資料庫連線逾時" } }),
          { status: 500 }
        )
      );

      const controller = createLineNotificationController(deps);
      await controller.fetchStatus();

      expect(controller.error.value).toBe("資料庫連線逾時");
    });
  });

  describe("startBinding", () => {
    it("產生正確的 LINE OAuth 轉址網址並存入 state", () => {
      const { deps, mockSetLocation, mockStorage } = createMockDeps();
      const controller = createLineNotificationController(deps);

      controller.startBinding();

      expect(mockSetLocation).toHaveBeenCalledTimes(1);
      const callArgs = mockSetLocation.mock.calls[0];
      expect(callArgs).toBeDefined();
      const redirectUrl = new URL(callArgs![0]);
      expect(redirectUrl.origin).toBe("https://access.line.me");
      expect(redirectUrl.pathname).toBe("/oauth2/v2.1/authorize");
      expect(redirectUrl.searchParams.get("client_id")).toBe("test-channel-id");
      expect(redirectUrl.searchParams.get("response_type")).toBe("code");
      expect(redirectUrl.searchParams.get("scope")).toBe("profile openid");
      expect(redirectUrl.searchParams.get("prompt")).toBe("consent");
      expect(redirectUrl.searchParams.get("bot_prompt")).toBe("aggressive");

      const state = redirectUrl.searchParams.get("state");
      expect(state).toBeTruthy();
      expect(mockStorage["line_oauth_state"]).toBe(state);
    });

    it("若未設定 Channel ID 則設定錯誤訊息並不轉址", () => {
      const { deps, mockSetLocation } = createMockDeps({ lineChannelId: "" });
      const controller = createLineNotificationController(deps);

      controller.startBinding();

      expect(mockSetLocation).not.toHaveBeenCalled();
      expect(controller.error.value).toContain("尚未設定 LINE Channel ID");
    });
  });

  describe("handleCallback", () => {
    it("成功以 code 換取 token 完成綁定", async () => {
      const { deps, mockFetch } = createMockDeps();
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ ok: true, lineUserId: "U88888888" }),
          { status: 200 }
        )
      );

      const controller = createLineNotificationController(deps);
      const success = await controller.handleCallback("oauth-auth-code-123");

      expect(success).toBe(true);
      expect(controller.isBound.value).toBe(true);
      expect(controller.lineUserId.value).toBe("U88888888");
      expect(controller.actionMessage.value).toContain("成功綁定");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test/v1/line-subscription/exchange",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            code: "oauth-auth-code-123",
            redirectUri: "https://uvalert.test/settings/notifications",
            localVisitorId: "test-visitor-123"
          })
        })
      );
    });

    it("缺少 code 時拒絕發送並回傳 false", async () => {
      const { deps, mockFetch } = createMockDeps();
      const controller = createLineNotificationController(deps);

      const success = await controller.handleCallback("");

      expect(success).toBe(false);
      expect(controller.error.value).toBe("未取得有效的授權碼");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("伺服器回應錯誤時記錄錯誤", async () => {
      const { deps, mockFetch } = createMockDeps();
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error: { message: "授權碼無效或已過期" } }),
          { status: 400 }
        )
      );

      const controller = createLineNotificationController(deps);
      const success = await controller.handleCallback("invalid-code");

      expect(success).toBe(false);
      expect(controller.isBound.value).toBe(false);
      expect(controller.error.value).toBe("授權碼無效或已過期");
    });
  });

  describe("unbind", () => {
    it("成功呼叫解除綁定並重設狀態", async () => {
      const { deps, mockFetch } = createMockDeps();
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      );

      const controller = createLineNotificationController(deps);
      const success = await controller.unbind();

      expect(success).toBe(true);
      expect(controller.isBound.value).toBe(false);
      expect(controller.lineUserId.value).toBeNull();
      expect(controller.actionMessage.value).toContain("已解除");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test/v1/line-subscription/unbind",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ localVisitorId: "test-visitor-123" })
        })
      );
    });

    it("解除失敗時記錄錯誤", async () => {
      const { deps, mockFetch } = createMockDeps();
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error: { message: "資料庫錯誤" } }),
          { status: 500 }
        )
      );

      const controller = createLineNotificationController(deps);
      const success = await controller.unbind();

      expect(success).toBe(false);
      expect(controller.error.value).toBe("資料庫錯誤");
    });
  });

  describe("sendTest", () => {
    it("成功發送測試提醒", async () => {
      const { deps, mockFetch } = createMockDeps();
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      );

      const controller = createLineNotificationController(deps);
      const success = await controller.sendTest();

      expect(success).toBe(true);
      expect(controller.actionMessage.value).toContain("測試提醒已傳送");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test/v1/line-subscription/test",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ localVisitorId: "test-visitor-123" })
        })
      );
    });

    it("發送測試提醒失敗時顯示錯誤", async () => {
      const { deps, mockFetch } = createMockDeps();
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error: { message: "尚未綁定 LINE 帳號" } }),
          { status: 404 }
        )
      );

      const controller = createLineNotificationController(deps);
      const success = await controller.sendTest();

      expect(success).toBe(false);
      expect(controller.error.value).toBe("尚未綁定 LINE 帳號");
    });
  });

  it("可主動清除錯誤與提示訊息", () => {
    const { deps } = createMockDeps({ lineChannelId: "" });
    const controller = createLineNotificationController(deps);

    controller.startBinding();
    expect(controller.error.value).toBeTruthy();

    controller.clearError();
    expect(controller.error.value).toBeNull();
  });
});
