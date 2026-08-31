import { describe, expect, it, vi } from "vitest";
import type { LocalDataPort, LocalDataSummary } from "@sunshield/platform";
import type { AppBootController } from "../../app/createAppBootController";
import { createLocalDataController } from "./createLocalDataController";

const summary: LocalDataSummary = {
  productCount: 0,
  hasActiveSession: false,
  endedSessionCount: 0,
  hasSetupDraft: false,
  lastWeatherSnapshotAt: null,
  lastClockCalibrationAt: null
};

describe("createLocalDataController", () => {
  it("starts durable push teardown before clear-all removes ordinary local data", async () => {
    const order: string[] = [];
    const repository: LocalDataPort = {
      getSummary: vi.fn(async () => summary),
      exportData: vi.fn(async () => ({})),
      clearSetupDrafts: vi.fn(async () => undefined),
      clearProductsAndHistory: vi.fn(async () => undefined),
      clearAll: vi.fn(async () => {
        order.push("clear-all");
      })
    };
    const beforeClearAll = vi.fn(async () => {
      order.push("teardown");
    });
    const controller = createLocalDataController({
      repository,
      boot: { refresh: vi.fn(async () => undefined) } as unknown as AppBootController,
      now: () => new Date("2026-08-31T00:00:00.000Z"),
      saveFile: vi.fn(),
      beforeClearAll
    });

    await expect(controller.clearAll()).resolves.toBe(true);
    expect(order).toEqual(["teardown", "clear-all"]);
  });
});
