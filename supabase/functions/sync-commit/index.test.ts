import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  makeActiveSessionRecord,
  makeProductSnapshot
} from "../../../packages/test-fixtures/src";
import { SyncCommitRequestV1Schema } from "../../../packages/contracts/src/sync";
import {
  buildConflict,
  parseSyncCommitRequest,
  parseSyncDeleteRequest,
  SyncValidationError,
  validateSyncRecord
} from "../_shared/sync";

const approvedOrigin = "https://uv-alert-web.vercel.app";

const runtime = vi.hoisted(() => {
  const requirePermanentUser = vi.fn(
    async (): Promise<import("../_shared/auth").AuthResult> => ({
      ok: false as const,
      response: new Response(
        JSON.stringify({ error: { code: "AUTH_REQUIRED" } }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      )
    })
  );

  return { requirePermanentUser };
});

vi.mock("../_shared/auth.ts", () => ({
  requirePermanentUser: runtime.requirePermanentUser
}));

let handleCommit: typeof import("./index.ts").handleCommit;

function makeRequest(method: string): Request {
  return new Request("https://api.test/sync-commit", {
    method,
    headers: { Origin: approvedOrigin }
  });
}

beforeEach(async () => {
  vi.resetModules();
  runtime.requirePermanentUser.mockClear();
  vi.stubGlobal("Deno", {
    env: {
      get: (key: string) =>
        key === "ALLOWED_ORIGINS" ? approvedOrigin : undefined
    },
    serve: vi.fn()
  });
  ({ handleCommit } = await import("./index.ts"));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sync commit boundary", () => {
  it("approved origin 的 OPTIONS 回 204，且不要求 JWT", async () => {
    const response = await handleCommit(makeRequest("OPTIONS"));

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      approvedOrigin
    );
    expect(runtime.requirePermanentUser).not.toHaveBeenCalled();
  });

  it("拒絕非 POST method，且不進入驗證", async () => {
    const response = await handleCommit(makeRequest("GET"));

    expect(response.status).toBe(405);
    expect(runtime.requirePermanentUser).not.toHaveBeenCalled();
  });

  it("未登入的 POST 仍交給 requirePermanentUser 回 401", async () => {
    const response = await handleCommit(makeRequest("POST"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: { code: "AUTH_REQUIRED" }
    });
    expect(runtime.requirePermanentUser).toHaveBeenCalledOnce();
  });

  it("接受版本化 record 與 expectedRevision", () => {
    const record = makeActiveSessionRecord();
    const request = parseSyncCommitRequest({
      schemaVersion: "sync-v1",
      idempotencyKey: "commit-1",
      records: [{ record, expectedRevision: null }],
      tombstones: []
    });
    expect(request.records[0]?.record.recordKind).toBe("active_session");
  });

  it("record kind 與 payload 不一致、ownerKey 或重複 key 都會拒絕", () => {
    const record = makeActiveSessionRecord();
    expect(() =>
      validateSyncRecord({
        ...record,
        recordKind: "product_catalog",
        payload: record.payload
      })
    ).toThrow(SyncValidationError);
    expect(() =>
      validateSyncRecord({
        ...record,
        payload: {
          ...record.payload,
          session: { ...record.payload.session, ownerKey: "guest:private" }
        }
      })
    ).toThrow(SyncValidationError);
    expect(() =>
      parseSyncCommitRequest({
        schemaVersion: "sync-v1",
        idempotencyKey: "commit-duplicate",
        records: [
          { record, expectedRevision: null },
          { record, expectedRevision: null }
        ],
        tombstones: []
      })
    ).toThrow(SyncValidationError);
  });

  it("delete request 需要正確 revision，conflict payload 不包含完整遠端 payload", () => {
    const request = parseSyncDeleteRequest({
      schemaVersion: "sync-v1",
      idempotencyKey: "delete-1",
      records: [
        {
          key: { recordKind: "product_catalog", recordId: "product-1" },
          expectedRevision: 4
        }
      ]
    });
    const conflict = buildConflict({
      recordKey: request.records[0]!.key,
      localRevision: 5,
      remoteRevision: 6,
      remoteSummary: {
        recordKind: "product_catalog",
        recordId: "product-1",
        schemaVersion: "sync-v1",
        revision: 6,
        payloadFingerprint: "remote-fingerprint",
        updatedAt: "2026-08-17T09:00:00.000Z"
      },
      detectedAt: "2026-08-17T09:00:00.000Z"
    });
    expect(conflict).not.toHaveProperty("payload");
    expect(() =>
      parseSyncDeleteRequest({
        schemaVersion: "sync-v1",
        idempotencyKey: "delete-invalid",
        records: [
          {
            key: { recordKind: "product_catalog", recordId: "product-1" },
            expectedRevision: 0
          }
        ]
      })
    ).toThrow(SyncValidationError);
  });
});

