import { describe, expect, it, vi } from "vitest";
import {
  createPrivacyDigestHandler,
  createPrivacyDigestRpcDependencies,
  mapPrivacyDigestClaimRows,
  type ClaimedPrivacyDigest,
  type PrivacyDigestDependencies
} from "./handler";

const now = new Date("2026-09-07T01:00:00.000Z");
const claimed: ClaimedPrivacyDigest = {
  batchId: "10000000-0000-4000-8000-000000000001",
  claimToken: "20000000-0000-4000-8000-000000000001",
  digestDate: "2026-09-07",
  items: [
    {
      feedbackId: "30000000-0000-4000-8000-000000000001",
      message: "完整使用者留言",
      contactEmail: null,
      createdAt: "2026-09-07T00:30:00.000Z"
    }
  ]
};
const rpcRow = {
  batch_id: claimed.batchId,
  claim_token: claimed.claimToken,
  digest_date: claimed.digestDate,
  feedback_id: claimed.items[0]!.feedbackId,
  message: claimed.items[0]!.message,
  contact_email: null,
  created_at: claimed.items[0]!.createdAt
};

function makeDependencies(
  overrides: Partial<PrivacyDigestDependencies> = {}
): PrivacyDigestDependencies {
  return {
    readSecret: vi.fn(
      (name) =>
        ({
          PRIVACY_DIGEST_SECRET: "digest-secret",
          RESEND_API_KEY: "resend-api-key",
          PRIVACY_DIGEST_RECIPIENT: "private@example.test"
        })[name]
    ),
    compareSecret: vi.fn(async (left, right) => left === right),
    claim: vi.fn(async () => null),
    settle: vi.fn(async () => true),
    sendEmail: vi.fn(async () => ({ messageId: "email-123" })),
    now: vi.fn(() => now),
    reportError: vi.fn(),
    ...overrides
  };
}

function authorizedRequest() {
  return new Request("https://api.test/privacy-digest", {
    method: "POST",
    headers: { "X-Privacy-Digest-Secret": "digest-secret" }
  });
}

