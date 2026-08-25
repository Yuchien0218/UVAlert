<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from "vue";
import type { GearCategory } from "@sunshield/contracts";
import { useWebAppServices } from "../../app/injection";
import Icon from "../icons/Icon.vue";
import ProductSnapshotEditor from "./ProductSnapshotEditor.vue";
import {
  makeSessionOnlyProductSnapshot,
  productSnapshotToFormValue,
  type ProductSnapshotFormValue
} from "../../features/setup/productSnapshot";
import {
  affectsCountdown,
  GEAR_CATEGORY_LABELS,
  GEAR_CATEGORY_REMINDER_EFFECT,
  gearSafetyState
} from "../../features/product/gearPresentation";
import type { IconName } from "../../generated/icons.generated";

/** 跟 GearListItem.vue 用同一組品類圖示對應。 */
const GEAR_CATEGORY_ICONS: Record<GearCategory, IconName> = {
  sunscreen: "gear-sunscreen",
  clothing: "gear-clothing",
  eyewear: "gear-sunglasses",
  other_gear: "gear-other"
};

/**
 * S-12 新增防曬裝備／S-13 編輯防曬裝備的表單本體。
 *
 * **2026-08-23 從 `GearFormPage.vue` 抽出**，理由是 Sitemap §2.2：「開始
 * 提醒設定採同一流程內完成，不因產品標示、部位調整或通知設定跳離到
 * 平行頁面；必要的調整以同頁區塊或 sheet 呈現。」原本 `SetupTimingPage`
 * 的「改為填寫完整的防曬乳包裝標示」會整頁 `router.push` 到
 * `/products/new`，違反這條規則。
 *
 * 抽出後這個元件不知道自己在頁面裡還是 sheet 裡——不做任何 router
 * 呼叫，成功用 emit 讓外層決定要導頁還是關閉 sheet。取消／關閉的入口
 * 不在這裡，屬於外殼（頁面頁首或 sheet 標題列）。
 * `GearFormPage.vue`（獨立頁）與 `GearFormSheet.vue`（設定流程內嵌）
 * 共用同一份邏輯，不重複維護兩份表單驗證與品類規則。
 */

const props = defineProps<{ productId: string | null }>();
const emit = defineEmits<{
  saved: [];
}>();

const { productSettings } = useWebAppServices();

const isEdit = computed(() => props.productId !== null);

const gearCategory = shallowRef<GearCategory>("sunscreen");
const displayName = ref("");
const purchaseMonth = ref("");
const expiryDate = ref("");
const note = ref("");
/**
 * SPF／PA 只用來辨識「這罐是哪一罐」，**不影響倒數**——
 * `packages/domain` 對這兩個欄位零引用，倒數長度由包裝標示裡的
 * 補擦間隔決定。以字串保存輸入，儲存時才轉型與驗證。
 */
const spfInput = ref("");
const paGradeInput = ref("");
const snapshotForm = ref<ProductSnapshotFormValue>({
  claimAnswer: "yes",
  waitAnswer: "none",
  waitMinutes: null,
  intervalAnswer: "none",
  intervalMinutes: null,
  waterResistance: "unknown"
});
const localError = shallowRef<string | null>(null);
const confirmingDelete = shallowRef(false);

const existing = computed(() =>
  props.productId === null
    ? null
    : (productSettings.products.value.find(
        (product) => product.productId === props.productId
      ) ?? null)
);

/**
 * 品類不可任意變更（S-13）。已被既有事件引用的 sunscreen 改成純紀錄品類，
 * 會讓既有倒數失去產品依據。需要改品類時另建新紀錄。
 */
const categoryLocked = computed(
  () => isEdit.value && existing.value?.gearCategory === "sunscreen"
);

const needsLabelFields = computed(
  () => gearCategory.value === "sunscreen" || gearCategory.value === "clothing"
);
const showSunscreenFields = computed(
  () => gearCategory.value === "sunscreen"
);

const safety = computed(() =>
  existing.value === null ? null : gearSafetyState(existing.value)
);
const isArchived = computed(
  () =>
    existing.value !== null &&
    (existing.value.archivedAt !== null || existing.value.status === "stopped")
);
const canRestore = computed(
  () => isArchived.value && safety.value?.kind !== "blocked"
);

