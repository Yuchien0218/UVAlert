/**
 * 防曬晴報員 Service Worker。
 *
 * **範圍刻意只有通知。** 這支 worker 不做離線快取——快取牽涉資產版本、
 * 更新策略與過期處理，是獨立的決策，混進通知一起做會讓兩者都難以驗證。
 *
 * 排程本身不在這裡：本機排程由分頁用 setTimeout 驅動，再呼叫
 * `registration.showNotification()`。worker 負責的是分頁不一定還在時
 * 仍需處理的事——也就是使用者點擊通知之後要把他帶回哪裡。
 *
 * 背景送達的限制見 `docs/decisions/2026-08-23-notification-decision.md`。
 */

// 這支 worker 沒有快取，所以更新時不需要保留舊版本；直接接管即可。
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload;
  try {
    payload = event.data?.json();
  } catch {
    return;
  }
  if (payload?.type !== "reminder-due") return;

  event.waitUntil(
    self.registration
      .showNotification("該補擦防曬乳了", {
        tag: "uvalert-reminder-due",
        data: { path: "/" }
      })
      .catch(() => undefined)
  );
});

/**
 * 點擊通知後回到提醒頁。
 *
 * 優先聚焦已開啟的分頁而不是開新的——使用者多半已經有一個開著，
 * 再開一個會讓同一個 Session 出現在兩個分頁。
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetPath = event.notification.data?.path ?? "/";
  const targetUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (new URL(client.url).origin !== self.location.origin) {
            continue;
          }
          if ("focus" in client) {
            return client.focus().then((focused) =>
              "navigate" in focused
                ? focused.navigate(targetUrl).catch(() => focused)
                : focused
            );
          }
        }
        return self.clients.openWindow?.(targetUrl);
      })
  );
});
