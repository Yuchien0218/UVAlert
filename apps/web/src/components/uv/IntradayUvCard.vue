<script setup lang="ts">
import IntradayUvCurve from "./IntradayUvCurve.vue";
import type { IntradayUvCurveModel } from "../../features/uv/solarUvCurve";

interface Props {
  curve: IntradayUvCurveModel | null;
  reapplyHours?: number[] | undefined;
}

defineProps<Props>();
</script>

<template>
  <section
    v-if="curve"
    class="intraday-card"
    aria-labelledby="intraday-card-title"
  >
    <header class="intraday-card__header">
      <h2 id="intraday-card-title" data-typography-role="section-title">
        今日 UV 走勢
      </h2>
    </header>

    <IntradayUvCurve
      :curve="curve"
      :reapply-hours="reapplyHours"
    />
  </section>
</template>

<style scoped>
.intraday-card {
  display: grid;
  gap: var(--space-4);
  padding-block-start: var(--space-5);
  border-block-start: 1px solid var(--border-subtle);
}

.intraday-card__header {
  display: flex;
  align-items: center;
}

.intraday-card__header h2 {
  margin: 0;
}
</style>
