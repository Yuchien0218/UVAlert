<script setup lang="ts">
import { UV_RISK_PRESENTATIONS } from "../../features/uv/uvDistributionPresentation";
</script>

<template>
  <ul class="uv-risk-legend" aria-label="紫外線風險圖例">
    <li
      v-for="presentation in UV_RISK_PRESENTATIONS"
      :key="presentation.level"
      class="uv-risk-legend__item"
      :class="`uv-risk-legend__item--${presentation.classSuffix}`"
      data-typography-role="supporting"
    >
      <span class="uv-risk-legend__swatch" aria-hidden="true" />
      <span>{{ presentation.rangeLabel }} {{ presentation.label }}</span>
    </li>
  </ul>
</template>

<style scoped>
.uv-risk-legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--uv-distribution-row-gap) var(--uv-distribution-column-gap);
  margin: 0;
  padding: 0;
  list-style: none;
}

.uv-risk-legend__item {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  color: var(--color-body);
  font-family: var(--font-family-supporting);
  font-size: var(--font-size-supporting);
  font-weight: var(--font-weight-supporting);
  line-height: var(--line-height-supporting);
  letter-spacing: var(--letter-spacing-supporting);
}

.uv-risk-legend__swatch {
  width: var(--space-2);
  aspect-ratio: 1;
  border-radius: var(--radius-pill);
  background: var(--uv-risk-visual-color);
}

.uv-risk-legend__item--low { --uv-risk-visual-color: var(--color-uvi-visual-low); }
.uv-risk-legend__item--moderate { --uv-risk-visual-color: var(--color-uvi-visual-moderate); }
.uv-risk-legend__item--high { --uv-risk-visual-color: var(--color-uvi-visual-high); }
.uv-risk-legend__item--very-high { --uv-risk-visual-color: var(--color-uvi-visual-very-high); }
.uv-risk-legend__item--extreme { --uv-risk-visual-color: var(--color-uvi-visual-extreme); }
</style>
