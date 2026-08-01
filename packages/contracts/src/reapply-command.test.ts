import { describe, expect, it } from "vitest";
import { ReapplyCommandV1Schema } from "./commands";
import { PRODUCT_LABEL_SNAPSHOT_VERSION } from "./versions";

const snapshot = {
  snapshotVersion: PRODUCT_LABEL_SNAPSHOT_VERSION,
  identityStatus: "confirmed",
  expiryStatus: "unknown",
  conditionStatus: "no_issue_reported",
  sunscreenClaimStatus: "confirmed",
  ruleEligibilityAtApplication: "eligible",
  reapplicationIntervalStatus: "explicit_minutes",
  reapplicationIntervalMinutes: 120,
  preExposureWaitStatus: "no_instruction",
  preExposureWaitMinutes: null,
  waterResistanceStatus: "no_claim",
  waterResistanceMinutes: null,
  spf: null,
  paGrade: null,
  capturedAt: "2026-08-01T08:00:00.000Z"
} as const;

function command() {
  return {
    commandVersion: "1.0.0",
    commandType: "record_reapplication",
    commandId: "command-1",
    idempotencyKey: "idem-1",
    owner: { type: "guest", localVisitorId: "visitor-1" },
    deviceLocalId: "device-1",
    sessionId: "session-1",
    clientSequence: 2,
    clientCreatedAt: "2026-08-01T10:00:00.000Z",
    expectedRevision: 1,
    payload: {
      applicationConfirmationId: "group-2",
      appliedAt: "2026-08-01T09:59:00.000Z",
      applications: [
        {
          eventId: "event-a",
          zoneInstanceIds: ["zone-a"],
          sourceProductId: "product-a",
          productSnapshotFingerprint: "fingerprint-a",
          productLabelSnapshot: snapshot
        },
        {
          eventId: "event-b",
          zoneInstanceIds: ["zone-b"],
          sourceProductId: "product-b",
          productSnapshotFingerprint: "fingerprint-b",
          productLabelSnapshot: snapshot
        }
      ]
    }
  };
}

describe("ReapplyCommandV1Schema", () => {
  it("接受不同產品且部位互斥的補擦確認", () => {
    expect(ReapplyCommandV1Schema.safeParse(command()).success).toBe(true);
  });

  it.each([
    ["空 applications", (value: ReturnType<typeof command>) => { value.payload.applications = []; }],
    ["重複部位", (value: ReturnType<typeof command>) => { value.payload.applications[1]!.zoneInstanceIds = ["zone-a"]; }],
    ["重複事件 ID", (value: ReturnType<typeof command>) => { value.payload.applications[1]!.eventId = "event-a"; }],
    ["事件 ID 等於群組 ID", (value: ReturnType<typeof command>) => { value.payload.applications[0]!.eventId = "group-2"; }],
    ["revision 非正整數", (value: ReturnType<typeof command>) => { value.expectedRevision = 0; }]
  ])("拒絕%s", (_name, mutate) => {
    const value = command();
    mutate(value);
    expect(ReapplyCommandV1Schema.safeParse(value).success).toBe(false);
  });
});
