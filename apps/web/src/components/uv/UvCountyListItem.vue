<script setup lang="ts">
import { computed } from "vue";
import type { NationwideUvCounty } from "@sunshield/contracts";
import {
  getUviFillPercent,
  getUvRiskClassSuffix
} from "../../features/uv/uvDistributionPresentation";

const props = defineProps<{ county: NationwideUvCounty }>();

const riskClass = computed(
  () => `uv-county-item--${getUvRiskClassSuffix(props.county.riskLevel)}`
);
const fillStyle = computed(() => ({
  "--uvi-fill": getUviFillPercent(props.county.uvi)
}));
</script>

<template>
  <li class="uv-county-item" :class="riskClass" :style="fillStyle">
    <span class="uv-county-item__bar" aria-hidden="true" />
    <span class="uv-county-item__name" data-typography-role="supporting">
      {{ county.displayName }}
    </span>
    <span class="uv-county-item__value stat-figure">{{ county.uvi }}</span>
  </li>
</template>

<style scoped>
.uv-county-item {
  --uvi-fill: 0%;
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  overflow: hidden;
  min-height: var(--tap-target);
  padding: var(--uv-distribution-item-padding-block) var(--uv-distribution-item-padding-inline);
  border-radius: var(--uv-distribution-item-radius);
  background: var(--color-surface-soft);
}

.uv-county-item__bar {
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  width: var(--uvi-fill);
  background: var(--uv-risk-visual-color);
  opacity: 0.62;
}

.uv-county-item__name,
.uv-county-item__value {
  position: relative;
}

.uv-county-item__name {
  color: var(--color-body-strong);
  font-family: var(--font-family-supporting);
  font-size: var(--font-size-supporting);
  font-weight: var(--font-weight-supporting);
  line-height: var(--line-height-supporting);
  letter-spacing: var(--letter-spacing-supporting);
}

.uv-county-item__value { color: var(--color-ink); }
.uv-county-item--low { --uv-risk-visual-color: var(--color-uvi-visual-low); }
.uv-county-item--moderate { --uv-risk-visual-color: var(--color-uvi-visual-moderate); }
.uv-county-item--high { --uv-risk-visual-color: var(--color-uvi-visual-high); }
.uv-county-item--very-high { --uv-risk-visual-color: var(--color-uvi-visual-very-high); }
.uv-county-item--extreme { --uv-risk-visual-color: var(--color-uvi-visual-extreme); }
</style>
