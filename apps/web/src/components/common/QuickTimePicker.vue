<script setup lang="ts">
interface Props {
  appliedAt: string;
  referenceNow: string;
  error: string | undefined;
  heading?: string;
  idPrefix?: string;
  summaryLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  heading: "實際何時補擦？",
  idPrefix: "reapply-time",
  summaryLabel: "確認時間："
});
const emit = defineEmits<{
  change: [value: string];
  quick: [minutesAgo: number];
}>();
function localValue(iso: string): string {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
function fromLocal(value: string): void {
  if (value) emit("change", new Date(value).toISOString());
}
function isSelected(minutes: number): boolean {
  return (
    Math.abs(
      (Date.parse(props.referenceNow) - Date.parse(props.appliedAt)) / 60_000 -
        minutes
    ) < 0.5
  );
}
</script>

<template>
  <section class="app-card time-section" :aria-labelledby="`${idPrefix}-title`">
    <h2 :id="`${idPrefix}-title`">{{ heading }}</h2>
    <div class="quick-times">
      <button
        v-for="item in [
          { label: '剛剛', minutes: 0 },
          { label: '15 分鐘前', minutes: 15 },
          { label: '30 分鐘前', minutes: 30 },
          { label: '60 分鐘前', minutes: 60 }
        ]"
        :key="item.minutes"
        class="button button--quiet"
        type="button"
        :aria-pressed="isSelected(item.minutes)"
        @click="emit('quick', item.minutes)"
      >
        {{ item.label }}
      </button>
    </div>
    <label :for="idPrefix">自訂日期與時間</label>
    <input
      :id="idPrefix"
      type="datetime-local"
      :value="localValue(appliedAt)"
      :aria-describedby="error ? `${idPrefix}-error` : `${idPrefix}-summary`"
      @change="fromLocal(($event.target as HTMLInputElement).value)"
    />
    <p :id="`${idPrefix}-summary`" class="time-summary">
      {{ summaryLabel }}{{ new Date(appliedAt).toLocaleString("zh-TW") }}
    </p>
    <p v-if="error" :id="`${idPrefix}-error`" class="form-error" role="alert">
      {{ error }}
    </p>
  </section>
</template>

<style scoped>
.time-section {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-5);
}
h2,
p {
  margin: 0;
}
.quick-times {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
input {
  min-height: var(--tap-target);
  padding-inline: var(--space-3);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  background: var(--surface-primary);
}
.time-summary {
  color: var(--text-secondary);
}
</style>
