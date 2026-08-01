<script setup lang="ts">
const props = defineProps<{ appliedAt: string; referenceNow: string; error: string | undefined }>();
const emit = defineEmits<{ change: [value: string]; quick: [minutesAgo: number] }>();
function localValue(iso: string): string { const date = new Date(iso); const offset = date.getTimezoneOffset() * 60_000; return new Date(date.getTime() - offset).toISOString().slice(0, 16); }
function fromLocal(value: string): void { if (value) emit("change", new Date(value).toISOString()); }
function isSelected(minutes: number): boolean { return Math.abs((Date.parse(props.referenceNow) - Date.parse(props.appliedAt)) / 60_000 - minutes) < 0.5; }
</script>

<template>
  <section class="app-card time-section" aria-labelledby="time-title">
    <h2 id="time-title">實際何時補擦？</h2>
    <div class="quick-times">
      <button v-for="item in [{ label: '剛剛', minutes: 0 }, { label: '15 分鐘前', minutes: 15 }, { label: '30 分鐘前', minutes: 30 }, { label: '60 分鐘前', minutes: 60 }]" :key="item.minutes" class="button button--quiet" type="button" :aria-pressed="isSelected(item.minutes)" @click="emit('quick', item.minutes)">{{ item.label }}</button>
    </div>
    <label for="reapply-time">自訂日期與時間</label>
    <input id="reapply-time" type="datetime-local" :value="localValue(appliedAt)" :aria-describedby="error ? 'reapply-time-error' : 'reapply-time-summary'" @change="fromLocal(($event.target as HTMLInputElement).value)" />
    <p id="reapply-time-summary">確認時間：{{ new Date(appliedAt).toLocaleString('zh-TW') }}</p>
    <p v-if="error" id="reapply-time-error" class="form-error" role="alert">{{ error }}</p>
  </section>
</template>

<style scoped>
.time-section { display: grid; gap: var(--space-4); padding: var(--space-5); }
h2, p { margin: 0; }
.quick-times { display: flex; flex-wrap: wrap; gap: var(--space-2); }
input { min-height: var(--tap-target); padding-inline: var(--space-3); border: 1px solid var(--border-strong); border-radius: var(--radius-sm); color: var(--text-primary); background: var(--surface-primary); }
#reapply-time-summary { color: var(--text-secondary); }
.form-error { color: var(--color-due); }
</style>
