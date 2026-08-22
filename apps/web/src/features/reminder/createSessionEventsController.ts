import type { SessionEventStreamV1 } from "@sunshield/contracts";
import type {
  LocalIdentityPort,
  SessionEventStreamRepositoryPort
} from "@sunshield/platform";
import { shallowReadonly, shallowRef, type ShallowRef } from "vue";

/**
 * S-07 最近事件清單的資料來源。
 *
 * 這份清單是 S-10 `/reminder/event/:id/correct` 取得事件 id 的**唯一入口**；
 * 沒有它，Release Manifest §5.11 承諾的「更正本機資料」無法到達。
 *
 * 事件流只讀不寫——更正一律走既有 command 路徑建立後繼事件，
 * 不可變稽核鏈由 reducer 維護。
 */

export type SessionEventsPhase = "idle" | "loading" | "ready" | "error";

export interface SessionEventsController {
  readonly phase: Readonly<ShallowRef<SessionEventsPhase>>;
  readonly stream: Readonly<ShallowRef<SessionEventStreamV1 | null>>;
  ensureLoaded(): Promise<void>;
  refresh(): Promise<void>;
  dispose(): void;
}

interface Dependencies {
  repository: SessionEventStreamRepositoryPort;
  identity: LocalIdentityPort;
}

export function createSessionEventsController(
  dependencies: Dependencies
): SessionEventsController {
  const phase = shallowRef<SessionEventsPhase>("idle");
  const stream = shallowRef<SessionEventStreamV1 | null>(null);
  let loadPromise: Promise<void> | null = null;
  let loaded = false;
  let disposed = false;

  async function performLoad(): Promise<void> {
    phase.value = "loading";
    try {
      const visitorId =
        await dependencies.identity.getOrCreateLocalVisitorId();
      const next =
        await dependencies.repository.getCurrentSessionEventStream(
          visitorId
        );
      if (disposed) return;
      stream.value = next;
      loaded = true;
      phase.value = "ready";
    } catch {
      if (disposed) return;
      // 事件清單是輔助資訊，讀取失敗不得讓提醒頁整頁失效。
      phase.value = "error";
    }
  }

  async function ensureLoaded(): Promise<void> {
    if (disposed || loaded) return;
    loadPromise ??= performLoad().finally(() => {
      loadPromise = null;
    });
    await loadPromise;
  }

  async function refresh(): Promise<void> {
    if (disposed) return;
    loaded = false;
    await ensureLoaded();
  }

  return {
    phase: shallowReadonly(phase),
    stream: shallowReadonly(stream),
    ensureLoaded,
    refresh,
    dispose(): void {
      disposed = true;
      loadPromise = null;
    }
  };
}
