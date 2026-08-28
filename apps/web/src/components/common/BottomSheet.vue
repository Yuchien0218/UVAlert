<script setup lang="ts">
import { useTemplateRef } from "vue";
import { useOverlay } from "../../composables/useOverlay";
import Icon from "../icons/Icon.vue";

interface Props {
  open: boolean;
  title: string;
  labelledById: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{ close: [] }>();
defineSlots<{
  default(): unknown;
  footer?(): unknown;
}>();

const dialog = useTemplateRef<HTMLElement>("dialog");

function close(): void {
  emit("close");
}

const { closeFromBackdrop } = useOverlay({
  open: () => props.open,
  container: dialog,
  onClose: close
});
</script>

<template>
  <Teleport to="body">
    <Transition name="bottom-sheet">
      <div
        v-if="open"
        class="bottom-sheet__layer"
        data-overlay-root
        @click.self="closeFromBackdrop"
      >
        <section
          ref="dialog"
          class="bottom-sheet"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="labelledById"
          tabindex="-1"
        >
          <header class="bottom-sheet__header">
            <h2
              :id="labelledById"
              data-typography-role="section-title"
              style="min-width: 0"
            >
              {{ title }}
            </h2>
            <button
              class="icon-button"
              type="button"
              aria-label="關閉"
              @click="close"
            >
              <Icon name="tool-close" :size="24" />
            </button>
          </header>

          <div class="bottom-sheet__body">
            <slot />
            <footer v-if="$slots.footer" class="bottom-sheet__footer">
              <slot name="footer" />
            </footer>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.bottom-sheet__layer {
  position: fixed;
  z-index: var(--z-overlay);
  inset: 0;
  display: grid;
  align-items: end;
  background: var(--overlay-backdrop);
}

.bottom-sheet {
  display: grid;
  width: min(100%, 47rem);
  max-height: min(88svh, 52rem);
  min-height: 0;
  grid-template-rows: auto minmax(0, 1fr);
  justify-self: center;
  overflow: hidden;
  border: 1px solid var(--border-subtle);
  border-bottom: 0;
  border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;
  background: var(--surface-overlay);
}

.bottom-sheet__header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-5);
  border-bottom: 1px solid var(--border-subtle);
}

.bottom-sheet__header h2 {
  margin: 0;
  font-size: var(--font-size-section-title);
}

.bottom-sheet__body {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: var(--space-5) var(--space-5)
    max(var(--space-5), env(safe-area-inset-bottom));
}

.bottom-sheet__footer {
  margin-top: var(--space-4);
}

@media (prefers-reduced-motion: no-preference) {
  .bottom-sheet-enter-active,
  .bottom-sheet-leave-active {
    transition: opacity var(--duration-fast) var(--ease-out);
  }

  .bottom-sheet-enter-from,
  .bottom-sheet-leave-to {
    opacity: 0;
  }
}

@media (min-width: 48rem) {
  .bottom-sheet__layer {
    align-items: center;
    padding: var(--space-6);
  }

  .bottom-sheet {
    max-height: min(88vh, 52rem);
    border-bottom: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
  }
}
</style>
