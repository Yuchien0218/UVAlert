<script setup lang="ts">
import { ref, watch } from "vue";
import type { BootPhase } from "../../app/createAppBootController";
import BrandLockup from "./BrandLockup.vue";

interface Props {
  phase: BootPhase;
}

const props = defineProps<Props>();

const visible = ref(true);
const isTestEnv = import.meta.env.MODE === "test";
const startTime = Date.now();
const MIN_SPLASH_MS = isTestEnv ? 0 : 420;

function checkDismiss(): void {
  if (props.phase === "error") {
    visible.value = false;
    return;
  }
  if (props.phase === "ready") {
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, MIN_SPLASH_MS - elapsed);
    if (remaining === 0) {
      visible.value = false;
    } else {
      setTimeout(() => {
        visible.value = false;
      }, remaining);
    }
  }
}

watch(() => props.phase, checkDismiss, { immediate: true });
</script>

<template>
  <Transition name="splash-fade">
    <div
      v-if="visible"
      class="app-splash-screen"
      role="status"
      aria-label="載入防曬晴報員"
    >
      <div class="app-splash-screen__content">
        <BrandLockup class="app-splash-screen__logo" />
        <p class="app-splash-screen__tagline">
          紫外線即時與防護提醒
        </p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.app-splash-screen {
  position: fixed;
  inset: 0;
  z-index: var(--z-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-canvas);
}

.app-splash-screen__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  text-align: center;
}

.app-splash-screen__logo {
  height: 2.5rem;
  width: auto;
}

.app-splash-screen__logo :deep(circle) {
  transform-origin: 6px 15.94px;
  animation: splash-sun-pulse var(--duration-loader-cycle) var(--ease-in-out)
    infinite;
}

.app-splash-screen__logo :deep(path:nth-of-type(1)) {
  animation: splash-ray-sweep-1 var(--duration-loader-cycle) var(--ease-in-out)
    infinite;
}

.app-splash-screen__logo :deep(path:nth-of-type(2)) {
  animation: splash-ray-sweep-2 var(--duration-loader-cycle) var(--ease-in-out)
    infinite;
}

.app-splash-screen__logo :deep(path:nth-of-type(3)) {
  animation: splash-ray-sweep-3 var(--duration-loader-cycle) var(--ease-in-out)
    infinite;
}

.app-splash-screen__tagline {
  margin: 0;
  color: var(--color-muted);
  font-size: var(--font-size-caption);
  letter-spacing: 0.05em;
}

.splash-fade-leave-active {
  transition:
    opacity var(--duration-base) var(--ease-out),
    transform var(--duration-base) var(--ease-out);
  pointer-events: none;
}

.splash-fade-leave-to {
  opacity: 0;
  transform: scale(1.03);
}

@keyframes splash-sun-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }

  30% {
    transform: scale(0.9);
    opacity: 0.85;
  }

  65% {
    transform: scale(1.06);
    opacity: 1;
  }
}

@keyframes splash-ray-sweep-1 {
  0%,
  100% {
    opacity: 0.35;
    transform: translateX(0);
  }

  25% {
    opacity: 1;
    transform: translateX(1.5px);
  }

  55% {
    opacity: 0.35;
    transform: translateX(0);
  }
}

@keyframes splash-ray-sweep-2 {
  0%,
  100% {
    opacity: 0.35;
    transform: translateX(0);
  }

  40% {
    opacity: 1;
    transform: translateX(1.5px);
  }

  70% {
    opacity: 0.35;
    transform: translateX(0);
  }
}

@keyframes splash-ray-sweep-3 {
  0%,
  100% {
    opacity: 0.35;
    transform: translateX(0);
  }

  55% {
    opacity: 1;
    transform: translateX(1.5px);
  }

  85% {
    opacity: 0.35;
    transform: translateX(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-splash-screen {
    transition: none;
  }

  .splash-fade-leave-active {
    transition: opacity 0s var(--ease-out);
  }

  .app-splash-screen__logo :deep(circle),
  .app-splash-screen__logo :deep(path) {
    animation: none;
  }
}
</style>
