<script setup lang="ts">
import BottomSheet from "../common/BottomSheet.vue";
import IntradayUvCurve from "./IntradayUvCurve.vue";
import type { IntradayUvCurveModel } from "../../features/uv/solarUvCurve";

interface Props {
  open: boolean;
  curve: IntradayUvCurveModel | null;
  regionName?: string | null | undefined;
  reapplyHours?: number[] | undefined;
}

defineProps<Props>();

const emit = defineEmits<{
  close: [];
}>();
</script>

<template>
  <BottomSheet
    :open="open"
    :title="regionName ? `${regionName}・今日 UV 趨勢` : '今日 UV 趨勢'"
    labelled-by-id="intraday-uv-sheet-title"
    @close="emit('close')"
  >
    <div v-if="curve" class="intraday-uv-sheet__content">
      <IntradayUvCurve
        :curve="curve"
        :reapply-hours="reapplyHours"
        compact
      />
    </div>
  </BottomSheet>
</template>

<style scoped>
.intraday-uv-sheet__content {
  display: grid;
  gap: var(--space-3);
}
</style>
