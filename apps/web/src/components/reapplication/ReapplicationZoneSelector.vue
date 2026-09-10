<script setup lang="ts">
import type { ZoneProjection } from "@sunshield/contracts";
import ZoneSelectorGrid from "../reminder/ZoneSelectorGrid.vue";

defineProps<{
  zones: ZoneProjection[];
  selectedZoneIds: string[];
  error: string | undefined;
}>();
const emit = defineEmits<{
  clear: [];
  suggested: [];
  all: [];
  toggle: [zoneId: string];
}>();
</script>

<template>
  <!--
    2026-09-03：改用共用的 `.question-card`（使用者回報這一頁跑版）。
    原本自己刻了 legend 字級與內距，量出來是 20px，而同一頁其他四個區塊
    標題都是 18px——多出來的 2px 沒有理由，只是沒有走共用類別。
  -->
  <fieldset
    id="reapply-zone-field"
    class="zone-selector question-card app-card"
    :aria-describedby="error ? 'zone-selection-error' : undefined"
  >
    <legend>補擦哪些部位？</legend>
    <p class="question-card__helper">已預選全部部位。</p>
    <div class="button-group mode-actions">
      <button
        class="button button--quiet"
        type="button"
        @click="emit('clear')"
      >
        清除
      </button>
      <button class="button button--quiet" type="button" @click="emit('all')">
        全選
      </button>
    </div>
    <ZoneSelectorGrid
      :zones="zones"
      :selected-zone-ids="selectedZoneIds"
      @toggle="(zoneId: string) => emit('toggle', zoneId)"
    />
    <p v-if="error" id="zone-selection-error" class="form-error" role="alert">
      {{ error }}
    </p>
  </fieldset>
</template>

<style scoped>
/*
 * 內距、fieldset 重置、legend 的字級與 float 修正、以及 legend→說明的
 * 8px 間距，全部由 `.question-card` 提供（2026-09-03 起）。這裡只留這張卡
 * 特有的東西。
 *
 * 2026-08-30 那條「legend 字重 700 → 500」的修正仍然有效，只是現在由共用
 * 類別統一給值，不必在這裡覆寫。
 */
/* 版面（間距）留在這裡，排法交給 `.button-group`。 */
.mode-actions {
  margin-block: var(--space-4);
}
</style>
