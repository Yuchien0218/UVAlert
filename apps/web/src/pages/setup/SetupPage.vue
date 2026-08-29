<script setup lang="ts">
import Icon from "../../components/icons/Icon.vue";
import InlineLoader from "../../components/feedback/InlineLoader.vue";
import { computed, onMounted, shallowRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { SessionContext } from "@sunshield/contracts";
import ApplicationTimePicker from "../../components/setup/ApplicationTimePicker.vue";
import ContextSelector from "../../components/setup/ContextSelector.vue";
import GearFormSheet from "../../components/setup/GearFormSheet.vue";
import ProductEligibilityNotice from "../../components/setup/ProductEligibilityNotice.vue";
import ProtectionAdjustmentSheet from "../../components/setup/ProtectionAdjustmentSheet.vue";
import QuickProtectionSummary from "../../components/setup/QuickProtectionSummary.vue";
import SetupStepShell from "../../components/setup/SetupStepShell.vue";
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

/**
 * 設定提醒——單一頁面。
 *
 * 2026-08-24 使用者裁決：原本 `/setup/context` 與 `/setup/timing` 兩步，
 * 合併成這一頁，理由是「減少跳轉的疲倦感」。舊的兩條路由依 2026-08-08
 * 的前例直接移除，不留轉址（P0 未上線、沒有外部連結要相容）。
 *
 * **domain 與契約沒有動。** `SetupDraftV1.currentStep` 仍然保留——它是
 * 持久化的草稿欄位，用來讓「繼續未完成的設定」知道進行到哪；controller
 * 的 saveContext／saveProtection／saveTiming／submit 本來就是各自獨立的
 * 操作，不依賴頁面切換，所以只需要合併 UI。
 *
 * 版面採漸進揭露：先選情境，選完才顯示部位、塗抹時間與開始按鈕——一次
 * 攤開全部會讓這頁比原本兩頁加起來還長，違背合併的初衷。
 */

const setup = useSetup();
const { productSettings } = useWebAppServices();
const route = useRoute();
const router = useRouter();

const selectedContext = shallowRef<SessionContext | null>(null);
const applicationTime = shallowRef<string | null>(setup.applicationTime.value);
const waterStart = shallowRef<WaterStartFormValue | null>(
  setup.waterStart.value
);
const localError = shallowRef<string | null>(null);
const protectionNotice = shallowRef<string | null>(null);
const showProtectionAdjustment = shallowRef(false);
const showGearForm = shallowRef(false);
const sunscreenClaim = shallowRef<ProductClaimAnswer | null>(null);

/** 已經在裝備頁確認過標示的人不必再被問一次。 */
const needsSunscreenClaim = computed(
  () => productSettings.snapshot.value === null
);

/**
 * 夜間建立提醒時說明一下，但**不阻擋**。
 *
 * 夜間登山、清晨四點出發、人工 UV 都是合法情境；設定流程刻意不加硬關卡。
 */
const isNight = computed(() => isFixedEvening(new Date()));

const context = computed(() => setup.draft.value?.initialContext ?? null);
const proposedProtection = computed<QuickProtectionDraft | null>(() =>
  context.value === null ? null : makeQuickProtectionDraft(context.value)
);
const hasConfirmedProtection = computed(
  () => (setup.draft.value?.zones.length ?? 0) > 0
);
const needsWaterStart = computed(() => context.value === "water_active");

/** 選好情境後才顯示後半段，避免一次攤開整頁。 */
const contextSettled = computed(() => context.value !== null);

watch(
  () => setup.draft.value?.initialContext ?? null,
  (value) => {
    selectedContext.value = value;
  },
  { immediate: true }
);

/**
 * 選了情境就立刻存檔並揭露後半段——單頁沒有「下一步」按鈕可以觸發儲存。
 * 只有真的改變時才寫入，避免把 draft 載入時的同步值當成使用者操作。
 *
 * 這裡一定要先 await ensureLoaded()：草稿是由 controller 的載入流程建立的，
 * 沒有草稿時 saveContext 會直接丟 SetupValidationError（requireDraft）。
 * 使用者在載入完成前就點情境，或載入本身失敗過（例如本機儲存讀取失敗），
 * 都會走到這條路徑——2026-08-24 實際發生過：例外沒被接住變成 unhandled
 * rejection，畫面既不揭露後半段也不顯示任何錯誤，看起來就像點了沒反應。
 */
watch(selectedContext, async (value, previous) => {
  if (value === null || value === previous) return;
  if (value === context.value) return;
  localError.value = null;
  try {
    await setup.ensureLoaded();
    if (await setup.saveContext(value)) {
      await setup.ensureRecommendedProtection();
    }
  } catch {
    localError.value = "設定內容目前無法儲存，請重新整理後再試一次。";
  }
});

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
    await router.replace({ name: "home" });
  }
}

