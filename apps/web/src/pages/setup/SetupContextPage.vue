<script setup lang="ts">
import { ArrowRight, RotateCcw } from "@lucide/vue";
import type { SessionContext, SetupDraftStep } from "@sunshield/contracts";
import { onMounted, shallowRef, watch } from "vue";
import { useRouter } from "vue-router";
import ContextSelector from "../../components/setup/ContextSelector.vue";
import SetupStepShell from "../../components/setup/SetupStepShell.vue";
import { useSetup } from "../../composables/useSetup";

const setup = useSetup();
const router = useRouter();
const selectedContext = shallowRef<SessionContext | null>(null);
const localError = shallowRef<string | null>(null);

watch(
  () => setup.draft.value?.initialContext ?? null,
  (context) => {
    selectedContext.value = context;
  },
  { immediate: true }
);

onMounted(() => {
  void setup.ensureLoaded();
});

async function continueDraft(): Promise<void> {
  const step = setup.recommendedResumeStep();
  setup.resumeDraft();
  await router.replace(routeForStep(step));
}

async function restartDraft(): Promise<void> {
  await setup.restartDraft();
  selectedContext.value = null;
  localError.value = null;
}

async function next(): Promise<void> {
  if (selectedContext.value === null) {
    localError.value = "請先選擇最符合目前狀況的情境。";
    return;
  }
  localError.value = null;
  if (await setup.saveContext(selectedContext.value)) {
    await router.push({ name: "setup-timing" });
  }
}

async function cancel(): Promise<void> {
  await setup.cancel();
  await router.replace({ name: "reminder" });
}

function routeForStep(
  step: SetupDraftStep
): { name: string } {
  return {
    name:
      step === "context"
        ? "setup-context"
        : step === "review"
          ? "setup-review"
          : "setup-timing"
  };
}
</script>

<template>
  <SetupStepShell
    :step="1"
    eyebrow="Setup / Context"
    title="你現在主要在哪種情境？"
    description="選擇最符合這次活動的情境；這只會決定接下來要確認哪些資料。"
    :save-status="setup.saveStatus.value"
    :busy="setup.phase.value === 'loading'"
    @cancel="cancel"
  >
    <section
      v-if="setup.recoveryPending.value"
      class="recovery-card app-card"
    >
      <p class="recovery-card__eyebrow">尚未建立提醒</p>
      <h2>繼續未完成的設定？</h2>
      <p>
        這份設定尚未建立提醒。你可以接著完成，或重新開始。
      </p>
      <div class="button-group">
        <button
          class="button button--primary"
          type="button"
          @click="continueDraft"
        >
          繼續設定
          <ArrowRight :size="18" aria-hidden="true" />
        </button>
        <button
          class="button button--quiet"
          type="button"
          @click="restartDraft"
        >
          <RotateCcw :size="17" aria-hidden="true" />
          重新開始
        </button>
      </div>
    </section>

    <template v-else>
      <ContextSelector v-model="selectedContext" />
      <p v-if="localError" class="form-error" role="alert">
        {{ localError }}
      </p>
      <p
        v-if="setup.saveStatus.value === 'error'"
        class="form-error"
        role="status"
      >
        草稿目前無法保存；畫面內容仍會保留，你可以再試一次。
      </p>
    </template>

    <template v-if="!setup.recoveryPending.value" #actions>
      <button
        class="button button--primary"
        type="button"
        :disabled="
          selectedContext === null ||
          setup.saveStatus.value === 'saving'
        "
        @click="next"
      >
        下一步
        <ArrowRight :size="18" aria-hidden="true" />
      </button>
    </template>
  </SetupStepShell>
</template>

<style scoped>
.recovery-card {
  display: grid;
  justify-items: start;
  gap: var(--space-4);
  padding: clamp(1.25rem, 6vw, 2rem);
}

.recovery-card__eyebrow {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 500;
}

.recovery-card h2,
.recovery-card p {
  margin: 0;
}

.recovery-card h2 {
  font-size: clamp(1.5rem, 7vw, 2.35rem);
  font-weight: 500;
  letter-spacing: -0.035em;
}

.recovery-card > p:last-of-type {
  color: var(--text-secondary);
  line-height: 1.7;
}

.form-error {
  margin: 0;
  color: var(--color-due);
  line-height: 1.7;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
