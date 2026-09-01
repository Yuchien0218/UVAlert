import {
  createRouter,
  createWebHistory,
  type Router,
  type RouterHistory
} from "vue-router";
import type { AppBootController } from "../app/createAppBootController";

export function createAppRouter(
  boot: AppBootController,
  history: RouterHistory = createWebHistory()
): Router {
  const router = createRouter({
    history,
    scrollBehavior(_to, _from, savedPosition) {
      return savedPosition ?? { top: 0 };
    },
    routes: [
      {
        path: "/",
        name: "home",
        component: () => import("../pages/HomePage.vue"),
        meta: { title: "提醒" }
      },
      // 2026-08-24：`/reminder` 已移除，內容併入首頁下半部（摘要在上、
      // 完整狀態在下）。它原本是首頁連過去的「查看完整狀態」詳細頁，但
      // 沒有任何導覽歸屬——三個下排 tab 都不對應它，進去之後也沒有明確
      // 的返回，等於一個懸空的頁面。依 2026-08-08 的前例不留轉址。
      {
        path: "/reminder/reapply",
        name: "reminder-reapply",
        component: () => import("../pages/ReapplyPage.vue"),
        meta: {
          title: "記錄補擦",
          hideNavigation: true,
          requiresActiveSession: true
        }
      },
      {
        path: "/reminder/report",
        name: "reminder-report",
        component: () => import("../pages/ReportContextEventPage.vue"),
        meta: {
          title: "記錄狀況",
          hideNavigation: true,
          requiresActiveSession: true
        }
      },
      {
        path: "/products/new",
        name: "product-new",
        component: () => import("../pages/GearFormPage.vue"),
        meta: { title: "新增防曬裝備", hideNavigation: true }
      },
      {
        path: "/products/:id/edit",
        name: "product-edit",
        component: () => import("../pages/GearFormPage.vue"),
        meta: { title: "編輯防曬裝備", hideNavigation: true }
      },
      /*
       * 2026-09-01：裝備詳情從整頁改成清單上的抽屜（使用者裁決），
       * `ProductDetailPage.vue` 已刪除。
       *
       * **舊網址導回清單而不是留一個 404。** 這個路徑沒有任何內部連結指過
       * 來（改動前唯一的入口是 `ProductsPage.openGear`），但可能還躺在某人
       * 的瀏覽記錄或已安裝 PWA 的分頁裡；把他們丟到「找不到頁面」比直接
       * 帶回清單糟。
       *
       * 不做「導回清單並自動打開那件裝備」：那需要把抽屜狀態接進網址，等於
       * 把剛拿掉的那一層路由再加回來，而這件事沒有人會分享連結。
       */
      {
        path: "/products/:id",
        redirect: { name: "products" }
      },
      {
        path: "/products",
        name: "products",
        component: () => import("../pages/ProductsPage.vue"),
        meta: { title: "防曬裝備" }
      },
      {
        path: "/more",
        name: "more",
        component: () => import("../pages/MorePage.vue"),
        meta: { title: "更多" }
      },
      {
        path: "/education",
        name: "education",
        component: () => import("../pages/education/EducationIndexPage.vue"),
        meta: { title: "防曬衛教", hideNavigation: true }
      },
      {
        path: "/education/articles/:slug",
        name: "education-article",
        component: () => import("../pages/education/EducationArticlePage.vue"),
        meta: { title: "衛教文章", hideNavigation: true }
      },
      {
        path: "/education/:category",
        name: "education-category",
        component: () => import("../pages/education/EducationCategoryPage.vue"),
        meta: { title: "衛教分類", hideNavigation: true }
      },
      {
        path: "/feedback",
        name: "feedback",
        component: () => import("../pages/FeedbackPage.vue"),
        meta: { title: "問題回報與意見回饋" }
      },
      {
        path: "/help",
        name: "help",
        component: () => import("../pages/help/HelpIndexPage.vue"),
        meta: { title: "常見問題" }
      },
      {
        path: "/help/beach",
        name: "help-beach",
        component: () => import("../pages/help/HelpTopicPage.vue"),
        meta: { title: "海邊防曬常見問題", helpTopicSlug: "beach" }
      },
      {
        // S-16。同時是 `view_conservative_reminder` 的目的地（時鐘不可信且離線）。
        path: "/help/how-it-works",
        name: "help-how-it-works",
        component: () => import("../pages/help/HelpTopicPage.vue"),
        meta: {
          title: "防曬晴報員怎麼運作",
          helpTopicSlug: "how-it-works"
        }
      },
      {
        path: "/special-situation",
        name: "special-situation",
        component: () => import("../pages/SpecialSituationPage.vue"),
        meta: { title: "特殊狀況" }
      },
      {
        path: "/settings/data",
        name: "settings-data",
        component: () => import("../pages/settings/DataSettingsPage.vue"),
        meta: {
          title: "本機資料與隱私",
          heading: "本機資料與隱私",
          body: "查看、匯出與清除本機資料；匯出不上傳、不經後端。"
        }
      },
      {
        path: "/settings/account-data",
        name: "settings-account-data",
        component: () => import("../pages/settings/AccountDataPage.vue"),
        meta: { title: "登入與雲端資料" }
      },
      {
        path: "/settings/notifications",
        name: "settings-notifications",
        component: () =>
          import("../pages/settings/NotificationSettingsPage.vue"),
        meta: { title: "通知設定" }
      },
      {
        path: "/install",
        name: "install",
        component: () => import("../pages/InstallPage.vue"),
        meta: { title: "安裝到手機" }
      },
      {
        path: "/region",
        name: "region",
        component: () => import("../pages/RegionPage.vue"),
        meta: { title: "地區設定" }
      },
      {
        // 2026-08-23：首頁改版後五日預報從內嵌卡片改成連結，這裡是它的落點。
        path: "/forecast",
        name: "forecast",
        component: () => import("../pages/ForecastPage.vue"),
        meta: { title: "五日 UV 預報" }
      },
      {
        // 2026-08-24：設定改成單一頁面。原本的 `/setup/context` 與
        // `/setup/timing` 兩步已移除，依 2026-08-08 的前例不留轉址——
        // P0 尚未上線、沒有外部連結要相容，留著只會讓路由表更難讀。
        // （更早移除的還有 `/setup/protection` 與 `/setup/review`。）
        // 部位 sheet 仍可用 `/setup?adjustProtection=1` 直接開啟。
        path: "/setup",
        name: "setup",
        component: () => import("../pages/setup/SetupPage.vue"),
        meta: {
          title: "開始防曬提醒",
          hideNavigation: true,
          requiresNoActiveSession: true
        }
      },
      {
        // S-10：更正最近事件。入口是 S-07 的最近事件清單（唯一入口）。
        path: "/reminder/event/:id/correct",
        name: "reminder-event-correct",
        component: () => import("../pages/EventCorrectionPage.vue"),
        meta: {
          title: "更正這筆紀錄",
          hideNavigation: true,
          requiresActiveSession: true
        }
      },
      // 2026-08-08：`/reminder/action/:kind` placeholder 已移除。
      // 13 個 ActionKind 全數有真實落點，沒有任何路徑指向它；
      // `resolveActionRoute.test.ts` 有一則測試守著這件事。
      {
        path: "/:pathMatch(.*)*",
        name: "not-found",
        component: () => import("../pages/PlaceholderPage.vue"),
        meta: {
          title: "找不到這個頁面",
          heading: "找不到這個頁面",
          body: "請使用下方導覽回到主要功能。"
        }
      }
    ]
  });

  router.beforeEach(async (to) => {
    await boot.ensureBooted();

    if (
      to.meta.requiresNoActiveSession === true &&
      boot.currentSession.value !== null
    ) {
      return { name: "home" };
    }

    if (
      to.meta.requiresActiveSession === true &&
      boot.currentSession.value === null
    ) {
      // 2026-08-24：沒有進行中的提醒時導回首頁。首頁就是底部導覽「提醒」
      // 的去處，也負責顯示「還沒有開始防曬提醒」的空狀態與開始 CTA；
      // 原本導到 /reminder（「查看完整狀態」詳細頁）會落在使用者沒預期
      // 的畫面。/reminder 本身保留給首頁的「查看完整狀態／最近紀錄」。
      return { name: "home" };
    }

    /*
     * 2026-08-24：原本這裡有一段 setupStep 守衛，負責把「還沒選情境」或
     * 「有未完成草稿」的人導回步驟 1。設定合併成單一頁面後兩者都不再需要
     * ——同一頁就能選情境，未完成草稿由頁面自己顯示「繼續／重新開始」。
     * `SetupDraftV1.currentStep` 仍保留在契約裡（持久化欄位，供續作用）。
     */

    return true;
  });

  router.afterEach((to) => {
    const title =
      typeof to.meta.title === "string" ? to.meta.title : "Sunshield";
    globalThis.document.title = `${title}｜防曬晴報員`;
  });

  return router;
}
