import type { LocalDataPort, LocalDataSummary } from "@sunshield/platform";
import { shallowReadonly, shallowRef, type ShallowRef } from "vue";
import type { AppBootController } from "../../app/createAppBootController";

export type LocalDataPhase = "idle" | "loading" | "ready" | "working" | "error";

export type LocalDataNotice =
  | { kind: "exported"; fileName: string }
  | { kind: "cleared"; scope: "drafts" | "history" | "all" }
  | null;

export type LocalDataError =
  "load_failed" | "export_failed" | "clear_failed" | null;

export interface LocalDataController {
  phase: Readonly<ShallowRef<LocalDataPhase>>;
  summary: Readonly<ShallowRef<LocalDataSummary | null>>;
  notice: Readonly<ShallowRef<LocalDataNotice>>;
  error: Readonly<ShallowRef<LocalDataError>>;
  /** 使用者是否已在本次造訪匯出過，用來決定清除前的提示語氣。 */
  hasExportedThisVisit: Readonly<ShallowRef<boolean>>;
  load(): Promise<void>;
  exportData(): Promise<boolean>;
  clearSetupDrafts(): Promise<boolean>;
  clearProductsAndHistory(): Promise<boolean>;
  clearAll(): Promise<boolean>;
  dismissNotice(): void;
  dispose(): void;
}

interface Dependencies {
  repository: LocalDataPort;
  boot: AppBootController;
  now(): Date;
  /** 由呼叫端提供，方便測試時不觸碰真實下載。 */
  saveFile(fileName: string, contents: string): void;
  /** 清除前先持久化必要的跨網路 teardown。 */
  beforeClearAll?(): Promise<void>;
}

function fileNameFor(now: Date): string {
  const stamp = now.toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return `uvalert-local-data-${stamp}.json`;
}

export function createLocalDataController(
  dependencies: Dependencies
): LocalDataController {
  const phase = shallowRef<LocalDataPhase>("idle");
  const summary = shallowRef<LocalDataSummary | null>(null);
  const notice = shallowRef<LocalDataNotice>(null);
  const error = shallowRef<LocalDataError>(null);
  const hasExportedThisVisit = shallowRef(false);
  let disposed = false;

  async function load(): Promise<void> {
    if (disposed) return;
    phase.value = "loading";
    error.value = null;
    try {
      summary.value = await dependencies.repository.getSummary();
      phase.value = "ready";
    } catch {
      // 讀不到不等於沒有資料，頁面必須說清楚這個差別。
      summary.value = null;
      error.value = "load_failed";
      phase.value = "error";
    }
  }

  async function exportData(): Promise<boolean> {
    if (phase.value === "working") return false;
    phase.value = "working";
    error.value = null;
    notice.value = null;
    try {
      const now = dependencies.now();
      const payload = await dependencies.repository.exportData(
        now.toISOString()
      );
      const fileName = fileNameFor(now);
      dependencies.saveFile(fileName, JSON.stringify(payload, null, 2));
      hasExportedThisVisit.value = true;
      notice.value = { kind: "exported", fileName };
      phase.value = "ready";
      return true;
    } catch {
      // 匯出失敗絕不顯示成功，但也不得因此擋住清除（S-19）。
      error.value = "export_failed";
      phase.value = "ready";
      return false;
    }
  }

  async function runClear(
    scope: "drafts" | "history" | "all",
    run: () => Promise<void>
  ): Promise<boolean> {
    if (phase.value === "working") return false;
    phase.value = "working";
    error.value = null;
    notice.value = null;
    try {
      await run();
      await dependencies.boot.refresh();
      summary.value = await dependencies.repository.getSummary();
      notice.value = { kind: "cleared", scope };
      phase.value = "ready";
      return true;
    } catch {
      // 失敗時不得顯示已清除。
      error.value = "clear_failed";
      phase.value = "ready";
      return false;
    }
  }

  return {
    phase: shallowReadonly(phase),
    summary: shallowReadonly(summary),
    notice: shallowReadonly(notice),
    error: shallowReadonly(error),
    hasExportedThisVisit: shallowReadonly(hasExportedThisVisit),
    load,
    exportData,
    clearSetupDrafts: () =>
      runClear("drafts", () => dependencies.repository.clearSetupDrafts()),
    clearProductsAndHistory: () =>
      runClear("history", () =>
        dependencies.repository.clearProductsAndHistory()
      ),
    clearAll: () =>
      runClear("all", async () => {
        await dependencies.beforeClearAll?.();
        await dependencies.repository.clearAll();
      }),
    dismissNotice(): void {
      notice.value = null;
    },
    dispose(): void {
      disposed = true;
    }
  };
}
