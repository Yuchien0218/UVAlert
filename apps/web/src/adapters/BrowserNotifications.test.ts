import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NotificationPermissionState } from "@sunshield/platform";
import {
  BrowserNotifications,
  type NotificationDeps
} from "./BrowserNotifications";

const NOW = "2026-08-23T10:00:00.000Z";

function createHarness(overrides: Partial<NotificationDeps> = {}): {
  adapter: BrowserNotifications;
  showNotification: ReturnType<typeof vi.fn>;
  requestPermission: ReturnType<typeof vi.fn>;
} {
  const showNotification = vi.fn().mockResolvedValue(undefined);
  const requestPermission = vi.fn().mockResolvedValue("granted");
  const registration = {
    showNotification
  } as unknown as ServiceWorkerRegistration;

  const deps: NotificationDeps = {
    isSupported: () => true,
    getPermission: () => "granted",
    requestPermission,
    getRegistration: () => Promise.resolve(registration),
    ...overrides
  };

  return {
    adapter: new BrowserNotifications(deps),
    showNotification,
    requestPermission
  };
}

function minutesFromNow(minutes: number): string {
  return new Date(Date.parse(NOW) + minutes * 60_000).toISOString();
}

describe("BrowserNotifications", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("平台支援與權限", () => {
    it("平台不支援時回報 unsupported，而不是 denied", () => {
      const { adapter } = createHarness({
        isSupported: () => false,
        getPermission: () => "unsupported"
      });

      expect(adapter.isSupported()).toBe(false);
      expect(adapter.getPermission()).toBe("unsupported");
    });

    it.each<NotificationPermissionState>(["granted", "denied", "unsupported"])(
      "已是 %s 時不重複詢問權限",
      async (state) => {
        const { adapter, requestPermission } = createHarness({
          getPermission: () => state
        });

        await expect(adapter.requestPermission()).resolves.toBe(state);
        expect(requestPermission).not.toHaveBeenCalled();
      }
    );

    it("只有 default 才真的向瀏覽器詢問", async () => {
      const { adapter, requestPermission } = createHarness({
        getPermission: () => "default"
      });

      await expect(adapter.requestPermission()).resolves.toBe("granted");
      expect(requestPermission).toHaveBeenCalledOnce();
    });
  });

  describe("排程", () => {
    it("到期時間已過就立刻顯示", async () => {
      const { adapter, showNotification } = createHarness();

      await adapter.schedule({
        id: "zone-forehead",
        dueAt: minutesFromNow(-5),
        title: "該補擦了",
        body: "額頭",
        repeatMinutes: null
      });

      expect(showNotification).toHaveBeenCalledOnce();
      expect(showNotification).toHaveBeenCalledWith("該補擦了", {
        body: "額頭",
        tag: "zone-forehead",
        data: { path: "/reminder" }
      });
    });

    it("未到期前不顯示，到期後才顯示", async () => {
      const { adapter, showNotification } = createHarness();

      await adapter.schedule({
        id: "zone-forehead",
        dueAt: minutesFromNow(42),
        title: "該補擦了",
        body: "額頭",
        repeatMinutes: null
      });

      await vi.advanceTimersByTimeAsync(41 * 60_000);
      expect(showNotification).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1 * 60_000);
      expect(showNotification).toHaveBeenCalledOnce();
    });

    it("權限不是 granted 時靜默略過，不丟例外", async () => {
      const { adapter, showNotification } = createHarness({
        getPermission: () => "denied"
      });

      await expect(
        adapter.schedule({
          id: "zone-forehead",
          dueAt: minutesFromNow(-1),
          title: "該補擦了",
          body: "額頭",
          repeatMinutes: null
        })
      ).resolves.toBeUndefined();

      expect(showNotification).not.toHaveBeenCalled();
    });

    it("無效的到期時間不觸發也不爆掉", async () => {
      const { adapter, showNotification } = createHarness();

      await adapter.schedule({
        id: "zone-forehead",
        dueAt: "not-a-timestamp",
        title: "該補擦了",
        body: "額頭",
        repeatMinutes: null
      });

      await vi.advanceTimersByTimeAsync(10 * 60_000);
      expect(showNotification).not.toHaveBeenCalled();
    });

    it("排程後權限被撤銷，到期時不顯示也不爆掉", async () => {
      // 使用者可以在計時器等待期間到瀏覽器設定關掉通知。
      // 沒有這道防線的話，showNotification 會丟例外並變成 unhandled rejection。
      let permission: NotificationPermissionState = "granted";
      const { adapter, showNotification } = createHarness({
        getPermission: () => permission
      });

      await adapter.schedule({
        id: "zone-forehead",
        dueAt: minutesFromNow(10),
        title: "該補擦了",
        body: "額頭",
        repeatMinutes: null
      });

      permission = "denied";
      await vi.advanceTimersByTimeAsync(11 * 60_000);

      expect(showNotification).not.toHaveBeenCalled();
    });

    it("showNotification 丟例外時不冒泡", async () => {
      const { adapter, showNotification } = createHarness();
      showNotification.mockRejectedValue(new Error("permission revoked"));

      await expect(
        adapter.schedule({
          id: "zone-forehead",
          dueAt: minutesFromNow(-1),
          title: "該補擦了",
          body: "額頭",
          repeatMinutes: null
        })
      ).resolves.toBeUndefined();

      expect(showNotification).toHaveBeenCalledOnce();
    });

    it("registration 取不到時不顯示也不爆掉", async () => {
      const { adapter, showNotification } = createHarness({
        getRegistration: () => Promise.resolve(null)
      });

      await adapter.schedule({
        id: "zone-forehead",
        dueAt: minutesFromNow(-1),
        title: "該補擦了",
        body: "額頭",
        repeatMinutes: null
      });

      expect(showNotification).not.toHaveBeenCalled();
    });
  });

  describe("重排與取消", () => {
    it("同一個 id 重排會取代舊排程，只觸發一次", async () => {
      const { adapter, showNotification } = createHarness();

      await adapter.schedule({
        id: "zone-forehead",
        dueAt: minutesFromNow(10),
        title: "舊的",
        body: "額頭",
        repeatMinutes: null
      });
      await adapter.schedule({
        id: "zone-forehead",
        dueAt: minutesFromNow(30),
        title: "新的",
        body: "額頭",
        repeatMinutes: null
      });

      // 舊排程的時間點過去時不該觸發。
      await vi.advanceTimersByTimeAsync(10 * 60_000);
      expect(showNotification).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(20 * 60_000);
      expect(showNotification).toHaveBeenCalledOnce();
      expect(showNotification).toHaveBeenCalledWith(
        "新的",
        expect.anything()
      );
    });

    it("取消後不再觸發", async () => {
      const { adapter, showNotification } = createHarness();

      await adapter.schedule({
        id: "zone-forehead",
        dueAt: minutesFromNow(10),
        title: "該補擦了",
        body: "額頭",
        repeatMinutes: null
      });
      await adapter.cancel("zone-forehead");

      await vi.advanceTimersByTimeAsync(20 * 60_000);
      expect(showNotification).not.toHaveBeenCalled();
    });

    it("cancelAll 清掉所有排程", async () => {
      const { adapter, showNotification } = createHarness();

      await adapter.schedule({
        id: "zone-a",
        dueAt: minutesFromNow(5),
        title: "A",
        body: "a",
        repeatMinutes: null
      });
      await adapter.schedule({
        id: "zone-b",
        dueAt: minutesFromNow(10),
        title: "B",
        body: "b",
        repeatMinutes: null
      });
      await adapter.cancelAll();

      await vi.advanceTimersByTimeAsync(20 * 60_000);
      expect(showNotification).not.toHaveBeenCalled();
    });
  });

  describe("setTimeout 上限", () => {
    /**
     * 超過 2^31-1 毫秒的延遲，瀏覽器會立刻觸發而不是等待。
     * `dueAt` 來自資料而非常數，所以這個邊界必須守住——
     * 否則資料異常會變成「通知立刻跳出來」。
     */
    it("延遲超過上限時不立刻觸發", async () => {
      const { adapter, showNotification } = createHarness();
      const beyondLimitMinutes = 40 * 24 * 60; // 40 天，遠超過 24.8 天上限

      await adapter.schedule({
        id: "zone-forehead",
        dueAt: minutesFromNow(beyondLimitMinutes),
        title: "該補擦了",
        body: "額頭",
        repeatMinutes: null
      });

      await vi.advanceTimersByTimeAsync(2_147_483_647);
      expect(showNotification).not.toHaveBeenCalled();

      // 續接的那一段跑完才觸發。
      await vi.advanceTimersByTimeAsync(
        beyondLimitMinutes * 60_000 - 2_147_483_647
      );
      expect(showNotification).toHaveBeenCalledOnce();
    });
  });

  describe("再次提醒頻率", () => {
    it("repeatMinutes 為 null 時只顯示一次", async () => {
      const { adapter, showNotification } = createHarness();

      await adapter.schedule({
        id: "session-next-due",
        dueAt: minutesFromNow(-1),
        title: "該補擦了",
        body: "打開查看",
        repeatMinutes: null
      });

      await vi.advanceTimersByTimeAsync(60 * 60_000);
      expect(showNotification).toHaveBeenCalledOnce();
    });

    it("顯示後依 repeatMinutes 再次觸發", async () => {
      const { adapter, showNotification } = createHarness();

      await adapter.schedule({
        id: "session-next-due",
        dueAt: minutesFromNow(-1),
        title: "該補擦了",
        body: "打開查看",
        repeatMinutes: 5
      });

      expect(showNotification).toHaveBeenCalledOnce();

      await vi.advanceTimersByTimeAsync(5 * 60_000);
      expect(showNotification).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(5 * 60_000);
      expect(showNotification).toHaveBeenCalledTimes(3);
    });

    it("重排（同 id）會砍掉整條重複鏈", async () => {
      const { adapter, showNotification } = createHarness();

      await adapter.schedule({
        id: "session-next-due",
        dueAt: minutesFromNow(-1),
        title: "該補擦了",
        body: "打開查看",
        repeatMinutes: 5
      });
      expect(showNotification).toHaveBeenCalledOnce();

      // 使用者補擦了，之後不會再收到重複提醒。
      await adapter.cancel("session-next-due");

      await vi.advanceTimersByTimeAsync(30 * 60_000);
      expect(showNotification).toHaveBeenCalledOnce();
    });
  });

  describe("裝置測試", () => {
    it("有權限時立即顯示測試通知並回傳 true", async () => {
      const { adapter, showNotification } = createHarness();

      await expect(adapter.sendTest()).resolves.toBe(true);
      expect(showNotification).toHaveBeenCalledWith(
        "測試通知",
        expect.objectContaining({ tag: "notification-test" })
      );
    });

    it("沒有權限時回傳 false，不呼叫 showNotification", async () => {
      const { adapter, showNotification } = createHarness({
        getPermission: () => "denied"
      });

      await expect(adapter.sendTest()).resolves.toBe(false);
      expect(showNotification).not.toHaveBeenCalled();
    });

    it("registration 取不到時回傳 false", async () => {
      const { adapter, showNotification } = createHarness({
        getRegistration: () => Promise.resolve(null)
      });

      await expect(adapter.sendTest()).resolves.toBe(false);
      expect(showNotification).not.toHaveBeenCalled();
    });

    it("showNotification 丟例外時回傳 false，不冒泡", async () => {
      const { adapter, showNotification } = createHarness();
      showNotification.mockRejectedValue(new Error("boom"));

      await expect(adapter.sendTest()).resolves.toBe(false);
    });
  });

  describe("背景送達能力", () => {
    /**
     * 這個斷言是刻意的：Notification Triggers 已被 Chrome 放棄、
     * Safari 不支援本機通知，純前端無法在分頁關閉後送達。
     * 若哪天改成 true，畫面文案也必須跟著改，這個測試會強迫那件事被看見。
     */
    it("永遠回報無法在背景送達", () => {
      const { adapter } = createHarness();

      expect(adapter.canDeliverInBackground()).toBe(false);
    });
  });
});
