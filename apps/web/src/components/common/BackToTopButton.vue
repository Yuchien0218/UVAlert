<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import Icon from "../icons/Icon.vue";

defineProps<{
  /** 是否存在底部導覽列（決定底部間距偏移）。 */
  hasNavigation?: boolean;
}>();

const visible = ref(false);
const SCROLL_THRESHOLD = 320;

function handleScroll(): void {
  visible.value = globalThis.scrollY > SCROLL_THRESHOLD;
}

function scrollToTop(): void {
  globalThis.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

onMounted(() => {
  globalThis.addEventListener("scroll", handleScroll, { passive: true });
  handleScroll();
});

onBeforeUnmount(() => {
  globalThis.removeEventListener("scroll", handleScroll);
});
</script>

<template>
  <Transition name="back-to-top">
    <button
      v-if="visible"
      type="button"
      class="back-to-top"
      :class="{ 'back-to-top--with-navigation': hasNavigation }"
      aria-label="回到頁面頂部"
      title="回到頁面頂部"
      @click="scrollToTop"
    >
      <Icon name="tool-chevron-down" :size="20" class="back-to-top__icon" />
    </button>
  </Transition>
</template>

<style scoped>
.back-to-top {
  position: fixed;
  z-index: var(--z-nav);
  right: max(
    var(--space-4),
    calc((100vw - var(--app-shell-max)) / 2 + var(--space-4))
  );
  bottom: calc(var(--space-4) + env(safe-area-inset-bottom));
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--tap-target);
  height: var(--tap-target);
  padding: 0;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-pill);
  background-color: var(--surface-overlay);
  color: var(--text-primary);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--color-ink) 12%, transparent);
  cursor: pointer;
  transition:
    background-color var(--duration-fast) var(--ease-out),
    filter var(--duration-fast) var(--ease-out),
    opacity var(--duration-fast) var(--ease-out),
    transform var(--duration-fast) var(--ease-out);
}

.back-to-top--with-navigation {
  bottom: calc(
    var(--bottom-nav-height) + var(--space-4) + env(safe-area-inset-bottom)
  );
}

@media (min-width: 48rem) {
  .back-to-top {
    right: max(
      var(--space-4),
      calc((100vw - var(--reading-shell-max)) / 2 + var(--space-4))
    );
  }
}

.back-to-top:active {
  background-color: var(--color-hairline);
  filter: brightness(var(--press-dim));
}

.back-to-top:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

.back-to-top__icon {
  transform: rotate(180deg);
}

.back-to-top-enter-active,
.back-to-top-leave-active {
  transition:
    opacity var(--duration-fast) var(--ease-emphasized),
    transform var(--duration-fast) var(--ease-emphasized);
}

.back-to-top-enter-from,
.back-to-top-leave-to {
  opacity: 0;
  transform: translateY(var(--space-2));
}

@media (prefers-reduced-motion: reduce) {
  .back-to-top,
  .back-to-top-enter-active,
  .back-to-top-leave-active {
    transition: none;
  }
}
</style>
