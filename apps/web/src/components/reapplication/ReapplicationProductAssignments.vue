<script setup lang="ts">
import type { ZoneProjection } from "@sunshield/contracts";
import type { ReapplicationProductChoice } from "../../features/reapplication/createReapplicationController";
import { getZoneLabel } from "../../features/reminder/reminderPresentation";

defineProps<{ zones: ZoneProjection[]; selectedZoneIds: string[]; choices: ReapplicationProductChoice[]; assignments: Record<string, string>; errors: Record<string, string[]> }>();
const emit = defineEmits<{ assign: [zoneId: string, choiceId: string] }>();
</script>

<template>
  <section class="app-card assignment-section" aria-labelledby="assignment-title">
    <h2 id="assignment-title">各部位實際使用的產品</h2>
    <p>不同部位可以選擇不同產品；只有確認當下的包裝標示 snapshot 會寫入紀錄。</p>
    <div v-for="zone in zones.filter((item) => selectedZoneIds.includes(item.zoneInstanceId))" :key="zone.zoneInstanceId" class="assignment-row">
      <label :for="`product-${zone.zoneInstanceId}`">{{ getZoneLabel(zone) }}</label>
      <select :id="`product-${zone.zoneInstanceId}`" :value="assignments[zone.zoneInstanceId] ?? ''" :aria-describedby="errors[`product.${zone.zoneInstanceId}`] ? `product-error-${zone.zoneInstanceId}` : undefined" @change="emit('assign', zone.zoneInstanceId, ($event.target as HTMLSelectElement).value)">
        <option value="" disabled>請選擇產品</option>
        <option v-for="choice in choices" :key="choice.choiceId" :value="choice.choiceId" :disabled="!choice.selectable">{{ choice.displayName }}{{ choice.restriction ? '（不建立倒數）' : choice.selectable ? '' : '（不可使用）' }}</option>
      </select>
      <p v-if="errors[`product.${zone.zoneInstanceId}`]?.[0]" :id="`product-error-${zone.zoneInstanceId}`" class="form-error" role="alert">{{ errors[`product.${zone.zoneInstanceId}`]?.[0] }}</p>
      <p v-else-if="choices.find((choice) => choice.choiceId === assignments[zone.zoneInstanceId])?.restriction" class="restriction-note">{{ choices.find((choice) => choice.choiceId === assignments[zone.zoneInstanceId])?.restriction }}</p>
    </div>
  </section>
</template>

<style scoped>
.assignment-section { display: grid; gap: var(--space-4); padding: var(--space-5); }
h2, p { margin: 0; }
.assignment-section > p { color: var(--text-secondary); line-height: 1.7; }
.assignment-row { display: grid; gap: var(--space-2); }
.assignment-row label { font-weight: 700; }
select { width: 100%; min-height: var(--tap-target); padding-inline: var(--space-3); border: 1px solid var(--border-strong); border-radius: var(--radius-sm); color: var(--text-primary); background: var(--surface-primary); }
.form-error { color: var(--color-due); }
.restriction-note { margin: 0; color: var(--color-untimed); line-height: 1.6; }
</style>
