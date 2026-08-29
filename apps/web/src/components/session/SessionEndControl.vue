<script setup lang="ts">
import { shallowRef, useTemplateRef } from "vue";
import Icon from "../icons/Icon.vue";
import { useOverlay } from "../../composables/useOverlay";
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
const confirmation = useTemplateRef<HTMLElement>("confirmation");
const cancelButton = useTemplateRef<HTMLButtonElement>("cancelButton");

function openConfirmation(): void {
  emit("resetError");
  isConfirming.value = true;
}

function cancelConfirmation(): void {
  if (props.phase === "ending") return;
  isConfirming.value = false;
  emit("resetError");
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
      return "目前無法儲存停止操作，這次提醒仍在運作。請再試一次。";
    case "refresh_failed":
      return "提醒已提交結束，但畫面更新失敗。請重新整理確認最新狀態。";
    case "validation_error":
      return "停止操作未通過驗證，這次提醒沒有被結束。";
    case null:
      return "";
  }
}

const { closeFromBackdrop } = useOverlay({
  open: isConfirming,
  container: confirmation,
  initialFocus: cancelButton,
  onClose: cancelConfirmation
});
</script>

<template>
  <!--
    2026-08-24 使用者裁決：原本是「提醒控制」整個區塊（標題＋說明＋
    「停止本次提醒」連結），佔掉不少版面。改成右上角一顆小叉叉以減輕
    畫面份量，確認改用彈窗呈現。
  -->
  <div class="session-end">
    <button
      class="icon-button"
      type="button"
      aria-label="結束這次提醒"
      @click="openConfirmation"
    >
      <Icon name="tool-close" :size="24" />
    </button>

    <Teleport to="body">
      <div
        v-if="isConfirming"
        class="session-end__backdrop"
        data-overlay-root
        @click.self="closeFromBackdrop"
      >
        <div
          ref="confirmation"
          class="session-end__confirmation"
          role="dialog"
          aria-modal="true"
          aria-labelledby="session-end-confirm-title"
          aria-describedby="session-end-confirm-body"
          tabindex="-1"
        >
          <p id="session-end-confirm-title" class="session-end__confirm-title">
            要結束這次提醒嗎？
          </p>
          <p id="session-end-confirm-body" class="session-end__confirm-body">
            結束後會停止所有待處理提示；裝備紀錄與既有資料不會受影響。
          </p>

          <p v-if="error !== null" class="session-end__error" role="alert">
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
              ref="cancelButton"
              class="button button--quiet"
              type="button"
              :disabled="phase === 'ending'"
              @click="cancelConfirmation"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* 只剩右上角那顆叉叉，靠 justify-self 貼齊 page-stack 的右緣。 */
.session-end {
  justify-self: end;
}

.session-end__confirm-body {
  margin: 0;
  color: var(--text-body);
  font-size: var(--font-size-body);
  line-height: 1.6;
}

/*
 * 確認彈窗。沿用兩個 sheet 的遮罩做法（--overlay-backdrop），面板用
 * --surface-overlay——那是**不透明**的表面，浮在內容上必須遮得住背後
 * （半透明的 --surface-primary 會讓底下文字透出來，2026-08-24 踩過）。
 */
.session-end__backdrop {
  position: fixed;
  z-index: var(--z-overlay);
  inset: 0;
  display: grid;
  place-items: center;
  padding: var(--space-5);
  background: var(--overlay-backdrop);
}

.session-end__confirmation {
  display: grid;
  gap: var(--space-3);
  width: min(100%, 24rem);
  padding: var(--space-5);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  background: var(--surface-overlay);
  overscroll-behavior: contain;
}

/*
 * 這是 <p> 而不是標題元素（對話框標題靠 aria-labelledby 關聯），
 * 所以不吃 h1/h2/h3 的襯線體規則，字重要自己留著。
 */
.session-end__confirm-title {
  margin: 0;
  color: var(--text-primary);
  font-size: var(--font-size-card-title);
  font-weight: 600;
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
