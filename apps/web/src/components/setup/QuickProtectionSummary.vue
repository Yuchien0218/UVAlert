<script setup lang="ts">
import { SlidersHorizontal, Sparkles } from "@lucide/vue";
import type {
  SessionContext,
  SetupDraftZoneV1
} from "@sunshield/contracts";
import { computed } from "vue";
import {
  BODY_ZONE_LABELS,
  recommendedPresetFor
} from "../../features/setup/setupCatalog";

interface Props {
  context: SessionContext;
  zones: SetupDraftZoneV1[];
  pending?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  pending: false
});
defineEmits<{
  accept: [];
  adjust: [];
}>();

const preset = computed(() => recommendedPresetFor(props.context));
const zoneLabels = computed(() =>
  props.zones.map(
    (zone) =>
      zone.customLabel ?? BODY_ZONE_LABELS[zone.bodyZoneCode]
  )
);
</script>

<template>
  <section class="quick-protection app-card">
    <div class="quick-protection__mark">
      <Sparkles :size="22" aria-hidden="true" />
    </div>
    <div class="quick-protection__content">
      <p class="quick-protection__eyebrow">快速提醒（推薦）</p>
      <h2>{{ preset.label }}</h2>
      <p>{{ preset.summary }}</p>
      <p class="quick-protection__zones">
        將本次產品套用至：{{ zoneLabels.join("、") }}
      </p>
    </div>
    <p class="quick-protection__note">
      確認實際塗抹時間後，才會建立正式提醒。
    </p>
    <div class="quick-protection__actions">
      <button
        v-if="pending"
        class="button button--primary"
        type="button"
        @click="$emit('accept')"
      >
        使用這組並繼續
      </button>
      <button
        class="button button--quiet"
        type="button"
        @click="$emit('adjust')"
      >
        <SlidersHorizontal :size="17" aria-hidden="true" />
        調整追蹤部位或防護方式
      </button>
    </div>
  </section>
</template>

<style scoped>
.quick-protection {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--space-4);
  padding: var(--space-5);
}

.quick-protection__mark {
  display: grid;
  width: 3rem;
  height: 3rem;
  place-content: center;
  border-radius: 50%;
  background: var(--color-soon-soft);
  color: var(--color-soon);
}

.quick-protection__content {
  min-width: 0;
}

.quick-protection__eyebrow,
.quick-protection__content h2,
.quick-protection__content p,
.quick-protection__note {
  margin: 0;
}

.quick-protection__eyebrow {
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 500;
}

.quick-protection__content h2 {
  margin-top: var(--space-2);
  font-size: 1.35rem;
  font-weight: 500;
}

.quick-protection__content > p:not(.quick-protection__eyebrow) {
  margin-top: var(--space-2);
  color: var(--text-secondary);
  line-height: 1.7;
}

.quick-protection__zones {
  font-size: 0.875rem;
}

.quick-protection__note,
.quick-protection__actions {
  grid-column: 1 / -1;
}

.quick-protection__note {
  color: var(--text-secondary);
  font-size: 0.8rem;
  line-height: 1.7;
}

.quick-protection__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

@media (max-width: 31rem) {
  .quick-protection__actions {
    display: grid;
  }

  .quick-protection__actions .button {
    width: 100%;
  }
}
</style>
