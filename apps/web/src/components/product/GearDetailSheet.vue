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
 * 規格清單有沒有東西可寫。
 *
 * 只算**這一件裝備自己的資料**：品類通則（「防曬乳會建立倒數」）不在內，
 * 那句話對所有防曬乳都成立；「不會建立倒數」這個限制也不在內，它 2026-09-01
 * 改由標題下的「僅供紀錄」膠囊表示，留在這裡會變成同一件事講兩次。
 *
 * 所以一件什麼都沒填的裝備不會渲染一張空的清單——有邊框、裡面什麼都沒有
 * 的區塊，比沒有這個區塊更難懂。
 *
 * 安全狀態不算進來：它有自己的警示樣式，不在 `<dl>` 裡。
 */
const hasSpecRows = computed(() => {
  if (props.product === null) return false;
  return (
    specLine.value !== null ||
    purchase.value !== null ||
    props.product.expiryDate !== null ||
    props.product.note !== null
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
      <!--
        2026-09-01：品類與狀態改用清單項目那一套「說明文字 ＋ 外框膠囊」。

        原本是「防曬乳・收納中」一行純文字，孤零零掛在標題下面——**標題在
        sheet 的 header 裡，這一行在 body 裡，中間隔著一條分隔線**，讀起來
        不像副標而像一句沒有來由的字。

        改成跟 `GearListItem` 的 caption 一模一樣的語彙：品類是說明文字，
        限制與狀態是外框膠囊。從清單點進來時同一組字還在原位，只是換了
        容器——這比在 sheet 裡另外發明一種標示法好。

        「僅供紀錄」同時取代了原本那一列「補擦提醒／不會建立補擦倒數」——
        兩者說的是同一件事，而膠囊佔一行不到、規格列要佔兩行。
      -->
      <p class="gear-detail__caption">
        {{ GEAR_CATEGORY_LABELS[product.gearCategory] }}
        <span
          v-if="!affectsCountdown(product.gearCategory)"
          class="gear-detail__badge"
          >僅供紀錄</span
        >
        <span v-if="isArchived" class="gear-detail__badge">收納中</span>
      </p>

      <dl v-if="hasSpecRows" class="spec-list">
        <div v-if="specLine !== null" class="spec-row">
          <dt>規格</dt>
          <dd>{{ specLine }}</dd>
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

      </div>

      <!--
        2026-09-01：刪除從三顆等重的按鈕裡分出來。

        原本「編輯」與「刪除這件防曬裝備」都是 `button--quiet`——**兩顆長得
        一模一樣，其中一顆會永久刪掉資料。** 分兩件事處理：

        1. 一條 hairline 把它跟上面的日常動作隔開（不同性質的動作不該只靠
           順序區分）
        2. 按鈕文字用 `--color-due`，跟資料設定頁「清除全部本機資料」同一套
           ——那裡是紅標題配中性按鈕，**這個 App 不用整顆紅按鈕**

        紅字不是唯一訊號（旁邊有分隔線與段落標題），所以不違反 SC 1.4.1。
      -->
      <div class="gear-detail__danger">
        <template v-if="!confirmingDelete">
          <button
            class="button button--quiet gear-detail__delete"
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

/* 與 GearListItem 的 caption 同一套：品類是說明文字，狀態是外框膠囊。 */
.gear-detail__caption {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
}

.gear-detail__badge {
  padding: 0 var(--space-2);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-pill);
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

/*
 * 破壞性動作自己一區，用一條 hairline 跟日常動作隔開。
 * 上方留 space-2 而不是沿用 .gear-detail 的 gap：線本身已經是間隔，
 * 再疊一次會讓底部空一大塊。
 */
.gear-detail__danger {
  display: grid;
  gap: var(--space-3);
  padding-top: var(--space-4);
  border-top: 1px solid var(--border-subtle);
}

.gear-detail__delete {
  color: var(--color-due);
}
</style>
