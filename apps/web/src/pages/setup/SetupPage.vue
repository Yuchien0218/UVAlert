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
import WaterStartPicker from "../../components/setup/WaterStartPicker.vue";
import { useSetup } from "../../composables/useSetup";
import { useWebAppServices } from "../../app/injection";
import type {
  ProtectionDraftInput,
  WaterStartFormValue
} from "../../features/setup/createSetupController";
import { describeSetupSaveFailure } from "../../features/setup/describeSetupSaveFailure";
import { isFixedEvening } from "../../features/uv/uvForecastRules";
import {
  CONTEXT_ICONS,
  CONTEXT_LABELS,
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

/**
 * 還沒有保存過產品標示的人，才顯示「填寫完整包裝標示」的次要入口。
 *
 * 2026-08-30：這個旗標原本還兼職控制「包裝上有明確的防曬或 SPF 標示嗎？」
 * 那張卡。那題已經移除——reducer 改成「不知道」也給 120 分鐘保守預設之
 * 後，三個答案在這個流程裡會得到完全相同的結果，它不再影響任何事。
 */
const hasNoSavedProductLabel = computed(
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

/**
 * 已選好的情境收成一行摘要 ＋「更改」（2026-08-31 使用者裁決）。
 *
 * 這一頁已經有兩層漸進揭露，所以「太長」不是沒收合，是**收合之後仍然長**
 * ——選完的東西沒有收起來。四格情境選擇器在選好之後仍然全部常駐，那四格
 * 佔掉的高度此刻只剩「想改」這一個用途。
 *
 * 收起來之後**回頭修改的路徑必須夠明顯**，否則就是把已完成的決定藏起來。
 * 摘要那一行本身就寫著目前選了什麼，旁邊直接是「更改」，不需要先想起
 * 「這個要去哪裡改」。
 */
const editingContext = shallowRef(false);

/**
 * 選好情境之後、選擇器還在收尾的那一小段。
 *
 * 少了這個旗標就沒有辦法延後——`contextSettled` 一旦為真，選擇器立刻消失。
 * 實測那是約 400px 的內容硬切成一行 39px 的摘要（使用者：「選項收合的很
 * 突然」）。真正的收合時間點由 `ContextSelector` 自己決定，它收乾淨之後發
 * `settled`。
 *
 * **儲存不受影響**：下面那個 watch 照樣立刻存檔，這裡延後的只有畫面。
 */
const contextSettling = shallowRef(false);

const showContextSelector = computed(
  () =>
    !contextSettled.value || editingContext.value || contextSettling.value
);

function handleContextSettled(): void {
  contextSettling.value = false;
  editingContext.value = false;
}

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
  contextSettling.value = true;
  try {
    await setup.ensureLoaded();
    if (await setup.saveContext(value)) {
      await setup.ensureRecommendedProtection();
    }
  } catch (error) {
    localError.value = describeSetupSaveFailure(error);
  }
});

/**
 * 2026-08-31：送出失敗時把使用者帶到出問題的欄位（使用者要求）。
 *
 * 原本三種驗證失敗都只是在**頁面最下方**印一行紅字。「請確認這次實際的
 * 塗抹時間」這一句離塗抹時間卡有整整一個畫面遠，使用者的原話是「不然
 * 使用者不知道哪裡沒寫」。
 *
 * 現在做三件事，缺一不可：訊息移到欄位旁（`ApplicationTimePicker` 的
 * `error` prop）、卡片上紅框、**捲過去並把焦點送進去**。只捲不 focus 的話
 * 鍵盤與螢幕閱讀器使用者的位置沒有跟著移動，等於只修好了滑鼠那一半。
 */
const applicationTimePicker = shallowRef<InstanceType<
  typeof ApplicationTimePicker
> | null>(null);

/** 塗抹時間那一欄的錯誤；null 代表這一欄目前沒問題。 */
const applicationTimeError = shallowRef<string | null>(null);

/* 一填就把紅框收掉，不必等再送出一次才知道問題解決了。 */
watch(applicationTime, (value) => {
  if (value !== null) applicationTimeError.value = null;
});

function focusApplicationTime(): void {
  const picker = applicationTimePicker.value;
  if (picker === null) return;
  picker.$el?.scrollIntoView?.({ block: "center", behavior: "smooth" });
  picker.focus();
}

/**
 * 入水時間也走同一套（2026-09-03）。
 *
 * 上面那段註解裡「其他兩種仍走頁尾」的欠帳，這裡還掉入水時間那一筆。
 * 這張卡初始是**兩顆都沒選**，卡片上又沒有一句話說要選——錯誤再印到
 * 畫面另一端，等於使用者按了開始卻不知道發生什麼事。
 */
const waterStartPicker = shallowRef<InstanceType<
  typeof WaterStartPicker
