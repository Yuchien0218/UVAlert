<script setup lang="ts">
import type { RegionPreferenceV1 } from "@sunshield/contracts";
import { MapPin } from "@lucide/vue";

interface Props {
  preference: RegionPreferenceV1 | null;
}

defineProps<Props>();
</script>

<template>
  <section class="region-summary" aria-labelledby="region-summary-title">
    <MapPin :size="22" :stroke-width="1.7" aria-hidden="true" />
    <div>
      <h2 id="region-summary-title" class="region-summary__title">
        目前設定
      </h2>
      <p class="region-summary__value">
        <template v-if="preference?.mode === 'selected'">
          {{ preference.selection.displayName }}
        </template>
        <template v-else-if="preference?.mode === 'skipped'">
          先不設定地區
        </template>
        <template v-else>尚未設定地區</template>
      </p>
      <p class="region-summary__note">
        地區只用於顯示 UV 資訊，不會改變本機補擦計時。
      </p>
    </div>
  </section>
</template>

<style scoped>
.region-summary {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--space-3);
  padding-block: var(--space-5);
  border-block: 1px solid var(--border-subtle);
}

.region-summary__title,
.region-summary__value,
.region-summary__note {
  margin: 0;
}

.region-summary__title {
  font-size: var(--font-size-body);
  color: var(--text-secondary);
}

.region-summary__value {
  margin-top: var(--space-1);
  font-size: var(--font-size-title-sm);
  font-weight: 600;
}

.region-summary__note {
  margin-top: var(--space-2);
  color: var(--text-secondary);
  line-height: 1.6;
}
</style>