onMounted(async () => {
  await productSettings.ensureLoaded();
  const record = existing.value;
  if (record === null) return;
  gearCategory.value = record.gearCategory;
  displayName.value = record.displayName;
  purchaseMonth.value = record.purchaseMonth ?? "";
  expiryDate.value = record.expiryDate ?? "";
  note.value = record.note ?? "";
  snapshotForm.value = productSnapshotToFormValue(record.currentSnapshot);
  spfInput.value =
    record.currentSnapshot.spf === null
      ? ""
      : String(record.currentSnapshot.spf);
  paGradeInput.value = record.currentSnapshot.paGrade ?? "";
});

function validate(): string | null {
  if (displayName.value.trim().length === 0) {
    return "請輸入這件裝備的暱稱。";
  }
  if (
    purchaseMonth.value !== "" &&
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(purchaseMonth.value)
  ) {
    return "購買月份格式須為 YYYY-MM。";
  }
  if (expiryDate.value !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate.value)) {
    return "到期日格式須為 YYYY-MM-DD。";
  }
  // schema 要求 spf 為正數、paGrade 長度 1–20；先擋住再 parse，
  // 否則 Zod 會丟例外而不是回到表單上的錯誤訊息。
  if (spfInput.value.trim() !== "") {
    const parsed = Number(spfInput.value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return "SPF 請填寫大於 0 的數字，例如 50。";
    }
  }
  if (paGradeInput.value.trim().length > 20) {
    return "PA 標示請控制在 20 個字以內。";
  }
  return null;
}

async function save(): Promise<void> {
  localError.value = validate();
  if (localError.value !== null) return;

  // 非 sunscreen 品類不保留只對 sunscreen 有意義的標示答案，
  // 避免存下一組看起來會影響倒數、實際不會的資料。
  // SPF／PA 跟其他標示欄位一樣只對 sunscreen 有意義，
  // 非防曬乳品類不保留，避免存下看起來有意義、實際不會被用到的資料。
  const spf =
    spfInput.value.trim() === "" ? null : Number(spfInput.value);
  const paGrade =
    paGradeInput.value.trim() === "" ? null : paGradeInput.value.trim();

  const formValue: ProductSnapshotFormValue = showSunscreenFields.value
    ? { ...snapshotForm.value, spf, paGrade }
    : {
        claimAnswer: needsLabelFields.value
          ? snapshotForm.value.claimAnswer
          : "no",
        waitAnswer: "unknown",
        waitMinutes: null,
        intervalAnswer: "unknown",
        intervalMinutes: null,
        waterResistance: "unknown",
        spf: null,
        paGrade: null
      };

  const saved = await productSettings.saveProduct({
    displayName: displayName.value.trim(),
    gearCategory: gearCategory.value,
    snapshot: makeSessionOnlyProductSnapshot(
      formValue,
      new Date().toISOString()
    ),
    purchaseMonth: purchaseMonth.value === "" ? null : purchaseMonth.value,
    expiryDate: expiryDate.value === "" ? null : expiryDate.value,
    note: note.value.trim() === "" ? null : note.value.trim(),
    productId: props.productId ?? undefined
  });

  if (!saved) {
    // 儲存失敗時保留表單，不返回列表（S-12）。
    localError.value = "資料沒有儲存，這件裝備尚未寫入。輸入仍會保留，可以再試一次。";
    return;
  }

  emit("saved");
}

async function archive(): Promise<void> {
  if (props.productId === null) return;
  if (await productSettings.archiveProduct(props.productId)) {
    emit("saved");
  }
}

async function restore(): Promise<void> {
  if (props.productId === null) return;
  if (await productSettings.restoreProduct(props.productId)) {
    emit("saved");
  }
}

async function remove(): Promise<void> {
  if (props.productId === null) return;
  if (await productSettings.deleteProduct(props.productId)) {
    emit("saved");
  }
}
</script>

