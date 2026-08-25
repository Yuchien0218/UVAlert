<script setup lang="ts">
import type {
  SessionContext,
  SetupDraftV1
} from "@sunshield/contracts";
import Icon from "../icons/Icon.vue";
import {
  nextTick,
  onBeforeUnmount,
  useTemplateRef,
  watch
} from "vue";
import type { ProtectionDraftInput } from "../../features/setup/createSetupController";
import ZoneProtectionForm from "./ZoneProtectionForm.vue";

interface Props {
  open: boolean;
  context: SessionContext;
  draft: SetupDraftV1;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
  save: [input: ProtectionDraftInput];
}>();

const dialog = useTemplateRef<HTMLElement>("dialog");
let returnFocusTarget: HTMLElement | null = null;
let previousBodyOverflow = "";

function close(): void {
  emit("close");
}

function handleDocumentKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape" && props.open) {
    event.preventDefault();
    close();
  }
}

function releasePageLock(): void {
  globalThis.document?.removeEventListener(
    "keydown",
    handleDocumentKeydown
  );
  if (globalThis.document?.body) {
    globalThis.document.body.style.overflow = previousBodyOverflow;
  }
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      returnFocusTarget =
        globalThis.document?.activeElement instanceof HTMLElement
          ? globalThis.document.activeElement
          : null;
      previousBodyOverflow =
        globalThis.document?.body.style.overflow ?? "";
      if (globalThis.document?.body) {
        globalThis.document.body.style.overflow = "hidden";
      }
      globalThis.document?.addEventListener(
        "keydown",
        handleDocumentKeydown
      );
      await nextTick();
      dialog.value?.focus();
      return;
    }

    releasePageLock();
    await nextTick();
    returnFocusTarget?.focus();
    returnFocusTarget = null;
  }
);

onBeforeUnmount(releasePageLock);
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div
        v-if="open"
        class="sheet-layer"
        data-testid="protection-adjustment-sheet"
        @click.self="close"
      >
        <section
          ref="dialog"
          class="sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby="protection-sheet-title"
          tabindex="-1"
        >
          <header class="sheet__header">
            <div>
              <h2 id="protection-sheet-title">
                調整要提醒的部位
              </h2>
            </div>
            <button
              class="icon-button"
              type="button"
              aria-label="關閉調整"
              @click="close"
            >
              <Icon name="tool-close" :size="24" />
            </button>
          </header>

          <div class="sheet__body">
            <ZoneProtectionForm
              :key="`${draft.localDraftFlowId}-${draft.updatedAt}`"
              :context="context"
              :initial-zones="draft.zones"
              :initial-entry-mode="draft.setupEntryMode"
              :initial-suggested-preset-id="draft.suggestedPresetId"
              :initial-suggested-preset-version="
                draft.suggestedPresetVersion
              "
              :initial-preset-decision="draft.presetDecision"
              submit-label="儲存調整"
              @submit="emit('save', $event)"
            />
            <button
              class="button button--quiet sheet__cancel"
              type="button"
              @click="close"
            >
              關閉
            </button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-layer {
  position: fixed;
  z-index: 100;
  inset: 0;
  display: grid;
  align-items: end;
  background: var(--overlay-backdrop);
}

.sheet {
  display: grid;
  width: min(100%, 47rem);
  max-height: min(88svh, 52rem);
  min-height: 0;
  grid-template-rows: auto minmax(0, 1fr);
  justify-self: center;
  overflow: hidden;
  border: 1px solid var(--border-subtle);
  border-bottom: 0;
  border-radius: 1.5rem 1.5rem 0 0;
  /* 浮在內容上，必須不透明才遮得住背後的文字（見 --surface-overlay）。 */
  background: var(--surface-overlay);
}

.sheet:focus {
  outline: none;
}

.sheet__header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-5);
  border-bottom: 1px solid var(--border-subtle);
}

.sheet__eyebrow,
.sheet__header h2 {
  margin: 0;
}

.sheet__header h2 {
  font-size: var(--font-size-title-md);
}

.sheet__body {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding:
    var(--space-5)
    var(--space-5)
    max(var(--space-5), env(safe-area-inset-bottom));
}

.sheet__cancel {
  width: 100%;
  margin-top: var(--space-4);
}

.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 180ms ease;
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}

@media (min-width: 48rem) {
  .sheet-layer {
    align-items: center;
    padding: var(--space-6);
  }

  .sheet {
    max-height: min(88vh, 52rem);
    border-bottom: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
  }
}
</style>
