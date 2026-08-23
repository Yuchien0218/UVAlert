<script setup lang="ts">
import { LoaderCircle } from "@lucide/vue";
import Icon from "../../components/icons/Icon.vue";
import { computed, onMounted, shallowRef } from "vue";
import { useRoute, useRouter } from "vue-router";
import ApplicationTimePicker from "../../components/setup/ApplicationTimePicker.vue";
import ProtectionAdjustmentSheet from "../../components/setup/ProtectionAdjustmentSheet.vue";
import QuickProtectionSummary from "../../components/setup/QuickProtectionSummary.vue";
import SetupStepShell from "../../components/setup/SetupStepShell.vue";
import SetupCompletionSummary from "../../components/setup/SetupCompletionSummary.vue";
import SunscreenClaimQuickQuestion from "../../components/setup/SunscreenClaimQuickQuestion.vue";
import WaterStartPicker from "../../components/setup/WaterStartPicker.vue";
import { useSetup } from "../../composables/useSetup";
import { useWebAppServices } from "../../app/injection";
import type {
  ProtectionDraftInput,
  WaterStartFormValue
} from "../../features/setup/createSetupController";
import type { ProductClaimAnswer } from "../../features/setup/productSnapshot";
import { isFixedEvening } from "../../features/uv/uvForecastRules";
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
const sunscreenClaim = shallowRef<ProductClaimAnswer | null>(null);

/** 已經在裝備頁確認過標示的人不必再被問一次。 */
const needsSunscreenClaim = computed(
  () => productSettings.snapshot.value === null
);

/**
 * 夜間建立提醒時說明一下，但**不阻擋**。
 *
 * 夜間登山、清晨四點出發、人工 UV 都是合法情境；設定流程剛拿掉一道
 * 硬關卡，不該再加一道。判定用固定本地時段，離線可用、不需要地區。
 */
const isNight = computed(() => isFixedEvening(new Date()));

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
    waterStart: needsWaterStart.value ? waterStart.value : null,
    ...(needsSunscreenClaim.value && sunscreenClaim.value !== null
      ? { sunscreenClaim: sunscreenClaim.value }
      : {})
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
    "提醒部位已更新，請重新確認實際塗抹時間。";
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
      localError.value = "時間尚未儲存，請確認後再試一次。";
      return;
    }
  }

  // 裝備頁改為清單後，這條次要入口要直接落在新增表單上。
  await router.push({
    name: "product-new",
    query: { returnTo: "/setup/timing" }
  });
}

function validateForm(): string | null {
  if (needsSunscreenClaim.value && sunscreenClaim.value === null) {
    return "請先回答包裝上有沒有防曬或 SPF 標示。";
  }
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
  // 摘要要顯示防曬乳包裝標示與資格警示，需先載入目前防曬乳。
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
    title="塗抹時間與開始防曬提醒"
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
      <!-- 夜間只是說明，不阻擋建立。 -->
      <p v-if="isNight" class="night-notice" role="status">
        現在是夜間，這個時段紫外線通常很低。仍然可以建立提醒——如果你正要夜間出發或想先設定好，直接繼續即可。
      </p>

      <SunscreenClaimQuickQuestion
        v-if="needsSunscreenClaim"
        v-model="sunscreenClaim"
      />

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
      <!--
        裝備頁不再是必經關卡，改為想填完整標示時使用的次要入口。
        包裝有較短的補擦分鐘數時才需要走這條，否則預設 120 分鐘。
      -->
      <button
        v-if="needsSunscreenClaim"
        class="text-link"
        type="button"
        @click="goToProducts"
      >
        改為填寫完整的防曬乳包裝標示
        <Icon name="tool-arrow-right" :size="20" />
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
        {{ setup.phase.value === 'submitting' ? '開始防曬提醒中…' : '開始防曬提醒' }}
      </button>
    </template>

    <p v-if="setup.submitError.value" class="form-error" role="alert">
      {{
        setup.submitError.value === "active_session_conflict"
          ? "另一個提醒已經開始；請先查看目前提醒。"
          : setup.submitError.value === "persistence_error"
            ? "資料沒有完整儲存，因此這次提醒尚未開始。畫面輸入仍會保留，可以再試一次。"
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

.night-notice {
  margin: 0;
  padding: var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--color-untimed-soft, var(--surface-raised));
  color: var(--text-secondary);
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