<template>
  <div class="gear-form">
    <fieldset class="question-card app-card">
      <legend>這件裝備屬於哪一類？</legend>
      <p v-if="categoryLocked" class="question-card__helper">
        已使用過的防曬乳不可改為只做紀錄的裝備，否則已建立的倒數會失去依據。需要改類別請另建一筆新紀錄。
      </p>
      <div class="category-grid">
        <label
          v-for="(label, category) in GEAR_CATEGORY_LABELS"
          :key="category"
          class="category-option"
          :class="{
            'category-option--disabled':
              categoryLocked && category !== 'sunscreen'
          }"
        >
          <input
            v-model="gearCategory"
            type="radio"
            name="gear-category"
            :value="category"
            :disabled="categoryLocked && category !== 'sunscreen'"
          >
          <Icon :name="GEAR_CATEGORY_ICONS[category]" :size="24" />
          <span>{{ label }}</span>
        </label>
      </div>
      <p class="category-effect" role="status">
        {{ GEAR_CATEGORY_REMINDER_EFFECT[gearCategory] }}
      </p>
    </fieldset>

    <section class="app-card">
      <label for="gear-name">裝備暱稱</label>
      <input
        id="gear-name"
        v-model="displayName"
        type="text"
        maxlength="80"
        placeholder="例如：通勤用防曬"
      >
      <p class="field-helper">
        只用於這台裝置上的選擇，重複的暱稱不會被當成同一件裝備。
      </p>

      <div v-if="showSunscreenFields" class="field-pair">
        <div>
          <label for="gear-spf">SPF（選填）</label>
          <!--
            刻意不用 type="number"：Vue 的 v-model 對 number input 會
            自動轉型成 number，spfInput 就不再是字串，後面的 .trim()
            會直接丟 TypeError 讓儲存靜默失敗（2026-08-24 實測抓到）。
            text + inputmode 同樣會跳數字鍵盤，也避開滾輪誤改值。
          -->
          <input
            id="gear-spf"
            v-model="spfInput"
            type="text"
            inputmode="numeric"
            maxlength="4"
            placeholder="50"
          >
        </div>
        <div>
          <label for="gear-pa">PA（選填）</label>
          <input
            id="gear-pa"
            v-model="paGradeInput"
            type="text"
            maxlength="20"
            placeholder="PA++++"
          >
        </div>
      </div>
      <p v-if="showSunscreenFields" class="field-helper">
        只用來認出這罐是哪一罐，<strong>不影響補擦倒數</strong>；倒數長度由下方的包裝標示決定。
      </p>
    </section>

    <ProductSnapshotEditor
      v-if="needsLabelFields"
      v-model="snapshotForm"
      :water-context="showSunscreenFields"
      :sunscreen-fields="showSunscreenFields"
      collapsible
      eyebrow="包裝標示"
      title="確認這瓶防曬乳"
      :description="
        showSunscreenFields
          ? '以下欄位會影響補擦倒數，請只依包裝上看得到的內容填寫。'
          : '衣物只需要確認身分；沒有會影響倒數的標示欄位。'
      "
    />

    <section v-else class="app-card no-effect-note" role="status">
      <strong>這件裝備不會建立補擦倒數</strong>
      <p>
        {{ GEAR_CATEGORY_LABELS[gearCategory] }}沒有會進入計算的包裝標示，因此不需要填寫防曬乳標示欄位。
      </p>
    </section>

    <section class="app-card">
      <div class="field-pair">
        <div>
          <label for="gear-purchase">購買月份（選填）</label>
          <input id="gear-purchase" v-model="purchaseMonth" type="month">
        </div>
        <div>
          <label for="gear-expiry">
            到期日（選填）
            <span v-if="affectsCountdown(gearCategory)" class="affects-badge">
              會影響倒數
            </span>
          </label>
          <input id="gear-expiry" v-model="expiryDate" type="date">
        </div>
      </div>
      <p v-if="affectsCountdown(gearCategory)" class="field-helper">
        到期日一過就不會再建立補擦倒數。
      </p>

      <label for="gear-note">備註（選填）</label>
      <textarea id="gear-note" v-model="note" maxlength="500" rows="3" />
      <p class="field-helper">
        請不要輸入疾病、症狀、用藥或聯絡資料。
      </p>
    </section>

    <p v-if="localError" class="form-error" role="alert">{{ localError }}</p>

    <button
      class="button button--primary"
      type="button"
      :disabled="productSettings.phase.value === 'saving'"
      @click="save"
    >
      {{ productSettings.phase.value === "saving" ? "儲存中…" : "儲存" }}
    </button>

    <!--
      取消動作只留 emit，不在這裡放按鈕——外殼（頁面頁首或 sheet 標題列）
      已經有自己的取消／關閉入口，重複放會變成同一個畫面兩個取消按鈕。
    -->

    <section v-if="isEdit" class="app-card danger-zone">
      <h2>使用狀態</h2>

      <p v-if="safety && safety.kind === 'blocked'" class="form-error">
        {{ safety.detail }}同配方的新批次請另建一筆新紀錄，不要用恢復繞過。
      </p>

      <button
        v-if="canRestore"
        class="button button--quiet"
        type="button"
        @click="restore"
      >
        恢復使用
      </button>
      <button
        v-else-if="!isArchived"
        class="button button--quiet"
        type="button"
        @click="archive"
      >
        移至收納
      </button>

      <template v-if="!confirmingDelete">
        <button
          class="button button--quiet"
          type="button"
          @click="confirmingDelete = true"
        >
          刪除這筆紀錄
        </button>
      </template>
      <template v-else>
        <p class="form-error" role="alert">
          刪除後，曾經使用這件裝備的設定會失去參照；既有提醒紀錄中的包裝標示不會被改寫。確定要刪除嗎？
        </p>
        <button class="button button--primary" type="button" @click="remove">
          刪除這筆裝備
        </button>
        <button
          class="button button--quiet"
          type="button"
          @click="confirmingDelete = false"
        >
          取消
        </button>
      </template>
    </section>
  </div>
