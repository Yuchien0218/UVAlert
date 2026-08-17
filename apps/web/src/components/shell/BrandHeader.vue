<script setup lang="ts">
import { computed } from "vue";

interface Props {
  /**
   * 反映目前所有提醒裡「最高急迫度」的狀態，由父層（通常是讀取所有
   * session/zone 狀態的地方）算出來傳進來。null／未傳 = 沒有進行中的
   * Logo 維持中性色；提醒狀態由文字與狀態點表達。
   */
  tone?: "tracking" | "soon" | "due" | null;
}

const props = withDefaults(defineProps<Props>(), {
  tone: null
});

// 狀態點的顏色不能是唯一的狀態載體，否則對色覺障礙或在強光下看不出
// 色差的使用者等於沒有這個資訊。文字跟著 tone 走，色彩只是強化；Logo
// 不再跟隨提醒狀態變色，保留中性外觀供後續品牌重新設計。
// 這裡的字串刻意與 ZoneStatusList.vue 的狀態標籤一致，不另創說法。
const contextLabel = computed(() => {
  switch (props.tone) {
    case "tracking":
      return "提醒進行中";
    case "soon":
      return "即將需要檢查";
    case "due":
      return "建議現在處理";
    case null:
      return "本機提醒";
  }
});
</script>

<template>
  <header class="brand-header">
    <RouterLink
      class="brand-header__brand"
      to="/"
      aria-label="防曬晴報員首頁"
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
      {{ contextLabel }}
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

.brand-header__status-dot {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
  background: var(--text-secondary);
  transition: background-color 0.2s ease;
}

.brand-header__context--tracking .brand-header__status-dot {
  background: var(--color-tracking);
}

.brand-header__context--soon .brand-header__status-dot {
  background: var(--color-soon);
}

.brand-header__context--due .brand-header__status-dot {
  background: var(--color-due);
}
</style>
