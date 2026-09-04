<script setup lang="ts">
import { computed } from "vue";
import { useWebAppServices } from "../../app/injection";
import Icon from "../icons/Icon.vue";

const { boot } = useWebAppServices();

const navigationItems = [
  { to: "/", label: "提醒", icon: "nav-reminder" },
  { to: "/products", label: "裝備", icon: "nav-gear" },
  { to: "/more", label: "更多", icon: "nav-more" }
] as const;

const hasDueReminder = computed(() => {
  const session = boot.currentSession.value;
  if (session === null) return false;
  return session.zones.some((zone) => zone.timingStatus === "reapply_due");
});

// 紅點是 aria-hidden 的純視覺標記，所以「有部位到期」這個資訊必須進到
// 連結本身的可及名稱，否則螢幕閱讀器使用者完全收不到。
function navigationLabel(to: string, label: string): string {
  return to === "/" && hasDueReminder.value
    ? `${label}（有部位建議現在補擦）`
    : label;
}
</script>

<template>
  <nav class="bottom-nav" aria-label="主要導覽">
    <RouterLink
      v-for="item in navigationItems"
      :key="item.to"
      class="bottom-nav__item"
      data-typography-role="nav-label"
      :to="item.to"
      :aria-label="navigationLabel(item.to, item.label)"
    >
      <div class="bottom-nav__icon-wrapper">
        <Icon :name="item.icon" :size="24" />
        <div
          v-if="item.to === '/' && hasDueReminder"
          class="bottom-nav__badge"
          data-testid="bottom-nav-badge"
          aria-hidden="true"
        />
      </div>
      <span class="bottom-nav__label">{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  z-index: var(--z-nav);
  right: 0;
  bottom: 0;
  left: 0;
  display: grid;
  /*
   * 2026-08-30：原本是 `width: min(100%, var(--content-max))`，在 320px
   * （WCAG SC 1.4.10 reflow 的基準寬度）會撐出 16px 的橫向捲軸。
   *
   * 兩個原因疊在一起：
   * 1. 這個元素同時設了 `left: 0; right: 0` 與 `width`，兩者衝突——LTR 下
   *    left ＋ width 勝出，right 形同虛設。
   * 2. `position: fixed` 的 100% 是 viewport 寬，**不扣除桌面瀏覽器佔位的
   *    垂直捲軸**。實測 320px 視窗：clientWidth 320、捲軸 16、導覽列 336。
   *    真實手機的捲軸是覆蓋式不佔寬，所以只在桌面窄視窗看得到。
   *
   * 改用 max-width：寬度交給 left/right 決定（那個是扣掉捲軸的），
   * max-width 只負責限制上限，margin-inline: auto 維持置中。
   */
  max-width: var(--content-max);
  min-height: calc(var(--bottom-nav-height) + env(safe-area-inset-bottom));
  grid-template-columns: repeat(3, 1fr);
  margin-inline: auto;
  padding: var(--space-2) max(var(--space-2), env(safe-area-inset-right))
    calc(var(--space-2) + env(safe-area-inset-bottom))
    max(var(--space-2), env(safe-area-inset-left));
  border-top: 1px solid var(--border-subtle);
  background: var(--page-background);
}

/*
 * 選取態＝藥丸底 ＋ 標籤變深。**2026-09-04 推翻了 2026-08-23 的「不換色」。**
 *
 * 那次的裁決是：Claude Design 的下游元件庫明寫「用形狀承載狀態，不換色
 * ——選取態是圖示後面的奶油色藥丸底加粗體標籤，圖示與文字顏色在任何狀態
 * 下都一樣」，與 DESIGN.md 文字版規格互相矛盾，使用者當時選了藥丸版。
 *
 * 2026-09-04 使用者改變主意：**拿掉粗體，改成標籤換色。** 粗體切換的問題
 * 是它是瞬變的字重跳動——字會微幅改變寬度，讀起來是「文字抖了一下」而不是
 * 「這一項被選中了」。
 *
 * **只換標籤，不換圖示。** nav-* 圖示是雙色系統：墨咖結構走 currentColor、
 * 琥珀金重點寫死在 SVG 裡。對圖示換色只會換掉墨咖那一半，變成半邊變色。
 * 所以 color 留在 .bottom-nav__item 上（圖示繼承它，兩態都不變），換色只
 * 掛在 .bottom-nav__label 上。
 *
 * 顏色走**明暗階不走色相階**：--text-secondary → --text-primary。不用
 * --color-primary-text，因為 primary 是行動色，拿它當選取訊號等於讓「這裡
 * 可以按」跟「這個已經選了」共用一個訊號（同 ContextSelector 2026-09-04）。
 */
