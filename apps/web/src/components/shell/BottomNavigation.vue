<script setup lang="ts">
import {
  Bell,
  House,
  Menu,
  Package
} from "@lucide/vue";

const navigationItems = [
  { to: "/", label: "首頁", icon: House },
  { to: "/reminder", label: "提醒", icon: Bell },
  { to: "/products", label: "產品", icon: Package },
  { to: "/more", label: "更多", icon: Menu }
] as const;
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
      <component
        :is="item.icon"
        :size="21"
        :stroke-width="1.6"
        aria-hidden="true"
      />
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
  color: var(--text-secondary);
  font-size: 0.75rem;
  text-decoration: none;
}

.bottom-nav__item::after {
  position: absolute;
  bottom: 0.15rem;
  left: 50%;
  width: 0;
  height: 0.12rem;
  background: var(--text-primary);
  content: "";
  transform: translateX(-50%);
  transition: width var(--duration-fast) var(--ease-out);
}

.bottom-nav__item.router-link-exact-active {
  color: var(--text-primary);
}

.bottom-nav__item.router-link-exact-active::after {
  width: 1.5rem;
}
</style>
