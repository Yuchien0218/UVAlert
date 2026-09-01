<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import BroadcastLoader from "../components/feedback/BroadcastLoader.vue";
import EmptyStateCard from "../components/common/EmptyStateCard.vue";
import { useWebAppServices } from "../app/injection";
import IconButton from "../components/common/IconButton.vue";
import {
  affectsCountdown,
  formatPurchaseMonth,
  GEAR_CATEGORY_LABELS,
  gearSafetyState
} from "../features/product/gearPresentation";

/**
 * 防曬裝備詳情頁（wireframe 06 / Sitemap §2.3）。
 *
 * **與 wireframe 06 的三處刻意差異**，理由見
 * `docs/decisions/2026-08-23-wireframe-copy-fixes.md`：
 *
 * 一、**沒有照片與「分享圖片」**。資料模型完全沒有圖片欄位，Dexie 也沒有
 * 檔案儲存機制——這是全新功能，不是版面微調，這次先不做。
 *
 * 二、**沒有「開瓶日期」**。資料模型只有 `purchaseMonth`（購買月份）與
 * `expiryDate`（到期日），沒有開瓶日期欄位。
 *
 * 三、**主 CTA 依狀態切換，不是固定的「記錄使用中」**。wireframe 把
 * 「記錄使用中」畫成使用中裝備的主要按鈕，但這件裝備已經在使用中，按鈕
 * 沒有實質意義。改成：
 *   - 使用中 → 主 CTA 是「移至收納」（`archiveProduct`，移入收納）。
 *   - 收納中 → 主 CTA 是「記錄使用中」（`restoreProduct`，恢復使用）。
 * 這兩個動作已經在 `GearFormPage.vue` 的編輯頁用同一套判斷邏輯
 * （`isArchived`／`canRestore`）驗證過，這裡沿用而不是另外發明狀態機。
 * 安全狀態被封鎖的裝備（回報過異常或不適）不提供恢復，理由同 S-13。
 */

const { productSettings } = useWebAppServices();
const route = useRoute();
const router = useRouter();

const productId = computed(() =>
  typeof route.params.id === "string" ? route.params.id : ""
);

onMounted(() => {
  void productSettings.ensureLoaded();
});

const product = computed(
  () =>
    productSettings.products.value.find(
      (item) => item.productId === productId.value
    ) ?? null
);

const isSunscreen = computed(() => product.value?.gearCategory === "sunscreen");

const safety = computed(() =>
  product.value === null ? null : gearSafetyState(product.value)
);

/** 與 GearFormPage.vue 的 isArchived 同一個判斷，兩頁維持一致。 */
const isArchived = computed(
  () =>
    product.value !== null &&
    (product.value.archivedAt !== null || product.value.status === "stopped")
);

const canRestore = computed(
  () => isArchived.value && safety.value?.kind !== "blocked"
);

const purchase = computed(() =>
  product.value === null
    ? null
    : formatPurchaseMonth(product.value.purchaseMonth)
);

/**
 * 規格摘要，只列真實存在的欄位。
 *
 * wireframe 寫「SPF50＋ PA＋＋＋＋・120ml」，但容量（120ml）不存在於
 * 資料模型——`ProductLabelSnapshotV1Schema` 沒有 volume／capacity 欄位。
 * 這裡只顯示 SPF 與 PA，兩者都是真實資料。
 */
const specLine = computed(() => {
  if (product.value === null || !isSunscreen.value) return null;
  const { spf, paGrade } = product.value.currentSnapshot;
  const parts: string[] = [];
  if (spf !== null) parts.push(`SPF ${spf}`);
  // paGrade 存使用者照包裝抄的完整標示（「PA++++」），不加前綴——
  // 這裡原本寫 `PA${paGrade}`，跟設定流程摘要的直接顯示互相矛盾。
  // 先前沒爆是因為當時沒有任何寫入路徑，兩邊都碰不到真值。
  // （那張摘要已於 2026-08-24 移除，這裡的規則不變。）
  if (paGrade !== null) parts.push(paGrade);
  return parts.length === 0 ? null : parts.join("・");
});

/**
 * 「裝備資訊」這張卡有沒有東西可寫。
 *
 * 2026-09-01：「補擦提醒」改成只在限制情況顯示之後，一件剛建好、什麼都
 * 沒填的防曬乳會讓這張卡完全空掉——**一張有標題、有邊框、裡面什麼都沒有
 * 的卡片，比沒有這張卡更難懂**。所以整張跟著條件出現。
 *
 * 安全狀態（過期、回報有問題）也算一列：那是這件裝備當下的實際狀況。
 */
const hasSpecRows = computed(() => {
  if (product.value === null) return false;
  return (
    specLine.value !== null ||
    !affectsCountdown(product.value.gearCategory) ||
    purchase.value !== null ||
    product.value.expiryDate !== null ||
    product.value.note !== null ||
    (safety.value !== null && safety.value.kind !== "usable")
  );
});

const isBusy = computed(() => productSettings.phase.value === "saving");

const actionError = ref<string | null>(null);

function goBack(): void {
  void router.push({ name: "products" });
}

function goEdit(): void {
  if (productId.value !== "") {
    void router.push({ name: "product-edit", params: { id: productId.value } });
  }
}

async function handleArchive(): Promise<void> {
  actionError.value = null;
  const ok = await productSettings.archiveProduct(productId.value);
  if (!ok) {
    actionError.value = "沒有儲存成功，這件裝備仍在使用中，可以再試一次。";
  }
}