describe("privacy digest handler", () => {
  it("rejects requests without the digest secret before claiming", async () => {
    const dependencies = makeDependencies();
    const response = await createPrivacyDigestHandler(dependencies)(
      new Request("https://api.test/privacy-digest", { method: "POST" })
    );

    expect(response.status).toBe(401);
    expect(dependencies.compareSecret).toHaveBeenCalledWith(
      "",
      "digest-secret"
    );
    expect(dependencies.claim).not.toHaveBeenCalled();
  });

  it("rejects non-POST requests before comparing or claiming", async () => {
    const dependencies = makeDependencies();
    const response = await createPrivacyDigestHandler(dependencies)(
      new Request("https://api.test/privacy-digest", { method: "GET" })
    );

    expect(response.status).toBe(405);
    expect(dependencies.compareSecret).not.toHaveBeenCalled();
    expect(dependencies.claim).not.toHaveBeenCalled();
  });

  it.each(["RESEND_API_KEY", "PRIVACY_DIGEST_RECIPIENT"] as const)(
    "returns a fixed server error without claiming when %s is blank",
    async (missingName) => {
      const dependencies = makeDependencies({
        readSecret: vi.fn((name) =>
          name === missingName
            ? "   "
            : name === "PRIVACY_DIGEST_SECRET"
              ? "digest-secret"
              : "configured"
        )
      });

      const response =
        await createPrivacyDigestHandler(dependencies)(authorizedRequest());

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({
        error: {
          code: "SERVER_ERROR",
          message: "隱私資料請求摘要服務設定不完整"
        }
      });
      expect(dependencies.reportError).toHaveBeenCalledWith(
        "PRIVACY_DIGEST_CONFIG_MISSING"
      );
      expect(dependencies.claim).not.toHaveBeenCalled();
    }
  );

  it("returns no-op without calling Resend when no privacy requests exist", async () => {
    const dependencies = makeDependencies({
      claim: vi.fn(async () => null)
    });

    await expect(
      createPrivacyDigestHandler(dependencies)(authorizedRequest()).then(
        (response) => response.json()
      )
    ).resolves.toEqual({ status: "no-op", claimed: 0, sent: 0 });
    expect(dependencies.sendEmail).not.toHaveBeenCalled();
  });

  it("renders and sends one homogeneous claim before settling it as sent", async () => {
    const dependencies = makeDependencies({
      claim: vi.fn(async () => claimed)
    });

    const response =
      await createPrivacyDigestHandler(dependencies)(authorizedRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "sent",
      claimed: 1,
      sent: 1
    });
    expect(dependencies.sendEmail).toHaveBeenCalledWith({
      apiKey: "resend-api-key",
      recipient: "private@example.test",
      email: expect.objectContaining({
        subject: "UVAlert 隱私資料請求摘要｜2026-09-07",
        text: expect.stringContaining("完整使用者留言")
      }),
      idempotencyKey: `privacy-digest:${claimed.batchId}`
    });
    expect(dependencies.settle).toHaveBeenCalledWith({
      batchId: claimed.batchId,
      claimToken: claimed.claimToken,
      outcome: "sent",
      now: now.toISOString(),
      providerMessageId: "email-123",
      errorCode: null
    });
  });

  it("settles retry and reports only fixed codes when Resend fails", async () => {
    const reportError = vi.fn();
    const dependencies = makeDependencies({
      claim: vi.fn(async () => claimed),
      sendEmail: vi.fn(async () => {
        throw new Error("provider rejected resend-api-key for 完整使用者留言");
      }),
      reportError
    });

    const response =
      await createPrivacyDigestHandler(dependencies)(authorizedRequest());

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "PRIVACY_DIGEST_SEND_FAILED",
        message: "目前無法寄送隱私資料請求摘要"
      }
    });
    expect(dependencies.settle).toHaveBeenCalledWith({
      batchId: claimed.batchId,
      claimToken: claimed.claimToken,
      outcome: "retry",
      now: now.toISOString(),
      providerMessageId: null,
      errorCode: "RESEND_SEND_FAILED"
    });
    expect(reportError).toHaveBeenCalledWith("PRIVACY_DIGEST_SEND_FAILED");
    expect(JSON.stringify(reportError.mock.calls)).not.toContain(
      "完整使用者留言"
    );
    expect(JSON.stringify(reportError.mock.calls)).not.toContain(
      "resend-api-key"
    );
  });

  it("does not report sent when the claim can no longer be settled", async () => {
    const dependencies = makeDependencies({
      claim: vi.fn(async () => claimed),
      settle: vi.fn(async () => false)
    });

    const response =
      await createPrivacyDigestHandler(dependencies)(authorizedRequest());

    expect(response.status).toBe(500);
    expect(dependencies.reportError).toHaveBeenCalledWith(
      "PRIVACY_DIGEST_SETTLE_FAILED"
    );
  });

  it("returns a controlled error without sending when claim data is mixed", async () => {
    const dependencies = makeDependencies({
      claim: vi.fn(async () =>
        mapPrivacyDigestClaimRows([
          rpcRow,
          {
            ...rpcRow,
            batch_id: "10000000-0000-4000-8000-000000000002"
          }
        ])
      )
    });

    const response =
      await createPrivacyDigestHandler(dependencies)(authorizedRequest());

    expect(response.status).toBe(500);
    expect(dependencies.reportError).toHaveBeenCalledWith(
      "PRIVACY_DIGEST_CLAIM_FAILED"
    );
    expect(dependencies.sendEmail).not.toHaveBeenCalled();
  });

  it("returns a controlled error without sending when a claim row is malformed", async () => {
    const dependencies = makeDependencies({
      claim: vi.fn(async () =>
        mapPrivacyDigestClaimRows([{ ...rpcRow, message: { private: true } }])
      )
    });

    const response =
      await createPrivacyDigestHandler(dependencies)(authorizedRequest());

    expect(response.status).toBe(500);
    expect(dependencies.sendEmail).not.toHaveBeenCalled();
    expect(dependencies.reportError).toHaveBeenCalledWith(
      "PRIVACY_DIGEST_CLAIM_FAILED"
    );
  });
});

