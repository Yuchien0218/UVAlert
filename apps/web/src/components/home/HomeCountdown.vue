<script setup lang="ts">
import { computed } from "vue";
import type { HomeReminderClockPresentation } from "../../features/reminder/homeReminderClockPresentation";

/**
 * 首頁的補擦倒數。
 *
 * **平面線性進度條，不是深色面板加進度環**（2026-08-23 裁決）。DESIGN.md
 * 第五節原本規定 `countdown-panel` 是濃縮咖啡深色卡片配 `countdown-ring`；
 * wireframe 改成畫布上的線性進度條，使用者確認採用 wireframe 版本，
 * DESIGN.md 第五、七、十一節已一併回寫。
 *
 * 進度條顏色跟著狀態走（追蹤中／即將到期／已到期），但顏色**永遠搭配
 * 文字標示**——DESIGN.md 第十一節「不要單靠顏色傳達狀態」。剩餘時間、
 * 部位名稱與預計時間都是文字，色彩只是加強。
 */

const props = defineProps<{
  presentation: HomeReminderClockPresentation;
}>();

/** 沒有可信期限時 progressPercent 為 null，此時不畫進度條而不是畫 0%。 */
const hasProgress = computed(
  () => props.presentation.progressPercent !== null
);

const toneClass = computed(
  () => `countdown--${props.presentation.tone}`
);
</script>

<template>
  <section class="countdown" :class="toneClass" data-testid="home-countdown">
    <p class="countdown__eyebrow">補擦倒數</p>

    <div class="countdown__value">
      <span class="stat-figure countdown__figure">
        {{ presentation.remainingMinutes }}
      </span>
      <span class="countdown__unit">分鐘</span>
    </div>

    <p class="countdown__detail">
      {{ presentation.title }}・{{ presentation.timeLabel }}
    </p>

    <div
      v-if="hasProgress"
      class="countdown__track"
      role="progressbar"
      :aria-valuenow="presentation.progressPercent ?? 0"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-label="`距離補擦還有 ${presentation.remainingMinutes} 分鐘`"
    >
      <div
        class="countdown__fill"
        :style="{ width: `${presentation.progressPercent}%` }"
      />
    </div>
  </section>
</template>

<style scoped>
.countdown {
  display: grid;
  gap: var(--space-2);
}

.countdown__eyebrow {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
}

.countdown__value {
  display: flex;
  align-items: flex-end;
  gap: var(--space-2);
}

.countdown__figure {
  font-size: clamp(3rem, 15vw, 3.75rem);
}

.countdown__unit {
  padding-bottom: 0.375rem;
  color: var(--text-secondary);
  font-size: 1rem;
}

.countdown__detail {
  margin: 0;
  font-size: 0.9375rem;
}

.countdown__track {
  height: 8px;
  margin-top: var(--space-2);
  border-radius: var(--radius-xs);
  background: var(--color-surface-card);
  overflow: hidden;
}

.countdown__fill {
  height: 100%;
  background: var(--tone-color, var(--color-tracking));
  transition: width var(--motion-base, 240ms)
    cubic-bezier(0.22, 1, 0.36, 1);
}

.countdown--tracking {
  --tone-color: var(--color-tracking);
}

.countdown--soon {
  --tone-color: var(--color-soon);
}

.countdown--due {
  --tone-color: var(--color-due);
}

@media (prefers-reduced-motion: reduce) {
  .countdown__fill {
    transition: none;
  }
}
</style>
