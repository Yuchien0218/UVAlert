<script setup lang="ts">
import Icon from "../icons/Icon.vue";
import {
  nextTick,
  onBeforeUnmount,
  useTemplateRef,
  watch
} from "vue";
import GearForm from "../product/GearForm.vue";

/**
 * 設定流程內填寫完整防曬乳包裝標示的 sheet。
 *
 * **2026-08-23 新增**，修正 Sitemap §2.2 的既有違規：原本
 * `SetupTimingPage` 的「改為填寫完整的防曬乳包裝標示」會整頁
 * `router.push` 到 `/products/new`，違反「不因產品標示……跳離到平行
 * 頁面；必要的調整以同頁區塊或 sheet 呈現」。這個 sheet 讓同一份
 * `GearForm.vue` 邏輯留在 `/setup/timing` 內開合，不離開流程。
 *
 * 手勢與可及性機制照抄 `ProtectionAdjustmentSheet.vue`——同一個流程裡
 * 兩個 sheet 的開合、焦點鎖定、Escape 關閉行為要一致，不要各寫一套。
 */

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{
  close: [];
  saved: [];
}>();

const dialog = useTemplateRef<HTMLElement>("dialog");
let returnFocusTarget: HTMLElement | null = null;
let previousBodyOverflow = "";

function close(): void {
  emit("close");
}

function handleSaved(): void {
  emit("saved");
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
        data-testid="gear-form-sheet"
        @click.self="close"
      >
        <section
          ref="dialog"
          class="sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gear-form-sheet-title"
          tabindex="-1"
        >
          <header class="sheet__header">
            <div>
              <h2 id="gear-form-sheet-title">
                填寫完整的防曬乳包裝標示
              </h2>
            </div>
            <button
              class="icon-button"
              type="button"
              aria-label="關閉"
              @click="close"
            >
              <Icon name="tool-close" :size="24" />
            </button>
          </header>

          <div class="sheet__body">
            <!--
              productId 固定傳 null——這裡永遠是「這次提醒要用的防曬乳」，
              對應目前使用中的 snapshot，不是編輯裝備清單裡的某一筆既有
              紀錄。GearForm 存檔後會建立新紀錄並設成目前使用中的
              snapshot（saveProduct 對 sunscreen 品類的既有行為）。
            -->
            <GearForm :product-id="null" @saved="handleSaved" />
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
  background: rgb(0 0 0 / 42%);
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
  background: var(--surface-primary);
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

.sheet__header h2 {
  margin: 0;
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
