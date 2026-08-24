import type {
  NotificationPermissionState,
  NotificationPort,
  ScheduledNotification
} from "@sunshield/platform";

/**
 * `setTimeout` 的延遲上限（2^31-1 毫秒，約 24.8 天）。
 *
 * 超過這個值時瀏覽器會**立刻**觸發而不是等待，所以長延遲必須分段續接。
 * 補擦間隔最長 120 分鐘不會踩到，但 `dueAt` 來自資料而非常數，
 * 資料異常時不該變成「通知立刻跳出來」。
 */
const MAX_TIMEOUT_MS = 2_147_483_647;

/**
 * 通知能力的外部相依，抽出來是為了讓測試不必偽造整個 `globalThis`。
 */
export interface NotificationDeps {
  isSupported(): boolean;
  getPermission(): NotificationPermissionState;
  requestPermission(): Promise<NotificationPermissionState>;
  /** 取得可用來顯示通知的 registration；不可用時回 null，不丟例外。 */
  getRegistration(): Promise<ServiceWorkerRegistration | null>;
}

export function createBrowserNotificationDeps(): NotificationDeps {
  let registration: ServiceWorkerRegistration | null = null;
  let registering: Promise<ServiceWorkerRegistration | null> | null = null;

  const isSupported = (): boolean =>
    "Notification" in globalThis && "serviceWorker" in globalThis.navigator;

  return {
    isSupported,
    getPermission(): NotificationPermissionState {
      if (!isSupported()) {
        return "unsupported";
      }
      return globalThis.Notification
        .permission as NotificationPermissionState;
    },
    async requestPermission(): Promise<NotificationPermissionState> {
      const result = await globalThis.Notification.requestPermission();
      return result as NotificationPermissionState;
    },
    async getRegistration(): Promise<ServiceWorkerRegistration | null> {
      if (registration !== null) {
        return registration;
      }
      if (!isSupported()) {
        return null;
      }
      // 併發呼叫共用同一次註冊，不重複向瀏覽器註冊。
      registering ??= globalThis.navigator.serviceWorker
        .register("/sw.js")
        .then(() => globalThis.navigator.serviceWorker.ready)
        .catch(() => null);

      registration = await registering;
      return registration;
    }
  };
}

/**
 * 瀏覽器本機通知。
 *
 * **排程只在分頁存活時有效。** `setTimeout` 隨分頁一起消失，
 * 所以重新載入後必須由呼叫端依投影重新排程——這個 adapter 不持久化任何東西。
 * 平台層面的限制與取捨見 `docs/decisions/2026-08-23-notification-decision.md`。
 */
export class BrowserNotifications implements NotificationPort {
  readonly #timers = new Map<string, ReturnType<typeof setTimeout>>();
  readonly #deps: NotificationDeps;

  constructor(deps: NotificationDeps = createBrowserNotificationDeps()) {
    this.#deps = deps;
  }

  isSupported(): boolean {
    return this.#deps.isSupported();
  }

  /** 預先註冊，讓到期當下不必等註冊完成。失敗時靜默略過。 */
  async ensureReady(): Promise<void> {
    await this.#deps.getRegistration();
  }

  getPermission(): NotificationPermissionState {
    return this.#deps.getPermission();
  }

  async requestPermission(): Promise<NotificationPermissionState> {
    const current = this.getPermission();
    // `denied` 之後多數瀏覽器不再允許程式詢問，重複呼叫只會拿到同樣結果。
    if (current !== "default") {
      return current;
    }
    return this.#deps.requestPermission();
  }

  async schedule(notification: ScheduledNotification): Promise<void> {
    // 先取消同 id 的既有排程，讓重算到期時間不必先 cancel 再 schedule。
    await this.cancel(notification.id);

    if (this.getPermission() !== "granted") {
      return;
    }

    const dueAtMs = Date.parse(notification.dueAt);
    if (Number.isNaN(dueAtMs)) {
      return;
    }

    const delay = dueAtMs - Date.now();
    if (delay <= 0) {
      await this.#show(notification);
      return;
    }

    this.#arm(notification, delay);
  }

  async cancel(id: string): Promise<void> {
    const timer = this.#timers.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.#timers.delete(id);
    }
  }

  async cancelAll(): Promise<void> {
    for (const timer of this.#timers.values()) {
      clearTimeout(timer);
    }
    this.#timers.clear();
  }

  /**
   * web 平台目前一律 false。
   *
   * Notification Triggers 已被放棄、Safari 不支援本機通知，
   * 沒有任何純前端手段能在分頁關閉後觸發排程。
   */
  canDeliverInBackground(): boolean {
    return false;
  }

  /** 立即顯示一則測試通知，不受任何排程狀態影響。 */
  async sendTest(): Promise<boolean> {
    if (this.getPermission() !== "granted") {
      return false;
    }

    const registration = await this.#deps.getRegistration();
    if (registration === null) {
      return false;
    }

    try {
      await registration.showNotification("測試通知", {
        body: "如果你看到這則通知，代表這台裝置目前收得到補擦提醒。",
        tag: "notification-test"
      });
      return true;
    } catch {
      return false;
    }
  }

  /** 分段續接，避免超過 `setTimeout` 上限時立刻觸發。 */
  #arm(notification: ScheduledNotification, delay: number): void {
    const slice = Math.min(delay, MAX_TIMEOUT_MS);
    const timer = setTimeout(() => {
      this.#timers.delete(notification.id);
      const remaining = delay - slice;
      if (remaining > 0) {
        this.#arm(notification, remaining);
        return;
      }
      void this.#show(notification);
    }, slice);

    this.#timers.set(notification.id, timer);
  }

  async #show(notification: ScheduledNotification): Promise<void> {
    // 排程當下是 granted，但使用者可能在到期前於瀏覽器設定撤銷權限。
    // 這裡必須重新確認，否則 showNotification 會丟例外。
    if (this.getPermission() === "granted") {
      const registration = await this.#deps.getRegistration();
      if (registration !== null) {
        try {
          await registration.showNotification(notification.title, {
            body: notification.body,
            // 同一個 id 的通知互相取代，避免補擦提醒在通知中心堆疊。
            tag: notification.id,
            // 2026-08-24：`/reminder` 已移除、內容併入首頁；通知點開落在
            // 首頁，那裡就有倒數與完整狀態。
            data: { path: "/" }
          });
        } catch {
          // 通知是輔助功能。顯示失敗不該冒泡成 unhandled rejection，
          // 更不該影響本機倒數——倒數才是使用者的最終真值。
        }
      }
    }

    // 重複提醒：顯示後才重新武裝下一次，而不是一次排好整條鏈——
    // 這樣同一個 id 的下一次 schedule()（到期時間被重算）自然會
    // 透過 cancel() 砍掉整條重複鏈，不需要另外追蹤。
    if (notification.repeatMinutes !== null) {
      this.#arm(notification, notification.repeatMinutes * 60_000);
    }
  }
}
