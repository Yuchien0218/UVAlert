import { describe, expect, it } from "vitest";
import { ReapplyCommandV1Schema } from "@sunshield/contracts";
import { makeProductSnapshot, makeStartSessionCommand } from "../../test-fixtures/src/index";
import { planReapplication, planStartSession } from "./planning";

const clock = {
  status: "trusted",
  trustedNow: "2026-08-01T10:30:00.000Z",
  connectivity: "online"
} as const;

describe("planReapplication", () => {
  it("建立一個群組與不同 snapshot 的互斥 events，只更新選中部位", () => {
    const initial = planStartSession(makeStartSessionCommand({
      idPrefix: "reapply",
      zones: [
        { zoneInstanceId: "zone-a", trackingEventId: "track-a", methodEventId: "method-a", bodyZoneCode: "face_nose_cheeks", customLabel: null, skinExposureStatus: "exposed", methodCertainty: "confirmed", methodComponents: ["sunscreen"] },
        { zoneInstanceId: "zone-b", trackingEventId: "track-b", methodEventId: "method-b", bodyZoneCode: "face_forehead", customLabel: null, skinExposureStatus: "exposed", methodCertainty: "confirmed", methodComponents: ["sunscreen"] },
        { zoneInstanceId: "zone-c", trackingEventId: "track-c", methodEventId: "method-c", bodyZoneCode: "ears", customLabel: null, skinExposureStatus: "exposed", methodCertainty: "confirmed", methodComponents: ["sunscreen"] }
      ]
    }), clock);
    const previousC = initial.projection.zones.find((zone) => zone.zoneInstanceId === "zone-c")!;
    const snapshotA = makeProductSnapshot({ reapplicationIntervalStatus: "explicit_minutes", reapplicationIntervalMinutes: 90 });
    const snapshotB = makeProductSnapshot({ reapplicationIntervalStatus: "explicit_minutes", reapplicationIntervalMinutes: 60 });
    const command = ReapplyCommandV1Schema.parse({
      commandVersion: "1.0.0",
      commandType: "record_reapplication",
      commandId: "command-2",
      idempotencyKey: "idem-2",
      owner: { type: "guest", localVisitorId: "visitor" },
      deviceLocalId: "device",
      sessionId: initial.session.id,
      clientSequence: 2,
      clientCreatedAt: "2026-08-01T10:30:00.000Z",
      expectedRevision: 1,
      payload: {
        applicationConfirmationId: "group-2",
        appliedAt: "2026-08-01T10:25:00.000Z",
        applications: [
          { eventId: "app-a", zoneInstanceIds: ["zone-a"], sourceProductId: "product-a", productSnapshotFingerprint: "fp-a", productLabelSnapshot: snapshotA },
          { eventId: "app-b", zoneInstanceIds: ["zone-b"], sourceProductId: "product-b", productSnapshotFingerprint: "fp-b", productLabelSnapshot: snapshotB }
        ]
      }
    });

    const plan = planReapplication(command, initial.stream, initial.session, clock);

    expect(plan.group.confirmedZoneInstanceIds).toEqual(["zone-a", "zone-b"]);
    expect(plan.events).toHaveLength(2);
    expect(plan.projection.revision).toBe(2);
    expect(plan.projection.zones.find((zone) => zone.zoneInstanceId === "zone-c")).toEqual(previousC);
  });
});
