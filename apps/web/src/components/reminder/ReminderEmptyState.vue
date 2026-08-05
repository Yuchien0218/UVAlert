<script setup lang="ts">
import { ArrowRight } from "@lucide/vue";
</script>

<template>
  <section
    class="empty-state empty-state--tracking"
    data-testid="reminder-empty"
  >
    <!-- 絕對定位的大太陽背景裝飾 -->
    <svg
      class="empty-state__sun-decor"
      viewBox="0 0 48 48"
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="11" />
      <line
        v-for="rayIndex in 8"
        :key="rayIndex"
        x1="24"
        y1="2"
        x2="24"
        y2="7"
        :transform="`rotate(${(rayIndex - 1) * 45} 24 24)`"
      />
    </svg>
    <div>
      <h2 class="empty-state__title empty-state__title--single-line">
        尚未建立提醒
      </h2>
      <p class="empty-state__body">
        建立提醒以追蹤各部位狀態與補擦時機。
      </p>
    </div>
    <RouterLink
      class="button button--primary empty-state__action empty-state__action--compact"
      to="/setup"
    >
      新增提醒
      <ArrowRight :size="18" aria-hidden="true" />
    </RouterLink>
  </section>
</template>

<style scoped>
.empty-state {
  position: relative;
  display: grid;
  justify-items: start;
  gap: var(--space-5);
  padding: clamp(1.5rem, 7vw, 2.5rem) clamp(1.25rem, 5vw, 2rem);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

/* 太陽背景裝飾樣式：垂直置中略偏下，確保完整圓心露出，
   不會像原本 bottom: -2rem 那樣把圓心推到卡片邊界外只剩零散光芒 */
.empty-state__sun-decor {
  position: absolute;
  right: -1.5rem;
  top: 58%;
  transform: translateY(-50%);
  width: 12rem;
  height: 12rem;
  color: var(--color-tracking);
  opacity: 0.08;
  pointer-events: none;
}

.empty-state__sun-decor circle,
.empty-state__sun-decor line {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
}

.empty-state--tracking {
  background: var(--color-tracking-soft);
}

.empty-state__title {
  margin: 0;
  font-size: clamp(1.75rem, 7vw, 2.75rem);
  font-weight: 500;
  line-height: 1.12;
  letter-spacing: -0.04em;
}

.empty-state__title--single-line {
  white-space: nowrap;
}

.empty-state__body {
  max-width: 36rem;
  margin: var(--space-4) 0 0;
  color: var(--text-secondary);
  line-height: 1.7;
}

.empty-state__action--compact {
  width: fit-content;
  max-width: 100%;
}
</style>
