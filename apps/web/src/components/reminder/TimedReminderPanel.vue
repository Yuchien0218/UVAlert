<script setup lang="ts">
import type { ReminderPresentation } from "../../features/reminder/reminderPresentation";
import ReminderPanel from "./ReminderPanel.vue";

interface Props {
  presentation: ReminderPresentation;
  remainingFraction: number | null;
  progressPercent: number | null;
}

defineProps<Props>();

const emit = defineEmits<{
  action: [kind: ReminderPresentation["actionKind"]];
}>();
</script>

<template>
  <ReminderPanel
    :presentation="presentation"
    :remaining-fraction="remainingFraction"
    :progress-percent="progressPercent"
    @action="emit('action', $event)"
  />
</template>