async function handleRestore(): Promise<void> {
  actionError.value = null;
  const ok = await productSettings.restoreProduct(productId.value);
  if (!ok) {
    actionError.value = "沒有儲存成功，這件裝備仍在收納中，可以再試一次。";
  }
}

const confirmingDelete = ref(false);

async function handleDelete(): Promise<void> {
  actionError.value = null;
  const ok = await productSettings.deleteProduct(productId.value);
  if (ok) {
    await router.replace({ name: "products" });
    return;
  }
  actionError.value = "沒有刪除成功，這件裝備還在，可以再試一次。";
}
</script>

<template>
  <div class="page-stack product-detail-page">
    <!--
      2026-08-24：返回從左側的文字連結改成右上角只有圖示的叉叉，跟記錄
      補擦／記錄狀況／更正紀錄／設定流程一致。「編輯」原本佔著右上角，
      移到下方的行動區——右上角保留給單一的離開動作。

      2026-08-31：標題併進叉叉那一列。叉叉原本自己佔一個 <header>，下面
      才是標題——實測標題上方憑空多出 60px，而那一列左邊什麼都沒有。
      版型直接用 .flow-heading（app.css），跟那三個流程頁同一套。

      **這個 header 刻意留在 v-if 鏈外面。** 讀取中與「找不到這件裝備」
      兩種狀態也必須有離開的出口；把它搬進 v-else 會讓載入失敗的人被
      困在頁面上。標題那一格改成有資料才填，所以讀取中就只是一列 44px
      的按鈕——跟改動前一樣，沒有多出來的空白。
    -->
    <header class="flow-heading">
      <div>
        <template v-if="product !== null">
          <p class="category-badge">
            {{ GEAR_CATEGORY_LABELS[product.gearCategory] }}
            <span v-if="isArchived" class="category-badge__state">・收納中</span>
          </p>
          <h1 class="page-heading__title" data-typography-role="page-title">
            {{ product.displayName }}
          </h1>
        </template>
      </div>
      <!--
        2026-09-01：叉叉改成返回箭頭（使用者要求）。

        這一頁不是流程也不是浮層——它是清單的下一層，離開就是回到上一層。
        叉叉的語意是「關掉」，用在這裡會讓人以為按下去等於丟棄什麼。
        `aria-label` 原本就寫著「返回裝備清單」，圖示現在跟它一致了。

        衛教分類頁與文章頁同一天走同一個方向；記錄補擦、記錄狀況那幾個
        **流程頁**維持叉叉——那些真的是「中途放棄」。
      -->
      <IconButton
        icon="tool-arrow-left"
        label="返回裝備清單"
        @click="goBack"
      />
    </header>

    <BroadcastLoader
      v-if="productSettings.phase.value === 'loading'"
      label="正在讀取裝備資料…"
    />

    <EmptyStateCard
      v-else-if="product === null"
      title="找不到這件裝備"
      body="這筆裝備紀錄可能已被刪除，或是網址有誤。"
      title-tag="h1"
      role="alert"
    >
      <template #actions>
        <button class="button button--primary" type="button" @click="goBack">
          返回我的防曬裝備
        </button>
      </template>
    </EmptyStateCard>

    <template v-else>
      <section v-if="hasSpecRows" class="app-card spec-section">
        <h2 data-typography-role="card-title">裝備資訊</h2>
        <dl class="spec-list">
          <div v-if="specLine !== null" class="spec-row">
            <dt>規格</dt>
            <dd>{{ specLine }}</dd>
          </div>
          <!--
            2026-09-01：只在「不會倒數」時才顯示（使用者問「框框內的文字
            有需要這些嗎？我覺得怪怪的」——不需要）。

            原本無條件顯示。問題是防曬乳那一句「防曬乳將依設定，自動建立
            補擦倒數」講的是**品類的通則**，不是這一瓶的資料——同一句話在
            新增裝備頁選到防曬乳時也會出現。一張叫「裝備資訊」的卡，唯一
            內容卻是一句對所有防曬乳都成立的話，讀起來像這瓶沒填任何東西
            卻硬湊出一列。

            **「不會建立補擦倒數」相反，那是限制**，而且與使用者的預期不同
            （放進裝備清單卻不會提醒）。這跟草稿狀態、通知失敗是同一條規則：
            預期內的結果安靜，意外要出聲。
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
      </section>

      <p v-if="actionError !== null" class="form-error" role="alert">
        {{ actionError }}
      </p>

      <div class="detail-actions">
        <!-- 從右上角移下來（2026-08-24），右上角只留返回。 -->
        <button class="button button--quiet" type="button" @click="goEdit">
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
    </template>
  </div>
</template>

<style scoped>
.page-heading__title {
  margin: 0;
}

.category-badge {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
}

.category-badge__state {
  color: var(--text-secondary);
}

.spec-section {
  display: grid;
  gap: var(--space-4);
  padding: var(--card-padding);
}

.spec-section h2 {
  margin: 0;
  font-size: var(--font-size-card-title);
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
 * .spec-row 是 flex + space-between，dt 原本沒有 flex-shrink: 0，
 * dd 的文字一長就把 dt 壓到最小內容寬度——「補擦提醒」被擠成一行
 * 一個字。長標籤配長內容本來就不該並排，所以那一列同時改成
 * .spec-row--full（上下堆疊）；這條 flex-shrink 則是防止其他列
 * 在內容變長時重蹈覆轍。
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

.detail-actions {
  display: grid;
  gap: var(--space-3);
}
</style>
