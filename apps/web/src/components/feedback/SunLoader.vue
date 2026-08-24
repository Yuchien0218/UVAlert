<script setup lang="ts">
/**
 * 全站 loading 指示器，用太陽光芒依序明滅取代通用 spinner。
 * 只用 opacity 動畫，符合 ICON_DESIGN_SYSTEM.md 的「只允許 opacity 淡入淡出」規則。
 */
interface Props {
  label?: string;
}

withDefaults(defineProps<Props>(), {
  label: "載入中"
});
</script>

<template>
  <div class="sun-loader" role="status" :aria-label="label">
    <svg
      class="sun-loader__icon"
      viewBox="0 0 48 48"
      aria-hidden="true"
    >
      <circle
        class="sun-loader__center"
        cx="24"
        cy="24"
        r="10"
      />
      <line
        v-for="rayIndex in 8"
        :key="rayIndex"
        class="sun-loader__ray"
        :style="{ '--ray-delay': `${(rayIndex - 1) * 0.12}s` }"
        x1="24"
        y1="2"
        x2="24"
        y2="8"
        :transform="`rotate(${(rayIndex - 1) * 45} 24 24)`"
      />
    </svg>
  </div>
</template>

<style scoped>
.sun-loader {
  display: inline-flex;
}

/* 3.25rem 是這顆 loading 圖示專屬的裝飾尺寸，不在 DESIGN.md 的
   16/20/24 圖示級距裡，不需要 token——原本套的 --icon-size-lg 從未
   定義過，只是靠 fallback 撐著。 */
.sun-loader__icon {
  width: 3.25rem;
  height: 3.25rem;
}

.sun-loader__center {
  fill: none;
  stroke: var(--text-secondary);
  stroke-width: 1.75;
  opacity: 0.3;
}

.sun-loader__ray {
  fill: none;
  stroke: var(--text-primary);
  stroke-width: 1.75;
  stroke-linecap: round;
  opacity: 0.15;
  animation: sun-loader-pulse 1.6s ease-in-out infinite;
  animation-delay: var(--ray-delay);
}

@keyframes sun-loader-pulse {
  0%,
  100% {
    opacity: 0.15;
  }
  40% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sun-loader__ray {
    animation: none;
    opacity: 0.6;
  }
}
</style>
