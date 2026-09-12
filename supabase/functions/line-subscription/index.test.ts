import { describe, expect, it, vi } from "vitest";

vi.mock("npm:@supabase/supabase-js@2", () => ({
  createClient: vi.fn()
}));

vi.stubGlobal("Deno", { env: { get: vi.fn(() => undefined) } });

import { handleLineSubscription } from "./index";

function makeMockDb(rows: Array<{ local_visitor_id: string; line_user_id: string; status: string }> = []) {
  let dbRows = [...rows];
  return {
    from: vi.fn((tableName: string) => {
      let selectedFields: string | null = null;
      let filterVisitor: string | null = null;
      let filterStatus: string | null = null;
      let updateData: Record<string, unknown> | null = null;

      const builder = {
        select: vi.fn((fields: string) => {
          selectedFields = fields;
          return builder;
        }),
        eq: vi.fn((col: string, val: string) => {
          if (col === "local_visitor_id") filterVisitor = val;
          if (col === "status") filterStatus = val;
          return builder;
        }),
        maybeSingle: vi.fn(async () => {
          const match = dbRows.find(
            (r) =>
              (!filterVisitor || r.local_visitor_id === filterVisitor) &&
              (!filterStatus || r.status === filterStatus)
          );
          return { data: match ?? null, error: null };
        }),
        update: vi.fn((data: Record<string, unknown>) => {
          updateData = data;
          return {
            eq: vi.fn((col1: string, val1: string) => {
              if (col1 === "local_visitor_id") filterVisitor = val1;
              return {
                eq: vi.fn((col2: string, val2: string) => {
                  if (col2 === "status") filterStatus = val2;
                  dbRows = dbRows.map((r) => {
                    if (
                      (!filterVisitor || r.local_visitor_id === filterVisitor) &&
                      (!filterStatus || r.status === filterStatus)
                    ) {
                      return { ...r, ...updateData };
                    }
                    return r;
                  });
                  return { error: null };
                })
              };
            })
          };
        }),
        insert: vi.fn(async (row: any) => {
          dbRows.push(row);
          return { error: null };
        })
      };
      return builder;
    })
  };
}

describe("handleLineSubscription", () => {
  const baseEnv: Record<string, string> = {
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "secret-key",
    LINE_CHANNEL_ID: "client-id-1",
    LINE_CHANNEL_SECRET: "client-secret-1"
  };

  it("OPTIONS 請求回傳 204", async () => {
    const req = new Request("https://example.supabase.co/functions/v1/line-subscription", {
      method: "OPTIONS"
    });
    const res = await handleLineSubscription(req);
    expect(res.status).toBe(204);
  });

  describe("查詢狀態 /status", () => {
    it("缺少訪客識別碼回傳 400", async () => {
      const req = new Request("https://example.supabase.co/functions/v1/line-subscription/status", {
        method: "GET"
      });
      const res = await handleLineSubscription(req, {
        readEnv: (key) => baseEnv[key]
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.message).toContain("缺少訪客識別碼");
    });

    it("無 active 綁定時回傳 bound: false", async () => {
      const mockDb = makeMockDb([]);
      const req = new Request("https://example.supabase.co/functions/v1/line-subscription/status?visitorId=visitor-1", {
        method: "GET"
      });
      const res = await handleLineSubscription(req, {
        readEnv: (key) => baseEnv[key],
        createDbClient: () => mockDb
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({ bound: false, lineUserId: undefined });
    });

    it("有 active 綁定時回傳 bound: true 與 lineUserId", async () => {
      const mockDb = makeMockDb([
        { local_visitor_id: "visitor-1", line_user_id: "U77777", status: "active" }
      ]);
      const req = new Request("https://example.supabase.co/functions/v1/line-subscription/status?visitorId=visitor-1", {
        method: "GET"
      });
      const res = await handleLineSubscription(req, {
        readEnv: (key) => baseEnv[key],
        createDbClient: () => mockDb
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({ bound: true, lineUserId: "U77777" });
    });
  });

  describe("解除綁定 /unbind", () => {
    it("成功將狀態改為 revoked", async () => {
      const mockDb = makeMockDb([
        { local_visitor_id: "visitor-1", line_user_id: "U77777", status: "active" }
      ]);
      const req = new Request("https://example.supabase.co/functions/v1/line-subscription/unbind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ localVisitorId: "visitor-1" })
      });
      const res = await handleLineSubscription(req, {
        readEnv: (key) => baseEnv[key],
        createDbClient: () => mockDb
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({ ok: true });
    });
  });

  describe("發送測試通知 /test", () => {
    it("尚未綁定時回傳 404", async () => {
      const mockDb = makeMockDb([]);
      const req = new Request("https://example.supabase.co/functions/v1/line-subscription/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ localVisitorId: "visitor-1" })
      });
      const res = await handleLineSubscription(req, {
        readEnv: (key) => baseEnv[key],
        createDbClient: () => mockDb
      });
      expect(res.status).toBe(404);
    });

    it("已綁定時成功發送推播", async () => {
      const mockDb = makeMockDb([
        { local_visitor_id: "visitor-1", line_user_id: "U77777", status: "active" }
      ]);
      const mockFetch = vi
        .fn()
        .mockImplementationOnce(async () =>
          new Response(JSON.stringify({ access_token: "mock-token", expires_in: 3600 }), { status: 200 })
        )
        .mockImplementationOnce(async () =>
          new Response(JSON.stringify({}), { status: 200 })
        );

      const req = new Request("https://example.supabase.co/functions/v1/line-subscription/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ localVisitorId: "visitor-1" })
      });
      const res = await handleLineSubscription(req, {
        readEnv: (key) => baseEnv[key],
        fetch: mockFetch as unknown as typeof fetch,
        createDbClient: () => mockDb
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({ ok: true });
    });
  });

  describe("OAuth 交換 /exchange", () => {
    it("成功向 LINE 換證、取得 Profile 並寫入資料庫與發送歡迎訊息", async () => {
      const mockDb = makeMockDb([]);
      const mockFetch = vi
        .fn()
        // 1. token exchange
        .mockImplementationOnce(async () =>
          new Response(JSON.stringify({ access_token: "access-token-123" }), { status: 200 })
        )
        // 2. get profile
        .mockImplementationOnce(async () =>
          new Response(JSON.stringify({ userId: "U99999", displayName: "小明" }), { status: 200 })
        )
        // 3. line token for welcome push
        .mockImplementationOnce(async () =>
          new Response(JSON.stringify({ access_token: "access-token-123", expires_in: 3600 }), { status: 200 })
        )
        // 4. push welcome message
        .mockImplementationOnce(async () =>
          new Response(JSON.stringify({}), { status: 200 })
        );

      const req = new Request("https://example.supabase.co/functions/v1/line-subscription/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: "auth-code-xyz",
          redirectUri: "https://example.com/settings/notifications",
          localVisitorId: "visitor-9"
        })
      });

      const res = await handleLineSubscription(req, {
        readEnv: (key) => baseEnv[key],
        fetch: mockFetch as unknown as typeof fetch,
        createDbClient: () => mockDb
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({
        ok: true,
        lineUserId: "U99999",
        displayName: "小明"
      });
    });
  });
});
