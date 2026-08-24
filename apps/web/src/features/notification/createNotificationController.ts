import type { SessionProjection } from "@sunshield/contracts";
import type {
  NotificationPermissionState,
  NotificationPort,
  UserPreferencesPort
} from "@sunshield/platform";
import {
  shallowReadonly,
  shallowRef,
  watch,
  type Ref,
  type ShallowRef
} from "vue";

/**
 * 補擦提醒的排程協調層。
 *
 * 只排**一則**通知，對應 `sessionNextDueAt`（整個 Session 下一個到期時間），
 * 不替 16 個部位各排一則——那會讓通知中心被同一件事洗版，
 * 而使用者要做的動作只有一個：打開 App 看要補哪裡。
 *
 * 排程本身活不過分頁關閉（見 `BrowserNotifications` 的說明），
 * 所以每次投影變動都重新排一次，重新載入後也會由 watch 的首次觸發補上。
 */

/** 固定 id：同一則提醒重排時取代舊的，不累積。 */
const SESSION_REMINDER_ID = "session-next-due";

export interface NotificationController {
  readonly permission: Readonly<ShallowRef<NotificationPermissionState>>;
  readonly isSupported: boolean;
  /**
   * 排程能否在分頁關閉後送達。目前一律 false——
   * 畫面必須據此告訴使用者仍需自己回來查看，不可省略。
   */
  readonly canDeliverInBackground: boolean;
  /**
   * 顯示後多久再提醒一次，`null` 表示只提醒一次。
   * 初始化時非同步從 `userPreferences` 讀取，讀到之前一律是 `null`。
   */
  readonly reminderFrequencyMinutes: Readonly<ShallowRef<number | null>>;
  requestPermission(): Promise<NotificationPermissionState>;
  setReminderFrequencyMinutes(minutes: number | null): Promise<void>;
  /** 立即送一則測試通知；回傳是否成功送出。 */
  sendTestNotification(): Promise<boolean>;
  dispose(): void;
}

interface Dependencies {
  notifications: NotificationPort;
  currentSession: Readonly<Ref<SessionProjection | null>>;
  userPreferences: UserPreferencesPort;
}

export function createNotificationController(
  dependencies: Dependencies
): NotificationController {
  const { notifications, userPreferences } = dependencies;
  const permission = shallowRef<NotificationPermissionState>(
    notifications.getPermission()
  );
  const reminderFrequencyMinutes = shallowRef<number | null>(null);
  let disposed = false;

  /**
   * 依目前投影重排通知。
   *
   * Session 結束、沒有下一個到期時間，或權限不足時一律清空——
   * 留著過期排程會在使用者已經補擦後才跳出通知。
   */
  async function sync(): Promise<void> {
    if (disposed) {
      return;
    }

    const session = dependencies.currentSession.value;
    const dueAt = session?.sessionNextDueAt ?? null;

    if (
      session === null ||
      session.overallStatus === "ended" ||
      dueAt === null
    ) {
      await notifications.cancelAll();
      return;
    }

    await notifications.schedule({
      id: SESSION_REMINDER_ID,
      dueAt,
      title: "該補擦了",
      body: "打開查看要補哪些部位",
      repeatMinutes: reminderFrequencyMinutes.value
    });
  }

  // service worker 先就緒，避免到期當下才註冊而讓通知遺失。
  void notifications.ensureReady();

  // 偏好是非同步讀取的；讀到之前 sync() 一律當作「只提醒一次」。
  // 只有讀到的值真的不是預設值（null）時才補排一次，避免多數情況下
  // （使用者從沒設過重複頻率）白白多打一次 schedule()。
  void userPreferences.getReminderFrequencyMinutes().then((minutes) => {
    if (disposed || minutes === reminderFrequencyMinutes.value) return;
    reminderFrequencyMinutes.value = minutes;
    void sync();
  });

  const stopWatching = watch(
    () => dependencies.currentSession.value?.sessionNextDueAt ?? null,
    () => {
      void sync();
    },
    { immediate: true }
  );

  return {
    permission: shallowReadonly(permission),
    isSupported: notifications.isSupported(),
    canDeliverInBackground: notifications.canDeliverInBackground(),
    reminderFrequencyMinutes: shallowReadonly(reminderFrequencyMinutes),

    async requestPermission(): Promise<NotificationPermissionState> {
      const result = await notifications.requestPermission();
      permission.value = result;
      // 剛拿到權限時，既有 Session 的提醒還沒排過，補排一次。
      if (result === "granted") {
        await sync();
      }
      return result;
    },

    async setReminderFrequencyMinutes(minutes: number | null): Promise<void> {
      await userPreferences.setReminderFrequencyMinutes(minutes);
      reminderFrequencyMinutes.value = minutes;
      // 立即套用到目前已排定的提醒，不等下一次到期時間變動。
      await sync();
    },

    sendTestNotification(): Promise<boolean> {
      return notifications.sendTest();
    },

    dispose(): void {
      disposed = true;
      stopWatching();
      void notifications.cancelAll();
    }
  };
}