async function saveProtection(input: ProtectionDraftInput): Promise<void> {
  if (!(await setup.saveProtection(input))) return;
  applicationTime.value = null;
  waterStart.value = null;
  localError.value = null;
  protectionNotice.value = "提醒部位已更新，請重新確認實際塗抹時間。";
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
  if (!hasConfirmedProtection.value && proposedProtection.value !== null) {
    const prepared = await setup.saveProtection({
      ...proposedProtection.value,
      presetDecision: "adjusted"
    });
    if (!prepared) return;
  }
  showProtectionAdjustment.value = true;
  protectionNotice.value = null;
}

/**
 * 開啟完整標示表單 sheet。同頁開合，不導頁——Sitemap §2.2「不因產品標示
 * 跳離到平行頁面；必要的調整以同頁區塊或 sheet 呈現」。
 */
function openGearForm(): void {
  showGearForm.value = true;
}

function handleGearFormSaved(): void {
  showGearForm.value = false;
  sunscreenClaim.value = null;
}

function validateForm(): string | null {
  if (context.value === null) {
    return "請先選擇最符合目前狀況的情境。";
  }
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

async function continueDraft(): Promise<void> {
  setup.resumeDraft();
}

async function restartDraft(): Promise<void> {
  await setup.restartDraft();
  selectedContext.value = null;
  applicationTime.value = null;
  waterStart.value = null;
  sunscreenClaim.value = null;
  localError.value = null;
}

async function cancel(): Promise<void> {
  await setup.cancel();
  await router.replace({ name: "home" });
}

/**
 * 草稿載入失敗後的復原手段。controller 的 `loaded` 旗標在失敗時仍是
 * false，但重跑 ensureLoaded 需要整個 app 的 boot 也重新來過，整頁重載
 * 是最可靠的方式（也跟提醒頁的「重新讀取」一致）。
 */
function reload(): void {
  globalThis.location.reload();
}

onMounted(async () => {
  await Promise.all([setup.ensureLoaded(), productSettings.ensureLoaded()]);
  if (context.value !== null) {
    await setup.ensureRecommendedProtection();
  }
  if (route.query.adjustProtection === "1") {
    await openProtectionAdjustment();
  }
});
</script>

<template>
  <SetupStepShell
    title="開始防曬提醒"
    description="選擇情境與實際塗抹時間，就能開始倒數。"
    :save-status="setup.saveStatus.value"
    :busy="setup.phase.value === 'loading'"
    @cancel="cancel"
  >
    <!--
      載入草稿失敗時要明講。原本這裡直接顯示情境選擇器，但草稿沒載進來
      的話怎麼選都不會有反應（2026-08-24 實際發生過的靜默失敗）。
    -->
    <section
      v-if="setup.phase.value === 'error'"
      class="load-error app-card"
      role="alert"
    >
      <h2 data-typography-role="section-title">目前無法開始設定</h2>
      <p>
        讀取這台裝置上的設定草稿時發生問題。已經記錄的提醒與裝備不會受影響；請重新整理後再試一次。
      </p>
      <button class="button button--primary" type="button" @click="reload">
        <Icon name="tool-refresh" :size="20" />
        重新整理
      </button>
    </section>

    <section
      v-else-if="setup.recoveryPending.value"
      class="recovery-card app-card"
    >
      <p class="recovery-card__eyebrow">尚未建立提醒</p>
      <h2
        class="recovery-card__title"
        data-typography-role="card-title"
        data-typography-exception="setup-recovery-headline"
      >
        繼續未完成的設定？
      </h2>
      <p>這份設定尚未建立提醒。你可以接著完成，或重新開始。</p>
      <div class="button-group">
        <button
          class="button button--primary"
          type="button"
          @click="continueDraft"
        >
          繼續設定
          <Icon name="tool-arrow-right" :size="20" />
        </button>
        <button
          class="button button--quiet"
          type="button"
          @click="restartDraft"
        >
          <Icon name="tool-reset" :size="20" />
          重新開始
        </button>
      </div>
    </section>

    <template v-else>
      <ContextSelector v-model="selectedContext" />

      <p
        v-if="setup.saveStatus.value === 'error'"
        class="form-error"
        role="status"
      >
        設定內容目前無法儲存；畫面內容仍會保留，你可以再試一次。
      </p>

      <!-- 選好情境才揭露後半段，避免整頁一次攤開。 -->
      <template v-if="contextSettled">
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

        <p v-if="protectionNotice" class="update-notice" role="status">
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
          <WaterStartPicker v-if="needsWaterStart" v-model="waterStart" />

          <ProductEligibilityNotice
            :product-snapshot="productSettings.snapshot.value"
          />

          <!--
            裝備頁不再是必經關卡，改為想填完整標示時使用的次要入口。
          -->
          <button
            v-if="needsSunscreenClaim"
            class="text-link"
            type="button"
            @click="openGearForm"
          >
            改為填寫完整的防曬乳包裝標示
            <Icon name="tool-arrow-right" :size="20" />
          </button>
        </template>
      </template>

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
        設定流程唯一的安全提示（步驟 2 的對應文字原本在
        SetupCompletionSummary，那張摘要已於 2026-08-24 移除）。不要拿掉。
      -->
      <p class="safety-note">情境只影響提醒間隔，不代表安全曝曬時間。</p>
    </template>

    <ProtectionAdjustmentSheet
      v-if="context && setup.draft.value"
      :open="showProtectionAdjustment"
      :context="context"
      :draft="setup.draft.value"
      @save="saveProtection"
      @close="showProtectionAdjustment = false"
    />

    <GearFormSheet
      :open="showGearForm"
      @close="showGearForm = false"
      @saved="handleGearFormSaved"
    />

    <template v-if="!setup.recoveryPending.value" #actions>
      <button
        v-if="hasConfirmedProtection"
        class="button button--primary"
        type="button"
        :disabled="setup.phase.value === 'submitting'"
        @click="submit"
      >
        <InlineLoader v-if="setup.phase.value === 'submitting'" />
        {{
          setup.phase.value === "submitting"
            ? "開始防曬提醒中…"
            : "開始防曬提醒"
        }}
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
.recovery-card,
.load-error {
  display: grid;
  justify-items: start;
  gap: var(--space-4);
  padding: clamp(1.25rem, 6vw, 2rem);
}

.load-error h2,
.load-error p {
  margin: 0;
}

.load-error h2 {
  font-size: var(--font-size-section-title);
}

.load-error p {
  color: var(--text-body);
  line-height: 1.6;
}

.recovery-card__eyebrow {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
  font-weight: 500;
}

.recovery-card h2,
.recovery-card p {
  margin: 0;
}

.recovery-card__title {
  font-size: clamp(1.5rem, 7vw, 2.35rem);
  letter-spacing: var(--letter-spacing-headline);
}

.recovery-card > p:last-of-type {
  color: var(--text-body);
  line-height: 1.6;
}

.update-notice {
  margin: 0;
  padding: var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--color-saved-soft);
  color: var(--text-secondary);
  line-height: 1.6;
}

.night-notice {
  margin: 0;
  padding: var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--surface-soft);
  color: var(--text-secondary);
  line-height: 1.6;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

</style>