.bottom-nav__item {
  position: relative;
  display: grid;
  min-height: 3.5rem;
  place-content: center;
  justify-items: center;
  gap: var(--space-1);
  border-radius: var(--radius-sm);
  color: var(--color-body-strong);
  text-decoration: none;
}

.bottom-nav__label {
  color: var(--text-secondary);
  transition: color var(--duration-fast) var(--ease-emphasized);
}

.bottom-nav__item.router-link-exact-active .bottom-nav__label {
  color: var(--text-primary);
}

.bottom-nav__icon-wrapper {
  position: relative;
  display: grid;
  place-items: center;
  width: 3.5rem;
  height: 2rem;
}

/*
 * 藥丸是獨立的 ::before，不是 wrapper 自己的 background——**因為它會縮**。
 *
 * 選取指示器改成橫向展開（使用者指名要 Google Play 底部導覽那個手感）。
 * 直接把 scaleX 加在 .bottom-nav__icon-wrapper 上會**連圖示一起縮**，所以
 * 藥丸必須自己一層。
 *
 * 疊法沿用 .icon-button--compact 的 grid-area 1/1，**但多一個 position:
 * relative**——只靠 DOM 順序不夠：實測藥丸的背景會蓋掉圖示，選取那一項
 * 變成只剩一顆空藥丸。`.icon-button--compact` 之所以沒踩到，是因為它的
 * ::before 只有邊框、背景是透明的，從來沒有東西可以蓋。
 *
 * 這個 bug 任何數值斷言都抓不到：實測 svg 仍然是 24×24、visible、
 * opacity 1、顏色正確、位置正確——DOM 全對，只有畫面是錯的。是截圖看出來的。
 *
 * position: relative 讓圖示成為已定位元素，繪製順序排在未定位的 ::before
 * 背景之後。不用負的 z-index：.bottom-nav 有 z-index 所以是一個堆疊脈絡，
 * 藥丸會沉到它的 background 底下直接消失。
 *
 * 緩動用 --ease-emphasized（M3 standard）而不是 --ease-out：起步快、尾段長。
 * --ease-out 是溫和的 easeOutQuad，中段幾乎等速，展開會讀成「慢慢滑出來」
 * 而不是「彈到位」。控制點沒有超過 1，所以不會 overshoot。
 *
 * 起點 0.4 不是 0：從完全沒有寬度長出來會讀成「生出一個東西」，從一段
 * 短藥丸撐開才讀得出「指示器移到這一項」。
 */
.bottom-nav__icon-wrapper::before {
  content: "";
  grid-area: 1 / 1;
  width: 100%;
  height: 100%;
  border-radius: var(--radius-pill);
  background: var(--color-surface-card);
  opacity: 0;
  transform: scaleX(0.4);
  transition:
    opacity var(--duration-fast) var(--ease-emphasized),
    transform var(--duration-fast) var(--ease-emphasized);
}

.bottom-nav__icon-wrapper > * {
  position: relative;
  grid-area: 1 / 1;
}

.bottom-nav__item.router-link-exact-active .bottom-nav__icon-wrapper::before {
  opacity: 1;
  transform: scaleX(1);
}

.bottom-nav__badge {
  position: absolute;
  top: -0.15rem;
  right: -0.15rem;
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
  background: var(--color-due);
}
</style>
