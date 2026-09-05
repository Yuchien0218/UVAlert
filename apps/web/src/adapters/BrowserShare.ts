import type { SharePort } from "@sunshield/platform";

/**
 * Web Share API level 2（分享檔案）的瀏覽器實作。
 *
 * **支援度差很多，所以 `canShareFiles` 必須真的問過瀏覽器。** 只檢查
 * `navigator.share` 存在是不夠的：桌面 Chrome 有 `share` 但多半不接受
 * `files`，直接呼叫會 reject。`navigator.canShare({ files })` 是唯一可靠的
 * 判斷，而且要**帶著真的那個 file 去問**——有些實作會依 MIME 與大小拒絕。
 */
export class BrowserShare implements SharePort {
  canShareFiles(file: File): boolean {
    const nav = globalThis.navigator as Navigator & {
      canShare?: (data?: ShareData) => boolean;
      share?: (data?: ShareData) => Promise<void>;
    };
    if (typeof nav?.share !== "function") return false;
    if (typeof nav.canShare !== "function") return false;
    try {
      return nav.canShare({ files: [file] });
    } catch {
      // 某些實作對不支援的 data 直接丟例外而不是回 false。
      return false;
    }
  }

  async shareFile(
    file: File,
    title: string
  ): Promise<"shared" | "cancelled" | "failed"> {
    const nav = globalThis.navigator as Navigator & {
      share?: (data?: ShareData) => Promise<void>;
    };
    if (typeof nav?.share !== "function") return "failed";

    try {
      await nav.share({ files: [file], title });
      return "shared";
    } catch (error) {
      /*
       * **使用者按取消不是錯誤。** Web Share API 對「取消」與「失敗」都是
       * reject，只能靠 `name === "AbortError"` 分辨。不分辨的話，每次取消
       * 都會跳一則「分享失敗」——那會讓人以為功能壞了。
       */
      if (error instanceof DOMException && error.name === "AbortError") {
        return "cancelled";
      }
      return "failed";
    }
  }
}
