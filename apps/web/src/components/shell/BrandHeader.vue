<script setup lang="ts">
interface Props {
  /**
   * 反映目前所有提醒裡「最高急迫度」的狀態，由父層（通常是讀取所有
   * session/zone 狀態的地方）算出來傳進來。null／未傳 = 沒有進行中的
   * 提醒，logo 跟狀態點都維持中性色。
   */
  tone?: "tracking" | "soon" | "due" | null;
}

withDefaults(defineProps<Props>(), {
  tone: null
});
</script>

<template>
  <header class="brand-header">
    <RouterLink
      class="brand-header__brand"
      to="/"
      aria-label="防曬晴報員首頁"
      :class="tone ? `brand-header__brand--${tone}` : undefined"
    >
      <svg
        class="brand-header__sun"
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
      <span class="brand-header__wordmark">UVAlert 防曬晴報員</span>
    </RouterLink>
    <div
      class="brand-header__context"
      :class="tone ? `brand-header__context--${tone}` : undefined"
    >
      <span class="brand-header__status-dot" aria-hidden="true" />
      本機提醒
    </div>
  </header>
</template>

<style scoped>
.brand-header {
  display: flex;
  min-height: 4.5rem;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: 0 clamp(1rem, 4vw, 2.25rem);
  border-bottom: 1px solid var(--border-subtle);
}

.brand-header__brand {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
  color: var(--text-primary);
  text-decoration: none;
}

.brand-header__sun {
  width: 1.375rem;
  height: 1.375rem;
  flex: 0 0 auto;
}

.brand-header__sun circle,
.brand-header__sun line {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.75;
  stroke-linecap: round;
}

/* tone 有值時，logo 跟外面的圓點都跟著變色，
   讓「使用者現在最該注意的事」直接反映在頁首，
   不用滑到下面才知道目前狀態 */
.brand-header__brand--tracking {
  color: var(--color-tracking);
}

.brand-header__brand--soon {
  color: var(--color-soon);
}

.brand-header__brand--due {
  color: var(--color-due);
}

.brand-header__wordmark {
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 0.24em;
}

.brand-header__context {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-weight: 500;
}

.brand-header__context--tracking {
  color: var(--color-tracking);
}

.brand-header__context--soon {
  color: var(--color-soon);
}

.brand-header__context--due {
  color: var(--color-due);
}

.brand-header__status-dot {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
  background: currentColor;
}
</style>
