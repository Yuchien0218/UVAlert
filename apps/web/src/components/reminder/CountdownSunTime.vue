<script setup lang="ts">
import { computed } from "vue";

interface Props {
  remainingFraction: number | null;
  progressPercent: number | null;
  remainingMinutes: number;
  progressAriaLabel: string;
  timeLabel: string;
}

const props = defineProps<Props>();

const visibleRayCount = computed(() =>
  Math.ceil(
    Math.min(1, Math.max(0, props.remainingFraction ?? 0)) * 8
  )
);

const estimatePrefix = computed(() =>
  props.timeLabel.startsWith("預計 ") ? "預計" : null
);

const estimateValue = computed(() =>
  estimatePrefix.value === null
    ? props.timeLabel
    : props.timeLabel.slice(3)
);
</script>

<template>
  <div
    class="countdown-time countdown-time__copy"
    role="progressbar"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-valuenow="progressPercent ?? undefined"
    :aria-label="progressAriaLabel"
  >
    <svg
      class="countdown-sun"
      viewBox="0 0 48 48"
      aria-hidden="true"
    >
      <circle
        class="countdown-sun__center"
        cx="24"
        cy="24"
        r="11"
      />
      <line
        v-for="rayIndex in 8"
        :key="rayIndex"
        class="countdown-sun__ray"
        x1="24"
        y1="2"
        x2="24"
        y2="7"
        :transform="`rotate(${(rayIndex - 1) * 45} 24 24)`"
        :data-visible="rayIndex <= visibleRayCount"
        :class="{
          'countdown-sun__ray--faded': rayIndex > visibleRayCount
        }"
      />
    </svg>

    <div class="countdown-time__stack" aria-hidden="true">
      <div class="countdown-time__value">
        <strong class="countdown-time__number stat-figure">{{ remainingMinutes }}</strong>
        <span class="countdown-time__unit">分鐘</span>
      </div>

      <div class="countdown-time__estimate">
        <template v-if="estimatePrefix !== null">
          {{ estimatePrefix }}
          <span class="stat-figure stat-figure--inline">
            {{ estimateValue }}
          </span>
        </template>
        <template v-else>{{ estimateValue }}</template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.countdown-time {
  display: flex;
  align-items: flex-end;
  gap: var(--space-3);
}

.countdown-sun {
  width: 3.25rem;
  height: 3.25rem;
  flex: 0 0 auto;
  margin-bottom: 0.1rem;
}

.countdown-sun__center,
.countdown-sun__ray {
  fill: none;
  stroke: var(--countdown-tone);
  stroke-linecap: round;
}

.countdown-sun__center {
  stroke-width: 1.75;
}

.countdown-sun__ray {
  stroke-width: 1.75;
  opacity: 1;
  transition: opacity 0.3s ease;
}

.countdown-sun__ray--faded {
  opacity: 0.15;
}

.countdown-time__stack {
  display: grid;
  gap: var(--space-1);
}

.countdown-time__value {
  display: flex;
  align-items: baseline;
  gap: var(--space-1);
  line-height: 1;
  font-size: clamp(1.75rem, 6vw, 2.25rem);
}

.countdown-time__number {
  color: var(--text-primary);
  font-size: 1em;
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1;
}

.countdown-time__unit {
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
}

.countdown-time__estimate {
  color: var(--text-secondary);
  font-size: 0.8rem;
  line-height: 1.4;
  text-align: left;
}
</style>
