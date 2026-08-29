<script setup lang="ts">
/**
 * 二次確認的觸發／確認／取消按鈕列。若有 `warning` slot 內容，確認態會包在
 * `.confirm-note` 警示框裡；沒有內容時（例如「清除草稿」沒有額外警示文字）
 * 只顯示一列按鈕，不套空框——沿用各頁原本的行為。
 */
interface Props {
  confirming: boolean;
  pending?: boolean;
  triggerDisabled?: boolean;
  triggerLabel: string;
  confirmLabel: string;
  cancelLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  pending: false,
  triggerDisabled: false,
  cancelLabel: "取消"
});

const emit = defineEmits<{
  trigger: [];
  confirm: [];
  cancel: [];
}>();
</script>

<template>
  <button
    v-if="!props.confirming"
    class="button button--quiet"
    type="button"
    :disabled="props.pending || props.triggerDisabled"
    @click="emit('trigger')"
  >
    {{ props.triggerLabel }}
  </button>
  <div v-else-if="$slots.warning" class="confirm-note" role="alert">
    <slot name="warning" />
    <div class="button-row">
      <button
        class="button button--primary"
        type="button"
        :disabled="props.pending"
        @click="emit('confirm')"
      >
        {{ props.confirmLabel }}
      </button>
      <button
        class="button button--quiet"
        type="button"
        :disabled="props.pending"
        @click="emit('cancel')"
      >
        {{ props.cancelLabel }}
      </button>
    </div>
  </div>
  <div v-else class="button-row">
    <button
      class="button button--primary"
      type="button"
      :disabled="props.pending"
      @click="emit('confirm')"
    >
      {{ props.confirmLabel }}
    </button>
    <button
      class="button button--quiet"
      type="button"
      :disabled="props.pending"
      @click="emit('cancel')"
    >
      {{ props.cancelLabel }}
    </button>
  </div>
</template>

<style scoped>
.confirm-note {
  display: grid;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-due);
  color: var(--text-secondary);
  line-height: var(--line-height-body);
}

.confirm-note :deep(strong) {
  line-height: 1.4;
}

.confirm-note :deep(ul) {
  margin: var(--space-2) 0;
  padding-inline-start: var(--space-5);
}

.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}
</style>