</template>

<style scoped>
.gear-form {
  display: grid;
  gap: var(--space-4);
}

.app-card {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-5);
}

h2,
p {
  margin: 0;
}

.field-helper {
  color: var(--text-secondary);
  line-height: 1.6;
  font-size: var(--font-size-caption);
}

/*
 * 2×2，不是 3 欄。域模型的 GearCategory 只有 4 個值，放進 3 欄會讓
 * 第二排只剩一個孤兒、右邊空 2/3（2026-08-24 使用者截圖指出）。
 * 高保真稿用 3 欄是因為它的品類陣列有 6 個（多了帽子與陽傘），
 * 抄版面時要一併核對項目數量。
 */
.category-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-2);
}

.category-option {
  position: relative;
  display: grid;
  justify-items: center;
  gap: var(--space-2);
  min-height: 4.75rem;
  padding: var(--space-3) var(--space-1);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  text-align: center;
  font-size: var(--font-size-caption);
  cursor: pointer;
}

.category-option:has(input:checked) {
  border-color: var(--color-primary);
  background: var(--color-surface-cream-strong);
}

.category-option--disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.category-option input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}

/*
 * 原本用 var(--surface-raised, transparent)，但 --surface-raised 從未
 * 在 packages/ui/src/styles.css 定義過 → 落到 transparent，於是這段
 * 白白比上面的 legend 與格子多縮 12px，卻看不出為什麼要縮。改用實際
 * 存在的 surface-soft，讓內距有對應的底色支撐。
 */
.category-effect {
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--color-surface-soft);
  color: var(--text-secondary);
  line-height: 1.6;
}

.no-effect-note {
  color: var(--text-secondary);
  line-height: 1.6;
}

.no-effect-note strong {
  display: block;
  color: var(--text-primary);
  line-height: 1.4;
}

/*
 * inline-block + nowrap 缺一不可：欄位改成兩欄並排後寬度減半，
 * 原本的 inline span 一換行邊框就從中間斷開（「會」留在框內、
 * 「影響倒數」跑到框外）。改成整塊不可分割，放不下就整顆換行。
 */
.affects-badge {
  display: inline-block;
  padding: 0 var(--space-2);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-pill);
  font-size: var(--font-size-caption);
  color: var(--text-secondary);
  white-space: nowrap;
}

.field-pair label {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}

.field-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.field-pair > div {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
}

/*
 * 兩欄的 label 行數不一定相同（到期日多一顆「會影響倒數」徽章，
 * 窄欄時會掉成兩行）。把輸入框推到欄底，兩個框才會對齊——否則
 * 修好徽章反而換來輸入框高低不齊。
 */
.field-pair > div > input {
  margin-top: auto;
}

/* 欄位在格線裡要撐滿自己那一欄，否則 date/month 這類原生控制項
   會用瀏覽器預設寬度，兩欄看起來一長一短。 */
.field-pair input {
  width: 100%;
}

input,
textarea {
  min-height: var(--tap-target);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  background: var(--surface-primary);
  font: inherit;
}

textarea {
  min-height: calc(var(--tap-target) * 2);
}

.danger-zone {
  justify-items: start;
}

.form-error {
  color: var(--color-due);
  line-height: 1.6;
}
</style>
