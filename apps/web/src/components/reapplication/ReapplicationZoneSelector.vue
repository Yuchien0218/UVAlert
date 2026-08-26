<script setup lang="ts">
import type { ZoneProjection } from "@sunshield/contracts";
import { getZoneLabel } from "../../features/reminder/reminderPresentation";

defineProps<{
  zones: ZoneProjection[];
  selectedZoneIds: string[];
  suggestedZoneIds: string[];
  error: string | undefined;
}>();
const emit = defineEmits<{
  suggested: [];
  all: [];
  toggle: [zoneId: string];
}>();
</script>

<template>
  <fieldset
    class="app-card reapply-section"
    :aria-describedby="error ? 'zone-selection-error' : undefined"
  >
    <legend>這次實際補擦哪些部位？</legend>
    <p class="section-help">已預選到期或快到補擦時間的部位，確認後才會更新。</p>
    <div class="mode-actions">
      <button
        class="button button--quiet"
        type="button"
        @click="emit('suggested')"
      >
        只選建議部位
      </button>
      <button class="button button--quiet" type="button" @click="emit('all')">
        選擇所有提醒部位
      </button>
    </div>
    <label v-for="zone in zones" :key="zone.zoneInstanceId" class="zone-choice">
      <input
        type="checkbox"
        :checked="selectedZoneIds.includes(zone.zoneInstanceId)"
        @change="emit('toggle', zone.zoneInstanceId)"
      />
      <span>{{ getZoneLabel(zone) }}</span>
      <small v-if="suggestedZoneIds.includes(zone.zoneInstanceId)">建議</small>
    </label>
    <p v-if="error" id="zone-selection-error" class="form-error" role="alert">
      {{ error }}
    </p>
  </fieldset>
</template>

<style scoped>
.reapply-section {
  padding: var(--space-5);
}
fieldset {
  margin: 0;
  min-width: 0;
}
legend {
  padding: 0;
  font-size: var(--font-size-title);
  font-weight: 700;
}
.section-help {
  color: var(--text-secondary);
  line-height: 1.6;
}
.mode-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-block: var(--space-4);
}
.zone-choice {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  min-height: var(--tap-target);
  gap: var(--space-3);
  border-top: 1px solid var(--border-subtle);
}
.zone-choice input {
  inline-size: 1.35rem;
  block-size: 1.35rem;
}
.zone-choice small {
  color: var(--color-tracking);
}
</style>