// The regression this matrix catches is any missing nested validation that lets
// a canonical-invalid payload reach the database. Expectations come from the
// canonical schema, independently of the deployable Edge implementation.
function parityFixtures(): Record<string, unknown>[] {
  const active = structuredClone(makeActiveSessionRecord()) as Record<
    string,
    any
  >;
  active.payload.session.primaryAction.reasonCodes = [
    "GENERAL_INTERVAL_REACHED"
  ];
  const stream = active.payload.eventStream;
  const started = stream.sessionStarted;
  const envelope = {
    schemaVersion: "1.0.0",
    id: "extra-event",
    sessionId: started.sessionId,
    commandId: "extra-command",
    idempotencyKey: "extra-key",
    effectiveOccurredAt: started.effectiveOccurredAt,
    clientCreatedAt: started.clientCreatedAt,
    clientSequence: 2,
    localAppliedSequence: 2,
    correctionAction: "create",
    correctionOfEventId: null
  };
  stream.productSafetyEvents = [
    {
      ...envelope,
      eventType: "product_safety",
      safetyKind: "abnormal_reported",
      sourceProductId: "product-1",
      productSnapshotFingerprint: null,
      zoneInstanceIds: ["zone-1"]
    }
  ];
  stream.contextEvents = [
    {
      ...envelope,
      eventType: "context_event",
      contextType: "context_changed",
      context: "indoor_away",
      shade: "full"
    },
    {
      ...envelope,
      eventType: "context_event",
      contextType: "water_start",
      activityIntervalId: "water-1",
      zoneInstanceIds: ["zone-1"],
      startConfidence: "confirmed",
      activityStartedAt: started.effectiveOccurredAt
    },
    {
      ...envelope,
      eventType: "context_event",
      contextType: "water_end",
      activityIntervalId: "water-1",
      zoneInstanceIds: ["zone-1"],
      endedAt: started.effectiveOccurredAt
    },
    ...["heavy_sweat", "towel", "friction", "hand_wash"].map((contextType) => ({
      ...envelope,
      eventType: "context_event",
      contextType,
      zoneInstanceIds: ["zone-1"]
    }))
  ];
  const base = {
    schemaVersion: "sync-v1",
    recordId: "record-1",
    revision: 1,
    payloadFingerprint: "fingerprint",
    updatedAt: started.effectiveOccurredAt
  };
  return [
    active,
    {
      ...base,
      recordKind: "product_catalog",
      payload: {
        schemaVersion: "1.1.0",
        productId: "record-1",
        displayName: "Fixture",
        gearCategory: "sunscreen",
        currentSnapshot: makeProductSnapshot(),
        snapshotFingerprint: "snapshot",
        purchaseMonth: null,
        expiryDate: null,
        note: null,
        priceTwd: null,
        usageRating: null,
        size: null,
        color: null,
        volume: null,
        formulation: null,
        protectionType: null,
        upf: null,
        shadingRate: null,
        weight: null,
        hatStyle: null,
        archivedAt: null,
        createdAt: started.effectiveOccurredAt,
        updatedAt: started.effectiveOccurredAt,
        status: "active"
      }
    },
    {
      ...base,
      recordKind: "region_preference",
      payload: {
        schemaVersion: "region-preference-v1",
        mode: "selected",
        selection: {
          regionCode: "63000010",
          displayName: "測試區",
          countyCode: "63000",
          countyName: "測試市",
          townName: "測試區",
          boundaryDataVersion: "test-v1",
          selectionMethod: "manual"
        }
      }
    },
    {
      ...base,
      recordKind: "region_preference",
      payload: {
        schemaVersion: "region-preference-v1",
        mode: "skipped",
        skippedAt: started.effectiveOccurredAt
      }
    },
    {
      ...base,
      recordKind: "user_preferences",
      payload: {
        schemaVersion: "user-preferences-v1",
        reminderFrequencyMinutes: null,
        soundEnabled: false,
        vibrationEnabled: false
      }
    }
  ];
}