describe("privacy digest RPC claim mapping", () => {
  it("maps one homogeneous RPC row list into one claim", () => {
    expect(
      mapPrivacyDigestClaimRows([
        rpcRow,
        {
          ...rpcRow,
          feedback_id: "30000000-0000-4000-8000-000000000002",
          message: "第二筆隱私請求",
          contact_email: "requester@example.test",
          created_at: "2026-09-07T00:45:00.000Z"
        }
      ])
    ).toEqual({
      batchId: claimed.batchId,
      claimToken: claimed.claimToken,
      digestDate: claimed.digestDate,
      items: [
        claimed.items[0],
        {
          feedbackId: "30000000-0000-4000-8000-000000000002",
          message: "第二筆隱私請求",
          contactEmail: "requester@example.test",
          createdAt: "2026-09-07T00:45:00.000Z"
        }
      ]
    });
  });

  it("maps an empty RPC result to no claim", () => {
    expect(mapPrivacyDigestClaimRows([])).toBeNull();
  });

  it("rejects rows with untrusted identifiers or timestamps", () => {
    expect(() =>
      mapPrivacyDigestClaimRows([
        {
          ...rpcRow,
          batch_id: "not-a-uuid",
          created_at: "not-a-timestamp"
        }
      ])
    ).toThrow("PRIVACY_DIGEST_CLAIM_RESULT_INVALID");
  });

  it("normalizes invalid calendar values to a redacted claim error", () => {
    expect(() =>
      mapPrivacyDigestClaimRows([{ ...rpcRow, digest_date: "2026-13-01" }])
    ).toThrow("PRIVACY_DIGEST_CLAIM_RESULT_INVALID");
  });
});

describe("privacy digest Supabase RPC boundary", () => {
  it("claims with p_now and maps the homogeneous rows", async () => {
    const rpc = vi.fn(async () => ({ data: [rpcRow], error: null }));
    const dependencies = createPrivacyDigestRpcDependencies({ rpc });

    await expect(dependencies.claim(now.toISOString())).resolves.toEqual(
      claimed
    );
    expect(rpc).toHaveBeenCalledWith("claim_privacy_digest", {
      p_now: now.toISOString()
    });
  });

  it("rejects an RPC error without exposing its private details", async () => {
    const rpc = vi.fn(async () => ({
      data: [rpcRow],
      error: { message: "database detail for 完整使用者留言" }
    }));
    const dependencies = createPrivacyDigestRpcDependencies({ rpc });

    const error = await dependencies
      .claim(now.toISOString())
      .catch((value: unknown) => value);

    expect(error).toEqual(new Error("PRIVACY_DIGEST_CLAIM_FAILED"));
    expect(JSON.stringify(error)).not.toContain("完整使用者留言");
  });

  it("settles with the exact claim ownership and delivery result", async () => {
    const rpc = vi.fn(async () => ({ data: true, error: null }));
    const dependencies = createPrivacyDigestRpcDependencies({ rpc });
    const input = {
      batchId: claimed.batchId,
      claimToken: claimed.claimToken,
      outcome: "sent" as const,
      now: now.toISOString(),
      providerMessageId: "email-123",
      errorCode: null
    };

    await expect(dependencies.settle(input)).resolves.toBe(true);
    expect(rpc).toHaveBeenCalledWith("settle_privacy_digest", {
      p_batch_id: claimed.batchId,
      p_claim_token: claimed.claimToken,
      p_outcome: "sent",
      p_now: now.toISOString(),
      p_provider_message_id: "email-123",
      p_error_code: null
    });
  });

  it("rejects a non-boolean settlement result", async () => {
    const rpc = vi.fn(async () => ({ data: "true", error: null }));
    const dependencies = createPrivacyDigestRpcDependencies({ rpc });

    await expect(
      dependencies.settle({
        batchId: claimed.batchId,
        claimToken: claimed.claimToken,
        outcome: "retry",
        now: now.toISOString(),
        providerMessageId: null,
        errorCode: "RESEND_SEND_FAILED"
      })
    ).rejects.toThrow("PRIVACY_DIGEST_SETTLEMENT_FAILED");
  });
});
