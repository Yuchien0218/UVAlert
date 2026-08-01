<script setup lang="ts">
import { ArrowRight, LoaderCircle } from "@lucide/vue";
import { computed } from "vue";
import { useRouter } from "vue-router";
import SetupReviewSummary from "../../components/setup/SetupReviewSummary.vue";
import SetupStepShell from "../../components/setup/SetupStepShell.vue";
import { useSetup } from "../../composables/useSetup";

const setup = useSetup();
const router = useRouter();

const submitMessage = computed(() => {
  switch (setup.submitError.value) {
    case "active_session_conflict":
      return "另一個提醒已經開始；請先查看目前提醒。";
    case "persistence_error":
      return "資料沒有完整保存，因此這次提醒尚未開始。畫面輸入仍會保留，可以再試一次。";
    case "validation_error":
      return "部分資料需要重新確認，請返回相應步驟修改。";
    default:
      return null;
  }
});

async function submit(): Promise<void> {
  const result = await setup.submit();
  if (result.ok) {
    await router.replace({
      name: "reminder",
      query: { started: "1" }
    });
  }
}

async function cancel(): Promise<void> {
  await setup.cancel();
  await router.replace({ name: "reminder" });
}
</script>

<template>
  <SetupStepShell
    v-if="setup.draft.value"
    :step="3"
    eyebrow="Setup / Review"
    title="確認這次提醒"
    description="請檢查情境、追蹤部位、防護方式、產品與實際塗抹時間。"
    back-to="/setup/timing"
    :save-status="setup.saveStatus.value"
    :busy="setup.phase.value === 'submitting'"
    @cancel="cancel"
  >
    <SetupReviewSummary
      :draft="setup.draft.value"
      :application-time="setup.applicationTime.value"
      :water-start="setup.waterStart.value"
    />

    <p class="safety-note">
      顯示的時間是檢查／補擦提醒，不代表安全曝曬時間。
    </p>

    <aside
      v-if="submitMessage"
      class="submit-error"
      role="alert"
    >
      <strong>提醒尚未建立</strong>
      <p>{{ submitMessage }}</p>
    </aside>

    <template #actions>
      <button
        class="button button--primary"
        type="button"
        :disabled="setup.phase.value === 'submitting'"
        @click="submit"
      >
        <LoaderCircle
          v-if="setup.phase.value === 'submitting'"
          class="spin"
          :size="18"
          aria-hidden="true"
        />
        <template v-else>
          開始提醒
          <ArrowRight :size="18" aria-hidden="true" />
        </template>
      </button>
      <RouterLink
        class="button button--quiet"
        to="/setup/timing"
      >
        返回修改
      </RouterLink>
    </template>
  </SetupStepShell>
</template>

<style scoped>
.submit-error {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-4);
  border: 1px solid var(--color-due);
  border-radius: var(--radius-md);
  background: var(--color-due-soft);
}

.submit-error p {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.7;
}

button:disabled {
  cursor: wait;
  opacity: 0.6;
}

.spin {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
