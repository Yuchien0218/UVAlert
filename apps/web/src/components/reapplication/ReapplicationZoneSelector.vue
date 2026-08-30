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
  padding: var(--card-padding);
}
fieldset {
  margin: 0;
  min-width: 0;
}
/*
 * 2026-08-30：字重 700 → 500。這個 legend 用的是 section-title 字級，而
 * DESIGN.md 第 581 行訂「section title 的字重 500」；700 既不在量表上，
 * 字型也只載入 400／500／600。
 */
legend {
  padding: 0;
  font-size: var(--font-size-section-title);
  font-weight: var(--font-weight-section-title);
}
.section-help {
  color: var(--text-secondary);
  line-height: var(--line-height-body);
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
/*
 * 這個 `<small>` 是 badge（「建議」），不是說明文字，所以覆寫掉 app.css 給
 * `small` 的 supporting 預設，改用 DESIGN.md 第五節指定給 badge 的 caption。
 */
.zone-choice small {
  color: var(--color-tracking);
  font-size: var(--font-size-caption);
}
</style>
