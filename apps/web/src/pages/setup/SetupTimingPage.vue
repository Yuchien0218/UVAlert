<script setup lang="ts">
import { ArrowRight, LoaderCircle } from "@lucide/vue";
import { computed, onMounted, shallowRef } from "vue";
import { useRoute, useRouter } from "vue-router";
import ApplicationTimePicker from "../../components/setup/ApplicationTimePicker.vue";
import ProtectionAdjustmentSheet from "../../components/setup/ProtectionAdjustmentSheet.vue";
import QuickProtectionSummary from "../../components/setup/QuickProtectionSummary.vue";
import SetupStepShell from "../../components/setup/SetupStepShell.vue";
import SetupCompletionSummary from "../../components/setup/SetupCompletionSummary.vue";
import WaterStartPicker from "../../components/setup/WaterStartPicker.vue";
import { useSetup } from "../../composables/useSetup";
import { useWebAppServices } from "../../app/injection";
import type {
  ProtectionDraftInput,
  WaterStartFormValue
} from "../../features/setup/createSetupController";
import {
  makeQuickProtectionDraft,
  type QuickProtectionDraft
} from "../../features/setup/setupCatalog";

const setup = useSetup();
const { productSettings } = useWebAppServices();
const route = useRoute();
const router = useRouter();

const applicationTime = shallowRef<string | null>(
  setup.applicationTime.value
);
const waterStart = shallowRef<WaterStartFormValue | null>(
  setup.waterStart.value
);
const localError = shallowRef<string | null>(null);
const protectionNotice = shallowRef<string | null>(null);
const showProtectionAdjustment = shallowRef(false);

const context = computed(
  () => setup.draft.value?.initialContext ?? null
);
const proposedProtection = computed<QuickProtectionDraft | null>(
  () =>
    context.value === null
      ? null
      : makeQuickProtectionDraft(context.value)
);
const hasConfirmedProtection = computed(
  () => (setup.draft.value?.zones.length ?? 0) > 0
);
const needsWaterStart = computed(
  () => context.value === "water_active"
);

async function submit(): Promise<void> {
  localError.value = validateForm();
  if (localError.value !== null || applicationTime.value === null) {
    return;
  }

  const saved = await setup.saveTiming({
    appliedAt: applicationTime.value,
    waterStart: needsWaterStart.value ? waterStart.value : null
  });
  if (!saved) return;

  const result = await setup.submit();
  if (result.ok) {
    await router.replace({
      name: "reminder",
      query: { started: "1" }
    });
  }
}

async function saveProtection(
  input: ProtectionDraftInput
): Promise<void> {
  if (!(await setup.saveProtection(input))) return;
  applicationTime.value = null;
  waterStart.value = null;
  localError.value = null;
  protectionNotice.value =
    "追蹤部位已更新，請重新確認實際塗抹時間。";
  showProtectionAdjustment.value = false;
}

async function acceptQuickProtection(): Promise<void> {
  if (proposedProtection.value === null) return;
  await saveProtection({
    ...proposedProtection.value,
    zones: proposedProtection.value.zones
  });
  protectionNotice.value = null;
}

async function openProtectionAdjustment(): Promise<void> {
  if (
    !hasConfirmedProtection.value &&
    proposedProtection.value !== null
  ) {
    const prepared = await setup.saveProtection({
      ...proposedProtection.value,
      presetDecision: "adjusted"
    });
    if (!prepared) return;
  }
  showProtectionAdjustment.value = true;
  protectionNotice.value = null;
}

async function goToProducts(): Promise<void> {
  if (applicationTime.value !== null) {
    const saved = await setup.savePendingTiming({
      appliedAt: applicationTime.value,
      waterStart: needsWaterStart.value ? waterStart.value : null
    });
    if (!saved) {
      localError.value = "時間尚未保存，請確認後再試一次。";
      return;
    }
  }

  await router.push({
    name: "products",
    query: { returnTo: "/setup/timing" }
  });
}

function validateForm(): string | null {
  if (applicationTime.value === null) {
    return "請確認這次實際的塗抹時間。";
  }
  if (needsWaterStart.value && waterStart.value === null) {
    return "請確認實際入水時間，或選擇不確定。";
  }
  return null;
}

