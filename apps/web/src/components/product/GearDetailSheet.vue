<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { ProductCatalogRecordV1 } from "@sunshield/contracts";
import BottomSheet from "../common/BottomSheet.vue";
import { useWebAppServices } from "../../app/injection";
import {
  affectsCountdown,
  formatPurchaseMonth,
  GEAR_CATEGORY_LABELS,
  gearSafetyState
} from "../../features/product/gearPresentation";

/**
 * 裝備詳情：從清單就地升起的抽屜，取代原本的 `/products/:id` 整頁。
 *
 * **為什麼不再是一頁**（2026-09-01 使用者裁決）。使用者的原話是「多一個
 * 跳轉頁面蠻奇怪的」。查證下來比那更嚴重——那一頁幾乎是編輯頁的子集：
 * `GearForm` 底部本來就有「移至收納／恢復使用／刪除」，而且欄位都帶著
 * 現值。詳情頁獨有的只剩一張唯讀的規格卡。
 *
 * 成本與頻率因此是反的：**最常做的「看一眼」要跳一頁，而要改東西得跳兩頁**
 * （清單 → 詳情 → 編輯）。改成抽屜之後看是 0 次跳轉，編輯 1 次——表單需要
 * 整頁，那一次跳轉是省不掉的。
 *
 * **這跟 2026-09-01 稍早否決「包裝標示改抽屜」不衝突。** 那裡是照著瓶身抄
 * 的資料輸入，會邊看邊改、還有「要不要存」的問題；這裡是看規格加選一個
 * 動作，沒有輸入也沒有草稿。抽屜本來就是為後者存在的。
 *
 * 動作的判斷邏輯（`isArchived`／`canRestore`／安全狀態封鎖）原封不動從
 * 舊的詳情頁搬過來，與 `GearForm` 是同一套，沒有另外發明狀態機。
 */

const props = defineProps<{
  /** null 代表關閉。開啟時就是要顯示的那件裝備。 */
  product: ProductCatalogRecordV1 | null;
}>();

const emit = defineEmits<{
  close: [];
  edit: [productId: string];
}>();

const { productSettings } = useWebAppServices();

const isSunscreen = computed(
  () => props.product?.gearCategory === "sunscreen"
);

const safety = computed(() =>
  props.product === null ? null : gearSafetyState(props.product)
);

/** 與 GearForm 的 isArchived 同一個判斷，兩處維持一致。 */
const isArchived = computed(
  () =>
    props.product !== null &&
    (props.product.archivedAt !== null || props.product.status === "stopped")
);

const canRestore = computed(
  () => isArchived.value && safety.value?.kind !== "blocked"
);

const purchase = computed(() =>
  props.product === null
    ? null
    : formatPurchaseMonth(props.product.purchaseMonth)
);

/**
 * 規格摘要，只列真實存在的欄位。
 *
 * 容量（「120ml」）不在資料模型裡——`ProductLabelSnapshotV1Schema` 沒有
 * volume／capacity 欄位，所以這裡只顯示 SPF 與 PA，兩者都是真實資料。
 *
 * paGrade 存的是照包裝抄的完整標示（「PA++++」），不加前綴——曾經寫成
 * `PA${paGrade}`，實測顯示成 PAPA++++。
 */
const specLine = computed(() => {
  if (props.product === null || !isSunscreen.value) return null;
  const { spf, paGrade } = props.product.currentSnapshot;
  const parts: string[] = [];
  if (spf !== null) parts.push(`SPF ${spf}`);
  if (paGrade !== null) parts.push(paGrade);
  return parts.length === 0 ? null : parts.join("・");
});

/**
 * 「裝備資訊」那一段有沒有東西可寫。
 *
 * 「補擦提醒」只在**不會倒數**時顯示（防曬乳那句講的是品類通則，不是這
 * 一瓶的資料），所以一件什麼都沒填的防曬乳會讓這一段完全空掉——有標題、
 * 有邊框、裡面什麼都沒有的區塊，比沒有這個區塊更難懂。
 */
const hasSpecRows = computed(() => {
  if (props.product === null) return false;
  return (
    specLine.value !== null ||
    !affectsCountdown(props.product.gearCategory) ||
    purchase.value !== null ||
    props.product.expiryDate !== null ||
    props.product.note !== null ||
    (safety.value !== null && safety.value.kind !== "usable")
  );
});

const isBusy = computed(() => productSettings.phase.value === "saving");

const actionError = ref<string | null>(null);
const confirmingDelete = ref(false);

/*
 * 每次換一件裝備（或關閉）都要把刪除確認與錯誤訊息清掉。抽屜跟整頁不同：
 * 元件不會被重新建立，狀態會殘留——沒有這個 watch 的話，在 A 按了「刪除
 * 這件防曬裝備」之後關掉、再打開 B，B 會直接停在確認刪除的畫面。
 */
watch(
  () => props.product?.productId ?? null,
  () => {
    confirmingDelete.value = false;
    actionError.value = null;
  }
);

async function handleArchive(): Promise<void> {
  if (props.product === null) return;
  actionError.value = null;
  const ok = await productSettings.archiveProduct(props.product.productId);
  if (ok) emit("close");
  else actionError.value = "沒有儲存成功，這件裝備仍在使用中，可以再試一次。";
}

