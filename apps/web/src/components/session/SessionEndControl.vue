<script setup lang="ts">
import { nextTick, shallowRef, useTemplateRef } from "vue";
import type {
  SessionEndError,
  SessionEndPhase
} from "../../features/session/createSessionControlController";

interface Props {
  phase: SessionEndPhase;
  error: SessionEndError;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  confirm: [];
  resetError: [];
}>();

const isConfirming = shallowRef(false);
const confirmationTitle =
  useTemplateRef<HTMLElement>("confirmationTitle");
const stopButton = useTemplateRef<HTMLButtonElement>("stopButton");

async function openConfirmation(): Promise<void> {
  emit("resetError");
  isConfirming.value = true;
  await nextTick();
  confirmationTitle.value?.focus();
}

async function cancelConfirmation(): Promise<void> {
  if (props.phase === "ending") return;
  isConfirming.value = false;
  emit("resetError");
  await nextTick();
  stopButton.value?.focus();
}

function confirmEnd(): void {
  if (props.phase === "ending") return;
  emit("confirm");
}

function getErrorMessage(error: SessionEndError): string {
  switch (error) {
    case "state_changed":
      return "提醒狀態已在其他畫面更新，請確認最新狀態後再試一次。";
    case "persistence_error":
      return "目前無法保存停止操作，這次提醒仍在運作。請再試一次。";
    case "refresh_failed":
      return "提醒已提交結束，但畫面更新失敗。請重新整理確認最新狀態。";
    case "validation_error":
      return "停止操作未通過驗證，這次提醒沒有被結束。";
    case null:
      return "";
  }
}
</script>

<template>
  <section class="session-end" aria-labelledby="session-end-title">
    <h2 id="session-end-title" class="session-end__title">
      提醒控制
    </h2>

    <div v-if="!isConfirming" class="session-end__body">
      <p class="session-end__summary">
        不再需要這次倒數時，可以手動停止；既有產品與紀錄仍會保留。
      </p>
      <button
        ref="stopButton"
        class="button button--quiet session-end__trigger"
        type="button"
        @click="openConfirmation"
      >
        停止本次提醒
      </button>
    </div>

    <div
      v-else
      class="session-end__confirmation"
      role="region"
      aria-labelledby="session-end-confirm-title"
      aria-describedby="session-end-confirm-body"
      @keydown.esc="cancelConfirmation"
    >
      <p
        ref="confirmationTitle"
        id="session-end-confirm-title"
        class="session-end__confirm-title"
        tabindex="-1"
      >
        確認結束本次提醒？
      </p>
      <p id="session-end-confirm-body" class="session-end__confirm-body">
        結束後將停止所有待處理提示。產品紀錄和既有資訊不會受影響。
      </p>

      <p
        v-if="error !== null"
        class="session-end__error"
        role="alert"
      >
        {{ getErrorMessage(error) }}
      </p>

      <div class="session-end__actions">
        <button
          class="button session-end__confirm-button"
          type="button"
          :disabled="phase === 'ending'"
          @click="confirmEnd"
        >
          {{ phase === "ending" ? "正在結束…" : "結束本次提醒" }}
        </button>
        <button
          class="button button--quiet"
          type="button"
          :disabled="phase === 'ending'"
          @click="cancelConfirmation"
        >
          取消
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.session-end {
  display: grid;
  gap: var(--space-3);
  padding-top: var(--space-5);
  border-top: 1px solid var(--border-subtle);
}

.session-end__title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 500;
}

.session-end__body {
  display: grid;
  gap: var(--space-3);
}

.session-end__summary,
.session-end__confirm-body {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.7;
}

.session-end__trigger {
  width: fit-content;
  padding: var(--space-3) var(--space-4);
  border-color: var(--border-subtle);
  background: var(--surface-primary);
  color: var(--text-primary);
  font-weight: 500;
}

.session-end__confirmation {
  display: grid;
  gap: var(--space-3);
  padding-top: var(--space-3);
  border: 0;
  box-shadow: none;
}

.session-end__confirm-title {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.1rem;
  font-weight: 600;
}

.session-end__confirm-title:focus {
  outline: none;
}

.session-end__confirm-body {
  font-size: var(--font-size-body);
}

.session-end__error {
  margin: 0;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--color-due-soft);
  border-left: 3px solid var(--color-due);
  color: var(--text-primary);
  font-size: var(--font-size-body);
  line-height: 1.6;
}

.session-end__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: center;
  margin-top: var(--space-2);
}

.session-end__confirm-button {
  flex: 1;
  min-width: 10rem;
  border-color: var(--color-due);
  background: var(--color-due);
  color: var(--color-white);
  font-weight: 600;
}

.session-end__actions .button--quiet {
  flex: 0 1 auto;
}

.session-end__confirm-button:disabled,
.session-end__actions .button:disabled {
  cursor: wait;
  opacity: 0.6;
}

@media (max-width: 31rem) {
  .session-end__actions .button {
    width: 100%;
  }
}
</style>
