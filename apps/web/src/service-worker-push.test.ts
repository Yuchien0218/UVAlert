import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

type WorkerListener = (event: Record<string, unknown>) => void;

async function createWorkerHarness() {
  const listeners = new Map<string, WorkerListener>();
  const showNotification = vi.fn(async () => undefined);
  const worker = {
    location: { origin: "https://app.example.test" },
    registration: { showNotification },
    clients: {
      claim: vi.fn(async () => undefined),
      matchAll: vi.fn(async () => []),
      openWindow: vi.fn(async () => undefined)
    },
    skipWaiting: vi.fn(),
    addEventListener: vi.fn((type: string, listener: WorkerListener) => {
      listeners.set(type, listener);
    })
  };
  const source = await readFile(resolve("apps/web/public/sw.js"), "utf8");
  new Function("self", source)(worker);
  return { listeners, showNotification };
}

async function dispatchPush(payload: unknown, rawJsonError = false) {
  const harness = await createWorkerHarness();
  const waitUntil = vi.fn((promise: Promise<unknown>) => promise);
  harness.listeners.get("push")?.({
    data: {
      json: () => {
        if (rawJsonError) throw new Error("invalid json");
        return payload;
      }
    },
    waitUntil
  });
  await Promise.all(waitUntil.mock.calls.map(([promise]) => promise));
  return harness.showNotification;
}

describe("Service Worker push contract", () => {
  it("shows only the fixed reminder notification", async () => {
    const showNotification = await dispatchPush({ type: "reminder-due" });

    expect(showNotification).toHaveBeenCalledWith("該補擦防曬乳了", {
      tag: "uvalert-reminder-due",
      data: { path: "/" }
    });
  });

  it.each([
    [{ type: "unknown" }, false],
    [
      { type: "reminder-due", title: "攻擊標題", url: "https://evil.test" },
      false
    ],
    [null, true]
  ])(
    "never displays attacker-controlled or invalid payloads",
    async (payload, invalidJson) => {
      const showNotification = await dispatchPush(payload, invalidJson);

      if (payload && (payload as { type?: string }).type === "reminder-due") {
        expect(showNotification).toHaveBeenCalledWith("該補擦防曬乳了", {
          tag: "uvalert-reminder-due",
          data: { path: "/" }
        });
        expect(JSON.stringify(showNotification.mock.calls)).not.toContain(
          "攻擊標題"
        );
        expect(JSON.stringify(showNotification.mock.calls)).not.toContain(
          "evil.test"
        );
      } else {
        expect(showNotification).not.toHaveBeenCalled();
      }
    }
  );
});
