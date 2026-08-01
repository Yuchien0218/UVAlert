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

    <p v-if="!isConfirming" class="session-end__summary">
      不再需要這次倒數時，可以手動停止；既有產品與紀錄仍會保留。
      <button
        ref="stopButton"
        class="text-link session-end__trigger"
        type="button"
        @click="openConfirmation"
      >
        停止本次提醒
      </button>
    </p>

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
        結束本次提醒？
      </p>
      <p id="session-end-confirm-body" class="session-end__confirm-body">
        結束後不再接受這次提醒的一般事件，未來的待處理提示也會停止。產品與既有紀錄不會被當成已補擦或防護完成。
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

.session-end__summary,
.session-end__confirm-body {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.7;
}

.session-end__trigger {
  display: inline-flex;
  align-items: center;
  min-height: 2.75rem;
  margin-left: var(--space-1);
  padding-inline: var(--space-2);
  color: var(--text-primary);
  font-weight: 500;
  text-decoration: underline;
  text-underline-offset: 0.2rem;
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
  color: var(--text-secondary);
  font-size: 0.95rem;
  font-weight: 400;
}

.session-end__confirm-title:focus {
  outline: none;
}

.session-end__error {
  margin: 0;
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--color-due-soft);
  color: var(--text-primary);
  font-size: 0.875rem;
  line-height: 1.7;
}

.session-end__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.session-end__confirm-button {
  border-color: var(--color-due);
  background: var(--color-due);
  color: var(--color-white);
}

.session-end__confirm-button:disabled,
.session-end__actions .button:disabled {
  cursor: wait;
  opacity: 0.65;
}

@media (max-width: 31rem) {
  .session-end__actions .button {
    width: 100%;
  }
}
</style>