function commitFor(record: Record<string, unknown>) {
  return {
    schemaVersion: "sync-v1",
    idempotencyKey: "parity-test",
    records: [{ record, expectedRevision: null }],
    tombstones: []
  };
}

type FieldPath = Array<string | number>;
function fieldPaths(value: unknown, prefix: FieldPath = []): FieldPath[] {
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) => {
    const path = [...prefix, Array.isArray(value) ? Number(key) : key];
    return [path, ...fieldPaths(child, path)];
  });
}

function withField(
  record: Record<string, unknown>,
  path: FieldPath,
  value: unknown
) {
  const copy = structuredClone(record);
  let target: any = copy;
  for (const key of path.slice(0, -1)) target = target[key];
  if (value === undefined) delete target[path.at(-1)!];
  else target[path.at(-1)!] = value;
  return copy;
}

const invalidMutations = parityFixtures().flatMap((record, fixture) =>
  fieldPaths(record).flatMap((path) =>
    [
      undefined,
      null,
      true,
      false,
      -1,
      0,
      0.5,
      Number.MAX_SAFE_INTEGER + 1,
      "",
      " ",
      "invalid-enum",
      "x".repeat(501),
      [],
      {},
      [null]
    ].flatMap((value, mutation) => {
      const request = commitFor(withField(record, path, value));
      return SyncCommitRequestV1Schema.safeParse(request).success
        ? []
        : [{ name: `${fixture}:${path.join(".")}:${mutation}`, request }];
    })
  )
);

