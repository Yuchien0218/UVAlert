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
/*
 * **slot 內容必須是區塊元素，不能是裸文字。**
 *
 * 這裡是 grid，所以 slot 傳進來的每一段裸文字都會被包成一個匿名 grid
 * item，item 之間再吃一次 gap。2026-09-04 實測：一句「…都會消失且
 * <strong>無法復原</strong>，之後…」被拆成三塊、中間各 12px，逗號掉到
 * 行首——DOM 正確、文案正確，只有排版是錯的。
 *
 * 不改成一般流排版是因為 gap 正是這裡要的東西（段落與按鈕列之間、清單
 * 與段落之間）。守門在 DataSettingsPage.test.ts：掛載後檢查
 * `.confirm-note` 底下沒有非空白的裸文字節點。
 */
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