> | null>(null);

/** 入水時間那一欄的錯誤；null 代表這一欄目前沒問題。 */
const waterStartError = shallowRef<string | null>(null);

/* 一選就把紅框收掉，理由同塗抹時間。 */
watch(waterStart, (value) => {
  if (value !== null) waterStartError.value = null;
});

/*
 * 兩個來源合一：本頁的前端驗證（沒選）與控制器回傳的 `fieldErrors`
 * （例如入水早於塗抹）。兩者都該落在同一張卡上，不是一個在卡上、
 * 一個在頁尾。
 */
const waterStartFieldError = computed<string | null>(
  () => waterStartError.value ?? setup.fieldErrors.value.waterStart?.[0] ?? null
);

function focusWaterStart(): void {
  const picker = waterStartPicker.value;
  if (picker === null) return;
  picker.$el?.scrollIntoView?.({ block: "center", behavior: "smooth" });
  picker.focus();
}

async function submit(): Promise<void> {
  applicationTimeError.value = null;
  waterStartError.value = null;
  localError.value = validateForm();

  /*
   * 塗抹時間的錯誤**只在欄位旁邊出現一次**，不同時印在頁尾——同一句話出現
   * 兩次會讓人以為是兩個問題。其他兩種（情境、入水時間）仍走頁尾，它們的
   * 欄位還沒有各自的錯誤位置，等 18.7 的全站盤點一起處理。
   */
  if (applicationTime.value === null && context.value !== null) {
    applicationTimeError.value = localError.value;
    localError.value = null;
    focusApplicationTime();
    return;
  }

  if (needsWaterStart.value && waterStart.value === null) {
    waterStartError.value = localError.value;
    localError.value = null;
    focusWaterStart();
    return;
  }

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
}