describe("canonical-to-Edge differential payload matrix", () => {
  it("normalizes surrounding whitespace in envelope IDs like canonical", () => {
    const request = commitFor({
      ...parityFixtures()[4]!,
      recordId: " record-1 "
    });
    expect(parseSyncCommitRequest(request)).toEqual(
      SyncCommitRequestV1Schema.parse(request)
    );
  });
  it.each(parityFixtures().map((record, index) => ({ index, record })))(
    "accepts complete legal fixture $index",
    ({ record }) => {
      const request = commitFor(record);
      expect(SyncCommitRequestV1Schema.safeParse(request).success).toBe(true);
      expect(() => parseSyncCommitRequest(request)).not.toThrow();
    }
  );

  it.each(invalidMutations)(
    "rejects canonical-invalid mutation $name",
    ({ request }) => {
      expect(SyncCommitRequestV1Schema.safeParse(request).success).toBe(false);
      expect(() => parseSyncCommitRequest(request)).toThrow(
        SyncValidationError
      );
    }
  );

  it("keeps intentional stricter privacy and record-key rules", () => {
    const record = parityFixtures()[0]!;
    for (const mutated of [
      withField(record, ["payload", "session", "ownerKey"], "guest:fixture"),
      { ...record, recordId: "other-id" }
    ]) {
      const request = commitFor(mutated);
      expect(SyncCommitRequestV1Schema.safeParse(request).success).toBe(true);
      expect(() => parseSyncCommitRequest(request)).toThrow(
        SyncValidationError
      );
    }
    const duplicate = commitFor(record);
    duplicate.records.push(duplicate.records[0]!);
    expect(SyncCommitRequestV1Schema.safeParse(duplicate).success).toBe(true);
    expect(() => parseSyncCommitRequest(duplicate)).toThrow(
      SyncValidationError
    );
  });

  it.each([
    "2026-02-30T10:00:00Z",
    "2025-02-29T10:00:00Z",
    "2026-09-06",
    "2026-09-06T10:00:00+08:00",
    "2026-09-06T10:00:00Z\n",
    "2026-09-06T24:00:00Z"
  ])("rejects invalid canonical envelope UTC time %s", (value) => {
    const request = commitFor({ ...parityFixtures()[0]!, updatedAt: value });
    expect(SyncCommitRequestV1Schema.safeParse(request).success).toBe(false);
    expect(() => parseSyncCommitRequest(request)).toThrow(SyncValidationError);
    const nested = commitFor(
      withField(
        parityFixtures()[0]!,
        ["payload", "session", "startedAt"],
        value
      )
    );
    expect(SyncCommitRequestV1Schema.safeParse(nested).success).toBe(false);
    expect(() => parseSyncCommitRequest(nested)).toThrow(SyncValidationError);
  });

  it("validates tombstone timestamps and every commit array element", () => {
    const request: any = {
      schemaVersion: "sync-v1",
      idempotencyKey: "test",
      records: [],
      tombstones: [
        {
          expectedRevision: null,
          tombstone: {
            schemaVersion: "sync-v1",
            recordKind: "product_catalog",
            recordId: "product",
            revision: 1,
            deletedAt: "2026-02-30T10:00:00Z"
          }
        }
      ]
    };
    expect(SyncCommitRequestV1Schema.safeParse(request).success).toBe(false);
    expect(() => parseSyncCommitRequest(request)).toThrow(SyncValidationError);
    for (const field of ["records", "tombstones"]) {
      const sparse = {
        ...request,
        records: [],
        tombstones: [],
        [field]: Array(1)
      };
      expect(SyncCommitRequestV1Schema.safeParse(sparse).success).toBe(false);
      expect(() => parseSyncCommitRequest(sparse)).toThrow(SyncValidationError);
    }
  });

  it.each(
    parityFixtures().flatMap((record, index) =>
      [
        ["payload"],
        ...fieldPaths(record).filter((path) => path[0] === "payload")
      ].flatMap((path) => {
        let value: any = record;
        for (const key of path) value = value[key];
        return value !== null &&
          typeof value === "object" &&
          !Array.isArray(value)
          ? [
              {
                name: `${index}:${path.join(".")}`,
                record: withField(
                  record,
                  [...path, "unknownSecret"],
                  "fixture-private"
                )
              }
            ]
          : [];
      })
    )
  )("rejects unknown fields in payload object $name", ({ record }) => {
    const request = commitFor(record);
    expect(SyncCommitRequestV1Schema.safeParse(request).success).toBe(true);
    expect(() => parseSyncCommitRequest(request)).toThrow(SyncValidationError);
  });

  it.each(parityFixtures().map((record, fixture) => ({ record, fixture })))(
    "returns sanitized 422 before RPC for fixture $fixture",
    async ({ record, fixture }) => {
      const paths: FieldPath[] = [
        ["payload", "session", "setupEntryMode"],
        ["payload", "currentSnapshot"],
        ["payload", "selection", "selectionMethod"],
        ["payload", "skippedAt"],
        ["payload", "soundEnabled"]
      ];
      const request = commitFor(
        withField(record, paths[fixture]!, "sensitive-fixture-value")
      );
      const rpc = vi.fn();
      runtime.requirePermanentUser.mockResolvedValueOnce({
        ok: true,
        context: {
          userId: "fixture-user",
          accessToken: "fixture-token",
          client: {
            rpc
          } as unknown as import("../_shared/auth").AuthContext["client"]
        }
      });
      const response = await handleCommit(
        new Request("https://api.test/sync-commit", {
          method: "POST",
          headers: { Origin: approvedOrigin },
          body: JSON.stringify(request)
        })
      );
      expect(response.status).toBe(422);
      const body = await response.json();
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(JSON.stringify(body)).not.toContain("sensitive-fixture-value");
      expect(rpc).not.toHaveBeenCalled();
    }
  );

  it.each(
    parityFixtures().flatMap((record, fixture) =>
      fieldPaths(record).flatMap((path) => {
        const request = commitFor(withField(record, path, undefined));
        return SyncCommitRequestV1Schema.safeParse(request).success
          ? [{ name: `${fixture}:${path.join(".")}`, request }]
          : [];
      })
    )
  )("fills canonical defaults when omitted: $name", ({ request }) => {
    const canonical = SyncCommitRequestV1Schema.parse(request);
    expect(parseSyncCommitRequest(request)).toEqual(canonical);
  });

  it.each([
    [
      "interval requires minutes",
      1,
      ["payload", "currentSnapshot", "reapplicationIntervalStatus"],
      "explicit_minutes"
    ],
    [
      "wait requires minutes",
      1,
      ["payload", "currentSnapshot", "preExposureWaitStatus"],
      "explicit_minutes"
    ],
    [
      "water status requires matching minutes",
      1,
      ["payload", "currentSnapshot", "waterResistanceStatus"],
      "40"
    ],
    [
      "eligibility follows identity",
      1,
      ["payload", "currentSnapshot", "identityStatus"],
      "identity_unconfirmed"
    ],
    [
      "eligibility follows expiry",
      1,
      ["payload", "currentSnapshot", "expiryStatus"],
      "expired"
    ],
    [
      "eligibility follows condition",
      1,
      ["payload", "currentSnapshot", "conditionStatus"],
      "discomfort_reported"
    ],
    [
      "eligibility follows claim",
      1,
      ["payload", "currentSnapshot", "sunscreenClaimStatus"],
      "no_claim"
    ],
    [
      "method replacement requires target",
      0,
      ["payload", "eventStream", "zoneMethodEvents", 0, "correctionAction"],
      "replace"
    ],
    [
      "tracking void requires target",
      0,
      ["payload", "eventStream", "zoneTrackingEvents", 0, "correctionAction"],
      "void"
    ],
    [
      "create forbids correction target",
      0,
      ["payload", "eventStream", "zoneMethodEvents", 0, "correctionOfEventId"],
      "target"
    ],
    [
      "group replacement requires target",
      0,
      [
        "payload",
        "eventStream",
        "applicationConfirmationGroups",
        0,
        "correctionAction"
      ],
      "replace"
    ],
    [
      "group create forbids target",
      0,
      [
        "payload",
        "eventStream",
        "applicationConfirmationGroups",
        0,
        "correctionOfGroupId"
      ],
      "target"
    ],
    [
      "safety needs a product reference",
      0,
      ["payload", "eventStream", "productSafetyEvents", 0, "sourceProductId"],
      null
    ],
    [
      "unknown water start forbids timestamp",
      0,
      ["payload", "eventStream", "contextEvents", 1, "startConfidence"],
      "unknown"
    ],
    [
      "water start cannot be in future",
      0,
      ["payload", "eventStream", "contextEvents", 1, "activityStartedAt"],
      "2030-01-01T00:00:00Z"
    ],
    [
      "session stream identities match",
      0,
      ["payload", "eventStream", "sessionStarted", "sessionId"],
      "other-session"
    ],
    ["reminder maximum", 4, ["payload", "reminderFrequencyMinutes"], 121],
    ["product name maximum", 1, ["payload", "displayName"], "x".repeat(81)],
    [
      "region name maximum",
      2,
      ["payload", "selection", "countyName"],
      "x".repeat(51)
    ],
    [
      "snapshot nested in application",
      0,
      [
        "payload",
        "eventStream",
        "applicationEvents",
        0,
        "productLabelSnapshot",
        "waterResistanceStatus"
      ],
      "80"
    ]
  ] as Array<[string, number, FieldPath, unknown]>)(
    "rejects invalid relationship/boundary: %s",
    (_name, fixture, path, value) => {
      const request = commitFor(
        withField(parityFixtures()[fixture]!, path, value)
      );
      expect(SyncCommitRequestV1Schema.safeParse(request).success).toBe(false);
      expect(() => parseSyncCommitRequest(request)).toThrow(
        SyncValidationError
      );
    }
  );
});
