import type { LifecyclePort } from "@sunshield/platform";

export class BrowserLifecycle implements LifecyclePort {
  subscribeForeground(listener: () => void): () => void {
    const handleVisibility = (): void => {
      if (globalThis.document.visibilityState === "visible") {
        listener();
      }
    };
    const handlePageShow = (): void => listener();

    globalThis.document.addEventListener("visibilitychange", handleVisibility);
    globalThis.addEventListener("pageshow", handlePageShow);

    return () => {
      globalThis.document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );
      globalThis.removeEventListener("pageshow", handlePageShow);
    };
  }
}
