<script setup lang="ts">
import type {
  ActionKind,
  PrimaryAction,
  ZoneProjection
} from "@sunshield/contracts";
import type { ConnectivityStatus } from "@sunshield/platform";
import { computed } from "vue";
import { useCurrentTime } from "../../composables/useCurrentTime";
import { calculateRemainingProgress } from "../../features/reminder/homeReminderClockPresentation";
import { buildReminderPresentation } from "../../features/reminder/reminderPresentation";
import ReminderPanel from "./ReminderPanel.vue";

interface Props {
  primaryAction: PrimaryAction;
  zones: ZoneProjection[];
  connectivity: ConnectivityStatus;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  action: [kind: ActionKind];
}>();

const currentTime = useCurrentTime();

const presentation = computed(() =>
  buildReminderPresentation({
    primaryAction: props.primaryAction,
    zones: props.zones,
    connectivity: props.connectivity,
    now: currentTime.value
  })
);

const countdownProgress = computed(() => {
  if (presentation.value.tone === "due") return 0;
  const actionAt = props.primaryAction.actionAt;
  if (actionAt === null) return null;
  const dueMs = Date.parse(actionAt);
  if (!Number.isFinite(dueMs)) return null;
  const affectedZone = props.zones.find(
    (zone) =>
      props.primaryAction.affectedZoneInstanceIds.includes(
        zone.zoneInstanceId
      ) && zone.zoneTimerStartedAt !== null
  );
  if (affectedZone === undefined) return null;
  return calculateRemainingProgress(
    affectedZone.zoneTimerStartedAt,
    dueMs,
    currentTime.value.getTime()
  );
});

const countdownProgressPercent = computed(() =>
  countdownProgress.value === null
    ? null
    : Math.round(countdownProgress.value * 100)
);
</script>

<template>
  <ReminderPanel
    :presentation="presentation"
    :remaining-fraction="countdownProgress"
    :progress-percent="countdownProgressPercent"
    @action="emit('action', $event)"
  />
</template>
