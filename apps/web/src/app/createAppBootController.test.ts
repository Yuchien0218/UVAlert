import { flushPromises } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { createAppBootController } from "./createAppBootController";

describe("createAppBootController", () => {
  it("deduplicates concurrent boot and restores once", async () => {
    const repository = {
      open: vi.fn(async () => undefined),
      getCurrentSession: vi.fn(async () => null)
    };
    const identity = {
      getOrCreateLocalVisitorId: vi.fn(async () => "visitor-1")
    };

    const controller = createAppBootController({
      contextId: "context-a",
      repository,
      identity,
      connectivity: {
        getCurrentStatus: () => "online",
        subscribe: () => () => undefined
      },
      lifecycle: {
        subscribeForeground: () => () => undefined
      },
      crossContext: {
        subscribe: () => () => undefined
      }
    });

    await Promise.all([controller.ensureBooted(), controller.ensureBooted()]);

    expect(repository.open).toHaveBeenCalledTimes(1);
    expect(identity.getOrCreateLocalVisitorId).toHaveBeenCalledTimes(1);
    expect(repository.getCurrentSession).toHaveBeenCalledWith("visitor-1");
    expect(controller.phase.value).toBe("ready");
    expect(controller.currentSession.value).toBeNull();
  });

  it("refreshes on foreground and another context commit", async () => {
    let foregroundListener: (() => void) | undefined;
    let crossContextListener:
      | ((message: { kind: "data-committed"; sourceContextId: string }) => void)
      | undefined;
    const repository = {
      open: vi.fn(async () => undefined),
      getCurrentSession: vi.fn(async () => null)
    };

    const controller = createAppBootController({
      contextId: "context-a",
      repository,
      identity: {
        getOrCreateLocalVisitorId: async () => "visitor-1"
      },
      connectivity: {
        getCurrentStatus: () => "online",
        subscribe: () => () => undefined
      },
      lifecycle: {
        subscribeForeground(listener) {
          foregroundListener = listener;
          return () => undefined;
        }
      },
      crossContext: {
        subscribe(listener) {
          crossContextListener = listener;
          return () => undefined;
        }
      }
    });

    await controller.ensureBooted();
    foregroundListener?.();
    crossContextListener?.({
      kind: "data-committed",
      sourceContextId: "context-b"
    });
    await flushPromises();

    expect(repository.getCurrentSession).toHaveBeenCalledTimes(3);
  });

  it("exposes an error state without replacing it with an empty session", async () => {
    const controller = createAppBootController({
      contextId: "context-a",
      repository: {
        open: vi.fn(async () => {
          throw new Error("storage blocked");
        }),
        getCurrentSession: vi.fn(async () => null)
      },
      identity: {
        getOrCreateLocalVisitorId: async () => "visitor-1"
      },
      connectivity: {
        getCurrentStatus: () => "online",
        subscribe: () => () => undefined
      },
      lifecycle: {
        subscribeForeground: () => () => undefined
      },
      crossContext: {
        subscribe: () => () => undefined
      }
    });

    await controller.ensureBooted();

    expect(controller.phase.value).toBe("error");
    expect(controller.errorCode.value).toBe("storage_unavailable");
    expect(controller.currentSession.value).toBeNull();
  });
});
