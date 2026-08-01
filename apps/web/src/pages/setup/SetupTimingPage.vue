<script setup lang="ts">
import { ArrowRight } from "@lucide/vue";
import { computed, onMounted, shallowRef } from "vue";
import { useRoute, useRouter } from "vue-router";
import ApplicationTimePicker from "../../components/setup/ApplicationTimePicker.vue";
import ProtectionAdjustmentSheet from "../../components/setup/ProtectionAdjustmentSheet.vue";
import QuickProtectionSummary from "../../components/setup/QuickProtectionSummary.vue";
import SetupStepShell from "../../components/setup/SetupStepShell.vue";
import WaterStartPicker from "../../components/setup/WaterStartPicker.vue";
import { useSetup } from "../../composables/useSetup";
import type {
  ProtectionDraftInput,
  WaterStartFormValue
} from "../../features/setup/createSetupController";
import {
  makeQuickProtectionDraft,
  type QuickProtectionDraft
} from "../../features/setup/setupCatalog";

const setup = useSetup();
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

async function next(): Promise<void> {
  localError.value = validateForm();
  if (localError.value !== null || applicationTime.value === null) {
    return;
  }

  const saved = await setup.saveTiming({
    appliedAt: applicationTime.value,
    waterStart: needsWaterStart.value ? waterStart.value : null
  });
  if (saved) {
    await router.push({ name: "setup-review" });
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
    "追蹤部位與防護方式已更新，請重新確認實際塗抹時間。";
  showProtectionAdjustment.value = false;

  if (!setup.hasTopicalZones.value) {
    await router.push({ name: "setup-review" });
  }
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
  await setup.ensureRecommendedProtection();
  if (route.query.adjustProtection === "1") {
    await openProtectionAdjustment();
  }
});
</script>

<template>
  <SetupStepShell
    :step="2"
    eyebrow="Setup / Time"
    title="實際塗抹時間"
    description="確認這些部位實際塗抹的時間，用來建立本次提醒。產品標示請在產品頁設定。"
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

    <template #actions>
      <button
        v-if="hasConfirmedProtection"
        class="button button--primary"
        type="button"
        @click="next"
      >
        下一步
        <ArrowRight :size="18" aria-hidden="true" />
      </button>
    </template>
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
</style>
