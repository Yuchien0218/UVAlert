<script setup lang="ts">
import {
  Bell,
  House,
  Menu,
  Package
} from "@lucide/vue";
import { computed } from "vue";
import { useWebAppServices } from "../../app/injection";

const { boot } = useWebAppServices();

const navigationItems = [
  { to: "/", label: "首頁", icon: House },
  { to: "/reminder", label: "提醒", icon: Bell },
  { to: "/products", label: "產品", icon: Package },
  { to: "/more", label: "更多", icon: Menu }
] as const;

const hasDueReminder = computed(() => {
  const session = boot.currentSession.value;
  if (session === null) return false;
  return session.zones.some((zone) => zone.timingStatus === "reapply_due");
});
</script>

<template>
  <nav class="bottom-nav" aria-label="主要導覽">
    <RouterLink
      v-for="item in navigationItems"
      :key="item.to"
      class="bottom-nav__item"
      :to="item.to"
      :aria-label="item.label"
    >
      <div class="bottom-nav__icon-wrapper">
        <component
          :is="item.icon"
          :size="21"
          :stroke-width="1.6"
          aria-hidden="true"
        />
        <div
          v-if="item.to === '/reminder' && hasDueReminder"
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
  grid-template-columns: repeat(4, 1fr);
  margin-inline: auto;
  padding: var(--space-2) max(var(--space-2), env(safe-area-inset-right))
    calc(var(--space-2) + env(safe-area-inset-bottom))
    max(var(--space-2), env(safe-area-inset-left));
  border-top: 1px solid var(--border-subtle);
  background: var(--page-background);
}

.bottom-nav__item {
  position: relative;
  display: grid;
  min-height: 3.5rem;
  place-content: center;
  justify-items: center;
  gap: var(--space-1);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  opacity: 0.45;
  font-size: 0.75rem;
  text-decoration: none;
  transition: opacity var(--duration-fast) var(--ease-out);
}

.bottom-nav__item:hover {
  opacity: 0.8;
}

.bottom-nav__item.router-link-exact-active {
  opacity: 1;
}

.bottom-nav__icon-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
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