function validateForm(): string | null {
  if (context.value === null) {
    return "請先選擇最符合目前狀況的情境。";
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
  localError.value = null;
  /*
   * 「重新開始」產生的是全新草稿，跟第一次進這頁是同一種狀態，所以預設
   * 情境也要跟著套用——不補這一行的話，走回復流程再重來的人會看到一個
   * 什麼都沒選的格子，跟直接進來的人不一樣。
   */
  applyDefaultContext();
}

/**
 * 「回上一頁」**不刪草稿**——這是 2026-08-30 的裁決（見
 * docs/decisions/2026-08-30-pending-decisions.md 第二節）。
 *
 * 原本這裡是 `cancel()`，會呼叫 `setup.cancel()` → `deleteDraft()`。按鈕
 * 文案改成「回上一頁」之後還刪資料，等於用一個看起來安全的按鈕做破壞性
 * 動作，比原本誠實標著「取消設定」的叉叉更糟。
 *
 * 保留草稿不需要新機制：`ensureLoaded()` 只要讀得到 active draft 就會把
 * `recoveryPending` 設成 true，下次進來由既有的「繼續未完成的設定？」
 * 回復卡接手（`continueDraft` ／ `restartDraft`）。這段機制本來就在，
 * 只是先前被叉叉的刪除行為繞過了。
 *
 * 目的地明確寫成 home 而不是 `router.back()`，跟 EventCorrectionPage 的
 * 返回一致——history 可能是空的（直接開網址、從通知進來），back 會把人
 * 送出 App。用 replace 是為了不讓 /setup 堆進歷史。
 */
async function back(): Promise<void> {
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

/**
 * 全新的草稿預設「一般戶外」（2026-08-30 裁決）。它是最常見的情境，預選
 * 可以讓多數人少一次點擊。
 *
 * 三個條件缺一不可：
 * - 草稿已載入成功（phase 不是 error）——否則 saveContext 會丟例外
 * - 草稿還沒有情境（context 為 null）——**不能覆蓋使用者原本選過的**
 * - 不在「繼續未完成的設定？」的回復流程裡——那時畫面顯示的是回復卡，
 *   不是選擇器，先幫他選好會讓「重新開始」的語意變得不清楚
 *
 * 寫進 selectedContext 之後由既有的 watch 負責存檔與揭露後半段，這裡不
 * 重複那段邏輯。選擇器上會顯示為已選取，使用者看得出系統代選了什麼。
 */
function applyDefaultContext(): void {
  if (context.value !== null) return;
  if (setup.phase.value === "error") return;
  if (setup.recoveryPending.value) return;
  selectedContext.value = "outdoor_general";
}

onMounted(async () => {
  await Promise.all([setup.ensureLoaded(), productSettings.ensureLoaded()]);
  if (context.value !== null) {
    await setup.ensureRecommendedProtection();
  }
  applyDefaultContext();
  if (route.query.adjustProtection === "1") {
    await openProtectionAdjustment();
  }
});
</script>

<template>
  <SetupStepShell
    title="開始防曬提醒"
    description="選擇情境與塗抹時間"
    :save-status="setup.saveStatus.value"
    :busy="setup.phase.value === 'loading'"
    @back="back"
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
      <h2 data-typography-role="card-title">目前無法開始設定</h2>
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
      <ContextSelector
        v-if="showContextSelector"
        v-model="selectedContext"
        @settled="handleContextSettled"
      />

      <!--
        2026-08-31：摘要列補上情境圖示（使用者要求）。

        收合之後這一行是整個情境步驟僅剩的視覺，只有兩段文字；補上圖示
        之後它跟展開時的 ContextSelector 用同一顆幾何，讀者知道收起來的
        是哪一個選項，而不只是讀到一個詞。

        24px 而不是選擇器裡的 32px：那裡圖示是卡片主視覺，這裡是一行摘要
        的行內記號（DESIGN.md 第八節的檔位）。
      -->
      <div v-else class="setup-step-summary">
        <!--
          2026-08-31：圖示移到「情境」右邊（使用者要求）。

          原本是 `[icon] 情境 一般戶外`——圖示貼在欄位標籤前面，但它畫的是
          **值**（一般戶外那顆山），不是「情境」這個欄位。移到標籤右邊之後
          變成 `情境 [icon] 一般戶外`，圖示緊貼著它所描述的那個詞。
        -->
        <p class="setup-step-summary__value">
          <span class="setup-step-summary__label">情境</span>
          <Icon
            v-if="context !== null"
            class="setup-step-summary__icon"
            :name="CONTEXT_ICONS[context]"
            :size="24"
          />
          {{ context === null ? "" : CONTEXT_LABELS[context] }}
        </p>
        <button class="text-link" type="button" @click="editingContext = true">
          更改
        </button>
      </div>

      <p
        v-if="setup.saveStatus.value === 'error'"
        class="form-error"
        role="status"
      >
        設定目前無法儲存；輸入仍會保留，可以再試一次。
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
            現在是夜間，這個時段紫外線通常很低，仍然可以繼續建立提醒。
          </p>

          <ApplicationTimePicker
            ref="applicationTimePicker"
            v-model="applicationTime"
            :error="applicationTimeError"
          />
          <!--
            `applied-at` 讓入水選擇器選不到早於塗抹的時間（2026-09-02
            使用者回報）。控制器的 validateWaterStart 再擋一次打字繞過。
          -->
          <WaterStartPicker
            v-if="needsWaterStart"
            ref="waterStartPicker"
            v-model="waterStart"
            :applied-at="applicationTime"
            :error="waterStartFieldError"
          />

          <ProductEligibilityNotice
            :product-snapshot="productSettings.snapshot.value"
          />

          <!--
            裝備頁不再是必經關卡，改為想填完整標示時使用的次要入口。
          -->
          <button
            v-if="hasNoSavedProductLabel"
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
          ...(setup.fieldErrors.value.product ?? [])
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
            ? "沒有完整儲存，這次提醒尚未開始。輸入仍會保留，可以再試一次。"
            : "部分資料需要重新確認，請返回相應步驟修改。"
      }}
    </p>
  </SetupStepShell>
</template>

<style scoped>
/*
 * 已完成步驟的一行摘要。刻意不做成卡片——它是「已經決定好的事」，不需要
 * 跟還要操作的區塊搶視覺份量；一條 hairline 就足以把它跟下方分開。
 */
.setup-step-summary {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--border-subtle);
}

.setup-step-summary__value {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin: 0;
  min-width: 0;
}

/* dt 型的標籤不得被值壓縮——ProductDetailPage 的 .spec-row 就是這樣被
   擠成一行一個字的（2026-08-31 修過一次，同一個坑不重踩）。 */
.setup-step-summary__label {
  flex: 0 0 auto;
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
}
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
  line-height: var(--line-height-body);
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
  line-height: var(--line-height-body);
}

.update-notice {
  margin: 0;
  padding: var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--color-saved-soft);
  color: var(--text-secondary);
  line-height: var(--line-height-body);
}

/*
 * 2026-08-31：改用夜間的語意色（使用者回報「現在都太像了」）。
 *
 * 原本是 `--surface-soft`，跟這一頁其他說明框同一個底色——所以「現在是
 * 夜間」跟一般說明長得一模一樣，讀者沒有理由多看它一眼。
 *
 * `--color-untimed-soft` 已經是這個 App 的夜間／未計時語意色
 * （`HomeNightNotice` 的圖示就用 `--color-untimed`），沿用同一顆而不是
 * 新增一個顏色：夜間在首頁與設定頁應該是同一件事。
 */
.night-notice {
  margin: 0;
  padding: var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--color-untimed-soft);
  color: var(--text-secondary);
  line-height: var(--line-height-body);
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
