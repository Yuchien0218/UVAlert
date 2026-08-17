<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { GearCategory } from "@sunshield/contracts";
import { useWebAppServices } from "../app/injection";
import ProductSnapshotEditor from "../components/product/ProductSnapshotEditor.vue";
import {
  makeSessionOnlyProductSnapshot,
  productSnapshotToFormValue,
  type ProductSnapshotFormValue
} from "../features/setup/productSnapshot";
import {
  affectsCountdown,
  GEAR_CATEGORY_LABELS,
  GEAR_CATEGORY_REMINDER_EFFECT,
  gearSafetyState
} from "../features/product/gearPresentation";

/**
 * S-12 新增防曬裝備 ／ S-13 編輯防曬裝備。
 *
 * 兩個畫面共用同一份表單：差別只在有沒有既有紀錄，以及編輯才有的
 * 移至過去紀錄／恢復／刪除。
 */
const { productSettings } = useWebAppServices();
const route = useRoute();
const router = useRouter();

const productId = computed(() =>
  typeof route.params.id === "string" ? route.params.id : null
);
const isEdit = computed(() => productId.value !== null);

/** 設定流程送來的返回路徑，存完要送回步驟 2。 */
const returnTo = computed(() =>
  route.query.returnTo === "/setup/timing" ? "/setup/timing" : null
);

const gearCategory = shallowRef<GearCategory>("sunscreen");
const displayName = ref("");
const purchaseMonth = ref("");
const expiryDate = ref("");
const note = ref("");
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
  productId.value === null
    ? null
    : (productSettings.products.value.find(
        (product) => product.productId === productId.value
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
  return null;
}

async function save(): Promise<void> {
  localError.value = validate();
  if (localError.value !== null) return;

  // 非 sunscreen 品類不保留只對 sunscreen 有意義的標示答案，
  // 避免存下一組看起來會影響倒數、實際不會的資料。
  const formValue: ProductSnapshotFormValue = showSunscreenFields.value
    ? snapshotForm.value
    : {
        claimAnswer: needsLabelFields.value
          ? snapshotForm.value.claimAnswer
          : "no",
        waitAnswer: "unknown",
        waitMinutes: null,
        intervalAnswer: "unknown",
        intervalMinutes: null,
        waterResistance: "unknown"
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
    productId: productId.value ?? undefined
  });

  if (!saved) {
    // 儲存失敗時保留表單，不返回列表（S-12）。
    localError.value = "資料沒有儲存，這件裝備尚未寫入。輸入仍會保留，可以再試一次。";
    return;
  }

  if (returnTo.value !== null) {
    await router.replace(returnTo.value);
    return;
  }
  await router.replace({ name: "products" });
}

async function archive(): Promise<void> {
  if (productId.value === null) return;
  if (await productSettings.archiveProduct(productId.value)) {
    await router.replace({ name: "products" });
  }
}

async function restore(): Promise<void> {
  if (productId.value === null) return;
  if (await productSettings.restoreProduct(productId.value)) {
    await router.replace({ name: "products" });
  }
}

async function remove(): Promise<void> {
  if (productId.value === null) return;
  if (await productSettings.deleteProduct(productId.value)) {
    await router.replace({ name: "products" });
  }
}

function cancel(): void {
  void router.back();
}
</script>

<template>
  <div class="page-stack gear-form-page">
    <header class="flow-heading">
      <button class="button button--quiet" type="button" @click="cancel">
        取消
      </button>
      <div>
        <h1>{{ isEdit ? "編輯防曬裝備" : "新增防曬裝備" }}</h1>
        <p>
          資料會先儲存在這台裝置；若已開啟同步，之後也可以同步到雲端。非必要欄位可以稍後再補。
        </p>
      </div>
    </header>

    <fieldset class="question-card app-card">
        <legend>這件裝備屬於哪一類？</legend>
      <p v-if="categoryLocked" class="question-card__helper">
        已使用過的防曬乳不可改為只做紀錄的裝備，否則已建立的倒數會失去依據。需要改類別請另建一筆新紀錄。
      </p>
      <div class="choice-grid">
        <label
          v-for="(label, category) in GEAR_CATEGORY_LABELS"
          :key="category"
        >
          <input
            v-model="gearCategory"
            type="radio"
            name="gear-category"
            :value="category"
            :disabled="categoryLocked && category !== 'sunscreen'"
          >
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
    </section>

    <ProductSnapshotEditor
      v-if="needsLabelFields"
      v-model="snapshotForm"
      :water-context="showSunscreenFields"
      :sunscreen-fields="showSunscreenFields"
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
      <label for="gear-purchase">購買月份（選填）</label>
      <input id="gear-purchase" v-model="purchaseMonth" type="month">

      <label for="gear-expiry">
        到期日（選填）
        <span v-if="affectsCountdown(gearCategory)" class="affects-badge">
          會影響倒數
        </span>
      </label>
      <input id="gear-expiry" v-model="expiryDate" type="date">
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
        移至過去紀錄
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
.app-card {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-5);
}

h1,
h2,
p {
  margin: 0;
}

.flow-heading p {
  color: var(--text-secondary);
  line-height: 1.7;
}

.field-helper {
  color: var(--text-secondary);
  line-height: 1.6;
  font-size: var(--font-size-caption);
}

.category-effect {
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--surface-raised, transparent);
  color: var(--text-secondary);
  line-height: 1.7;
}

.no-effect-note {
  color: var(--text-secondary);
  line-height: 1.7;
}

.no-effect-note strong {
  color: var(--text-primary);
}

.affects-badge {
  margin-inline-start: var(--space-2);
  padding: 0 var(--space-2);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-pill, 999px);
  font-size: var(--font-size-caption);
  color: var(--text-secondary);
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
  line-height: 1.7;
}
</style>
