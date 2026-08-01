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
        path: "/setup/review",
        name: "setup-review",
        component: () => import("../pages/setup/SetupReviewPage.vue"),
        meta: {
          title: "確認這次提醒",
          hideNavigation: true,
          requiresNoActiveSession: true,
          setupStep: "review"
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
      if (
        to.meta.setupStep === "review" &&
        (draft === null || draft.zones.length === 0)
      ) {
        return { name: "setup-timing" };
      }
      if (
        to.meta.setupStep === "timing" &&
        (draft?.zones.length ?? 0) > 0 &&
        setup.hasTopicalZones.value === false
      ) {
        return { name: "setup-review" };
      }
      if (
        to.meta.setupStep === "review" &&
        setup.hasTopicalZones.value &&
        setup.applicationTime.value === null
      ) {
        return { name: "setup-timing" };
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
