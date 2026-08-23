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
      <span>{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  z-index: 20;
  right: 0;
  bottom: 0;
  left: 0;
  display: grid;
  width: min(100%, var(--content-max));
  min-height: calc(
    var(--bottom-nav-height) + env(safe-area-inset-bottom)
  );
  grid-template-columns: repeat(3, 1fr);
  margin-inline: auto;
  padding: var(--space-2) max(var(--space-2), env(safe-area-inset-right))
    calc(var(--space-2) + env(safe-area-inset-bottom))
    max(var(--space-2), env(safe-area-inset-left));
  border-top: 1px solid var(--border-subtle);
  background: var(--page-background);
}

/*
 * 2026-08-23 修正（第二版）：第一版改成「未選取 muted、選取態 primary」
 * 換色，是照 DESIGN.md 文字版規格做的；但 Claude Design 的下游元件庫
 * （components/navigation/BottomNav.jsx／.prompt.md）明確寫「用形狀
 * 承載狀態，不換色——選取態是圖示後面的奶油色藥丸底加粗體標籤，圖示與
 * 文字顏色在任何狀態下都一樣」。兩份文件互相矛盾，使用者確認要藥丸版，
 * 這裡照做，DESIGN.md 的文字規格也一併回寫，不再有兩套說法並存。
 *
 * nav-* 圖示是雙色系統，墨咖結構走 currentColor、琥珀金重點寫死在
 * SVG 裡，兩種狀態都不變色，本來就不需要外層換色。
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
  font-size: 0.75rem;
  font-weight: 400;
  text-decoration: none;
}

.bottom-nav__item.router-link-exact-active {
  font-weight: 700;
}

.bottom-nav__icon-wrapper {
  position: relative;
  display: grid;
  place-items: center;
  width: 3.5rem;
  height: 2rem;
  border-radius: var(--radius-pill);
  background: transparent;
  transition: background-color var(--duration-fast) var(--ease-out);
}

.bottom-nav__item.router-link-exact-active .bottom-nav__icon-wrapper {
  background: var(--color-surface-card);
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
