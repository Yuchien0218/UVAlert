<script setup lang="ts">
import type { ZoneProjection } from "@sunshield/contracts";
import { getZoneLabel } from "../../features/reminder/reminderPresentation";

interface Props {
  zones: ZoneProjection[];
  selectedZoneIds: string[];
  locked?: boolean;
}

const props = withDefaults(defineProps<Props>(), { locked: false });

const emit = defineEmits<{
  toggle: [zoneInstanceId: string];
}>();
</script>

<template>
  <div class="zone-grid">
    <label
      v-for="zone in props.zones"
      :key="zone.zoneInstanceId"
      class="zone-chip"
      :class="{ 'zone-chip--locked': props.locked }"
    >
      <input
        type="checkbox"
        :checked="props.selectedZoneIds.includes(zone.zoneInstanceId)"
        :disabled="props.locked"
        @change="emit('toggle', zone.zoneInstanceId)"
      />
      <span>{{ getZoneLabel(zone) }}</span>
    </label>
  </div>
</template>

<style scoped>
.zone-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.zone-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-pill);
  min-height: var(--tap-target);
}

.zone-chip--locked {
  opacity: 0.75;
}
</style>
