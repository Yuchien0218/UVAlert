import {
  createRouter,
  createWebHistory,
  type Router,
  type RouterHistory
} from "vue-router";
import type { AppBootController } from "../app/createAppBootController";
import type { SetupController } from "../features/setup/createSetupController";

export function createAppRouter(
  boot: AppBootController,
  history: RouterHistory = createWebHistory(),
  setup?: SetupController
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
        meta: { title: "首頁" }
      },
      {
        path: "/reminder",
        name: "reminder",
        component: () => import("../pages/ReminderPage.vue"),
        meta: { title: "目前提醒" }
      },
      {
        path: "/reminder/reapply",
        name: "reminder-reapply",
        component: () => import("../pages/ReapplyPage.vue"),
        meta: { title: "記錄實際補擦", hideNavigation: true, requiresActiveSession: true }
      },
      {
        path: "/reminder/report",
        name: "reminder-report",
        component: () => import("../pages/ReportContextEventPage.vue"),
        meta: { title: "回報狀況", hideNavigation: true, requiresActiveSession: true }
      },
      {
        path: "/products",
        name: "products",
        component: () => import("../pages/ProductsPage.vue"),
        meta: { title: "防曬產品" }
      },
      {
        path: "/more",
        name: "more",
        component: () => import("../pages/MorePage.vue"),
        meta: { title: "更多設定" }
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
        path: "/settings/display",
        name: "settings-display",
        component: () =>
          import("../pages/settings/DisplaySettingsPage.vue"),
        meta: { title: "顯示設定" }
      },
      {
        path: "/settings/data",
        name: "settings-data",
        component: () => import("../pages/PlaceholderPage.vue"),
        meta: {
          title: "本機資料管理",
          heading: "本機資料管理",
          body: "查看、匯出與清除本機資料將在下一個實作切片接上；匯出不上傳、不經後端。"
        }
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
        path: "/setup",
        redirect: { name: "setup-context" }
      },
      {
        path: "/setup/context",
        name: "setup-context",
        component: () => import("../pages/setup/SetupContextPage.vue"),
        meta: {
          title: "選擇情境",
          hideNavigation: true,
          requiresNoActiveSession: true,
          setupStep: "context"
        }
      },
      {
        path: "/setup/protection",
        name: "setup-protection",
        redirect: {
          name: "setup-timing",
          query: { adjustProtection: "1" }
        }
      },
      {
        path: "/setup/timing",
        name: "setup-timing",
        component: () => import("../pages/setup/SetupTimingPage.vue"),
        meta: {
          title: "產品與時間",
          hideNavigation: true,
          requiresNoActiveSession: true,
          setupStep: "timing"
        }
      },
      {
        // 2026-08-07 裁決：設定流程縮為兩步，原步驟 3 最終確認廢除，
        // 內容併入 /setup/timing。保留為 redirect 避免舊連結 404。
        path: "/setup/review",
        name: "setup-review",
        redirect: { name: "setup-timing" }
      },
      {
        // S-10：更正最近事件。入口是 S-07 的最近事件清單（唯一入口）。
        path: "/reminder/event/:id/correct",
        name: "reminder-event-correct",
        component: () => import("../pages/PlaceholderPage.vue"),
        meta: {
          title: "更正事件",
          hideNavigation: true,
          requiresActiveSession: true,
          heading: "更正這筆事件",
          body: "更正表單將在下一個實作切片接上事件流的 replace／void 後繼事件。"
        }
      },
      {
        path: "/reminder/action/:kind",
        name: "reminder-action",
        component: () => import("../pages/PlaceholderPage.vue"),
        meta: {
          title: "回報提醒",
          heading: "提醒回報",
          body: "事件回報表單將在下一個實作切片接上既有 command transaction。"
        }
      },
      {
        path: "/:pathMatch(.*)*",
        name: "not-found",
        component: () => import("../pages/PlaceholderPage.vue"),
        meta: {
          title: "找不到頁面",
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

    if (to.meta.requiresActiveSession === true && boot.currentSession.value === null) {
      return { name: "reminder" };
    }

    if (typeof to.meta.setupStep === "string" && setup !== undefined) {
      await setup.ensureLoaded();
      const draft = setup.draft.value;

      if (
        setup.recoveryPending.value &&
        to.name !== "setup-context"
      ) {
        return { name: "setup-context" };
      }
      if (
        to.meta.setupStep !== "context" &&
        draft?.initialContext === null
      ) {
        return { name: "setup-context" };
      }
    }

    return true;
  });

  router.afterEach((to) => {
    const title =
      typeof to.meta.title === "string" ? to.meta.title : "Sunshield";
    globalThis.document.title = `${title}｜防曬晴報員`;
  });

  return router;
}
