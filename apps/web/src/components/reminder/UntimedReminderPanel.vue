<script setup lang="ts">
import type { ReminderPresentation } from "../../features/reminder/reminderPresentation";
import ReminderPanel from "./ReminderPanel.vue";

interface Props {
  presentation: ReminderPresentation;
}

defineProps<Props>();

const emit = defineEmits<{
  action: [kind: ReminderPresentation["actionKind"]];
}>();
</script>

<template>
  <ReminderPanel
    :presentation="presentation"
    @action="emit('action', $event)"
  />
</template>
