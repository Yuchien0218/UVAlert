<script setup lang="ts">
import type {
  ActionKind,
  PrimaryAction,
  ZoneProjection
} from "@sunshield/contracts";
import type { ConnectivityStatus } from "@sunshield/platform";
import { computed } from "vue";
import { useCurrentTime } from "../../composables/useCurrentTime";
import { buildReminderPresentation } from "../../features/reminder/reminderPresentation";
import DueReminderPanel from "./DueReminderPanel.vue";
import TimedReminderPanel from "./TimedReminderPanel.vue";
import UntimedReminderPanel from "./UntimedReminderPanel.vue";

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
</script>

<template>
  <DueReminderPanel
    v-if="presentation.tone === 'due'"
    :presentation="presentation"
    @action="emit('action', $event)"
  />
  <UntimedReminderPanel
    v-else-if="presentation.tone === 'untimed'"
    :presentation="presentation"
    @action="emit('action', $event)"
  />
  <TimedReminderPanel
    v-else
    :presentation="presentation"
    @action="emit('action', $event)"
  />
</template>
