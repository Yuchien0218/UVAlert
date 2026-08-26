<script setup lang="ts">
import type { SessionContext, SetupDraftV1 } from "@sunshield/contracts";
import BottomSheet from "../common/BottomSheet.vue";
import type { ProtectionDraftInput } from "../../features/setup/createSetupController";
import ZoneProtectionForm from "./ZoneProtectionForm.vue";

interface Props {
  open: boolean;
  context: SessionContext;
  draft: SetupDraftV1;
}

defineProps<Props>();
const emit = defineEmits<{
  close: [];
  save: [input: ProtectionDraftInput];
}>();

function close(): void {
  emit("close");
}
</script>

<template>
  <BottomSheet
    :open="open"
    title="調整要提醒的部位"
    labelled-by-id="protection-sheet-title"
    @close="close"
  >
    <ZoneProtectionForm
      :key="`${draft.localDraftFlowId}-${draft.updatedAt}`"
      :context="context"
      :initial-zones="draft.zones"
      :initial-entry-mode="draft.setupEntryMode"
      :initial-suggested-preset-id="draft.suggestedPresetId"
      :initial-suggested-preset-version="draft.suggestedPresetVersion"
      :initial-preset-decision="draft.presetDecision"
      submit-label="儲存調整"
      @submit="emit('save', $event)"
    />
    <template #footer>
      <button
        class="button button--quiet protection-sheet__cancel"
        type="button"
        @click="close"
      >
        關閉
      </button>
    </template>
  </BottomSheet>
</template>

<style scoped>
.protection-sheet__cancel {
  width: 100%;
}
</style>
