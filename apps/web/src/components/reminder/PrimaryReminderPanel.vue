<script setup lang="ts">
import type {
  ActionKind,
  PrimaryAction,
  ZoneProjection
} from "@sunshield/contracts";
import type { ConnectivityStatus } from "@sunshield/platform";
import { computed } from "vue";
import { useCurrentTime } from "../../composables/useCurrentTime";
import {
  buildReminderPresentation,
  type SecondaryActionKind
} from "../../features/reminder/reminderPresentation";
import ReminderPanel from "./ReminderPanel.vue";

interface Props {
  primaryAction: PrimaryAction;
  zones: ZoneProjection[];
  connectivity: ConnectivityStatus;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  action: [kind: ActionKind];
  secondaryAction: [kind: SecondaryActionKind];
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
  <ReminderPanel
    :presentation="presentation"
    @action="emit('action', $event)"
    @secondary-action="emit('secondaryAction', $event)"
  />
</template>