async function handleRestore(): Promise<void> {
  if (props.product === null) return;
  actionError.value = null;
  const ok = await productSettings.restoreProduct(props.product.productId);
  if (ok) emit("close");
  else actionError.value = "沒有儲存成功，這件裝備仍在收納中，可以再試一次。";
}

async function handleDelete(): Promise<void> {
  if (props.product === null) return;
  actionError.value = null;
  const ok = await productSettings.deleteProduct(props.product.productId);
  if (ok) emit("close");
  else actionError.value = "沒有刪除成功，這件裝備還在，可以再試一次。";
}
</script>

<template>
  <BottomSheet
    :open="product !== null"
    :title="product?.displayName ?? ''"
    labelled-by-id="gear-detail-sheet-title"
    @close="emit('close')"
  >
    <div v-if="product !== null" class="gear-detail">
      <p class="category-badge">
        {{ GEAR_CATEGORY_LABELS[product.gearCategory] }}
        <span v-if="isArchived" class="category-badge__state">・收納中</span>
      </p>

      <dl v-if="hasSpecRows" class="spec-list">
        <div v-if="specLine !== null" class="spec-row">
          <dt>規格</dt>
          <dd>{{ specLine }}</dd>
        </div>
        <!--
          只在「不會倒數」時顯示：防曬乳那句「將依設定，自動建立補擦倒數」
          講的是品類通則，不是這一瓶的資料。限制才要說。
        -->
        <div
          v-if="!affectsCountdown(product.gearCategory)"
          class="spec-row spec-row--full"
        >
          <dt>補擦提醒</dt>
          <dd>不會建立補擦倒數</dd>
        </div>
        <div v-if="purchase !== null" class="spec-row">
          <dt>購買月份</dt>
          <dd>{{ purchase }}</dd>
        </div>
        <div v-if="product.expiryDate !== null" class="spec-row">
          <dt>到期日</dt>
          <dd>{{ product.expiryDate }}</dd>
        </div>
        <div v-if="product.note !== null" class="spec-row spec-row--full">
          <dt>個人附註</dt>
          <dd>{{ product.note }}</dd>
        </div>
      </dl>

      <p
        v-if="safety !== null && safety.kind !== 'usable'"
        class="spec-safety"
        :class="`spec-safety--${safety.kind}`"
      >
        {{ safety.label }}・{{ safety.detail }}
      </p>

      <p v-if="actionError !== null" class="form-error" role="alert">
        {{ actionError }}
      </p>

      <div class="gear-detail__actions">
        <button
          class="button button--quiet"
          type="button"
          @click="emit('edit', product.productId)"
        >
          編輯
        </button>
        <button
          v-if="canRestore"
          class="button button--primary"
          type="button"
          :disabled="isBusy"
          @click="handleRestore"
        >
          記錄使用中
        </button>
        <button
          v-else-if="!isArchived"
          class="button button--primary"
          type="button"
          :disabled="isBusy"
          @click="handleArchive"
        >
          移至收納
        </button>
        <p
          v-else-if="safety !== null && safety.kind === 'blocked'"
          class="spec-safety spec-safety--blocked"
        >
          {{ safety.detail }}同配方的新批次請另建一筆新紀錄，不要用恢復繞過。
        </p>

        <template v-if="!confirmingDelete">
          <button
            class="button button--quiet"
            type="button"
            @click="confirmingDelete = true"
          >
            刪除這件防曬裝備
          </button>
        </template>
        <template v-else>
          <p class="form-error" role="alert">
            確定要刪除這件裝備？這個動作無法復原。
          </p>
          <div class="button-group">
            <button
              class="button button--primary"
              type="button"
              :disabled="isBusy"
              @click="handleDelete"
            >
              確定刪除
            </button>
            <button
              class="button button--quiet"
              type="button"
              @click="confirmingDelete = false"
            >
              取消
            </button>
          </div>
        </template>
      </div>
    </div>
  </BottomSheet>
</template>

<style scoped>
/* 以下版型直接沿用舊的詳情頁，只把外層從 .app-card 換成抽屜的內容區。 */
.gear-detail {
  display: grid;
  gap: var(--space-4);
}

.category-badge {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
}

.category-badge__state {
  color: var(--text-secondary);
}

.spec-list {
  display: grid;
  gap: var(--space-3);
  margin: 0;
}

.spec-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-3);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--border-subtle);
}

.spec-row:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.spec-row--full {
  flex-direction: column;
  align-items: start;
  gap: var(--space-1);
}

/*
 * 2026-08-31：dt 不得被壓縮。
 *
 * .spec-row 是 flex + space-between，dt 原本沒有 flex-shrink: 0，dd 的
 * 文字一長就把 dt 壓到最小內容寬度——「補擦提醒」被擠成一行一個字。長標籤
 * 配長內容本來就不該並排，所以那一列同時是 .spec-row--full；這條
 * flex-shrink 則是防止其他列在內容變長時重蹈覆轍。
 */
.spec-row dt {
  flex: 0 0 auto;
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
}

.spec-row dd {
  margin: 0;
  font-weight: 500;
}

.spec-safety {
  margin: 0;
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  line-height: var(--line-height-body);
}

.spec-safety--blocked {
  color: var(--color-due);
  background: var(--color-due-soft);
}

.spec-safety--no_countdown {
  color: var(--text-body);
  background: var(--color-untimed-soft, var(--surface-soft));
}

.gear-detail__actions {
  display: grid;
  gap: var(--space-3);
}
</style>
