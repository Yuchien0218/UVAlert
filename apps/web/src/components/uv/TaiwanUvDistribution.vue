<script setup lang="ts">
import type { NationwideUvForecast, RegionSelection } from "@sunshield/contracts";
import TaiwanUvMap from "./TaiwanUvMap.vue";
import UvCountyGroupedList from "./UvCountyGroupedList.vue";
import UvRiskLegend from "./UvRiskLegend.vue";

defineProps<{
  forecast: NationwideUvForecast;
  region: RegionSelection | null;
}>();
</script>

<template>
  <section class="uv-distribution" aria-labelledby="uv-distribution-title">
    <div class="uv-distribution__region">
      <p class="uv-distribution__region-label" data-typography-role="body">
        {{ region === null ? "尚未設定地區" : `目前地區：${region.displayName}` }}
      </p>
      <RouterLink class="text-link" to="/region" data-typography-role="body">
        {{ region === null ? "設定地區" : "變更地區" }}
      </RouterLink>
    </div>

    <div class="uv-distribution__content">
      <h2 id="uv-distribution-title" data-typography-role="section-title">
        今日全臺分布
      </h2>
      <TaiwanUvMap
        :forecast="forecast"
        :highlight-county-code="region?.regionCode.slice(0, 5) ?? null"
      />
      <UvRiskLegend />
      <UvCountyGroupedList :counties="forecast.counties" />
    </div>
  </section>
</template>

<style scoped>
.uv-distribution {
  display: grid;
  gap: var(--space-4);
}

.uv-distribution__region {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.uv-distribution__region-label {
  margin: 0;
  color: var(--color-body);
  font-family: var(--font-family-body);
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-body);
  line-height: var(--line-height-body);
  letter-spacing: var(--letter-spacing-body);
}

.uv-distribution__content {
  display: grid;
  gap: var(--space-4);
  padding-block-start: var(--space-4);
  border-block-start: 1px solid var(--border-subtle);
}

.uv-distribution__content > h2 {
  margin: 0;
}
</style>