async function cancel(): Promise<void> {
  await setup.cancel();
  await router.replace({ name: "reminder" });
}

onMounted(async () => {
  // 摘要要顯示產品包裝標示與資格警示，需先載入目前產品。
  await Promise.all([
    setup.ensureRecommendedProtection(),
    productSettings.ensureLoaded()
  ]);
  if (route.query.adjustProtection === "1") {
    await openProtectionAdjustment();
  }
});
</script>

<template>
  <SetupStepShell
    :step="2"
    :max-step="2"
    title="塗抹時間與開始提醒"
    description="確認實際塗抹時間；摘要中若有誤，可返回步驟 1 重新選擇。"
    back-to="/setup/context"
    :save-status="setup.saveStatus.value"
    @cancel="cancel"
  >
    <QuickProtectionSummary
      v-if="context && proposedProtection"
      :context="context"
      :zones="
        hasConfirmedProtection && setup.draft.value
          ? setup.draft.value.zones
          : proposedProtection.zones
      "
      :pending="!hasConfirmedProtection"
      @accept="acceptQuickProtection"
      @adjust="openProtectionAdjustment"
    />

    <ProtectionAdjustmentSheet
      v-if="
        context &&
        setup.draft.value
      "
      :open="showProtectionAdjustment"
      :context="context"
      :draft="setup.draft.value"
      @save="saveProtection"
      @close="showProtectionAdjustment = false"
    />

    <p
      v-if="protectionNotice"
      class="update-notice"
      role="status"
    >
      {{ protectionNotice }}
    </p>

    <template v-if="hasConfirmedProtection">
      <ApplicationTimePicker v-model="applicationTime" />
      <WaterStartPicker
        v-if="needsWaterStart"
        v-model="waterStart"
      />

      <p v-if="localError" class="form-error" role="alert">
        {{ localError }}
      </p>
      <p
        v-for="message in [
          ...(setup.fieldErrors.value.appliedAt ?? []),
          ...(setup.fieldErrors.value.product ?? []),
          ...(setup.fieldErrors.value.waterStart ?? [])
        ]"
        :key="message"
        class="form-error"
        role="alert"
      >
        {{ message }}
      </p>
      <button
        v-if="(setup.fieldErrors.value.product ?? []).length > 0"
        class="text-link"
        type="button"
        @click="goToProducts"
      >
        前往產品頁設定
        <ArrowRight :size="17" aria-hidden="true" />
      </button>
    </template>

    <!-- 摘要區塊（確認前必看，AC-34 Scenario B）-->
    <SetupCompletionSummary
      v-if="hasConfirmedProtection && setup.draft.value"
      :draft="setup.draft.value"
      :application-time="applicationTime"
      :product-snapshot="productSettings.snapshot.value"
      :water-start="needsWaterStart ? waterStart : null"
    />

    <template #actions>
      <button
        v-if="hasConfirmedProtection"
        class="button button--primary"
        type="button"
        :disabled="setup.phase.value === 'submitting'"
        @click="submit"
      >
        <LoaderCircle v-if="setup.phase.value === 'submitting'" :size="18" class="spinner" />
        {{ setup.phase.value === 'submitting' ? '開始提醒中…' : '開始提醒' }}
      </button>
    </template>

    <p v-if="setup.submitError.value" class="form-error" role="alert">
      {{
        setup.submitError.value === "active_session_conflict"
          ? "另一個提醒已經開始；請先查看目前提醒。"
          : setup.submitError.value === "persistence_error"
            ? "資料沒有完整保存，因此這次提醒尚未開始。畫面輸入仍會保留，可以再試一次。"
            : "部分資料需要重新確認，請返回相應步驟修改。"
      }}
    </p>
  </SetupStepShell>
</template>

<style scoped>
.update-notice {
  margin: 0;
  padding: var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--color-success-soft);
  color: var(--text-secondary);
  line-height: 1.7;
}

.form-error {
  margin: 0;
  color: var(--color-due);
  line-height: 1.7;
}

.spinner {
  animation: spin 1s linear infinite;
  margin-right: 0.5em;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
