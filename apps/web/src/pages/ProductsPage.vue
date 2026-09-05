<script setup lang="ts">
import Icon from "../components/icons/Icon.vue";
import BroadcastLoader from "../components/feedback/BroadcastLoader.vue";
import EmptyStateCard from "../components/common/EmptyStateCard.vue";
import { computed, onMounted, shallowRef } from "vue";
import { useRouter } from "vue-router";
import { useWebAppServices } from "../app/injection";
import IconButton from "../components/common/IconButton.vue";
import GearDetailSheet from "../components/product/GearDetailSheet.vue";
import GearListItem from "../components/product/GearListItem.vue";
import { GEAR_CATEGORY_LABELS } from "../features/product/gearPresentation";

/**
 * S-11 我的防曬裝備。
 *
 * 2026-08-06 裁決把本頁由「提醒用產品主檔」擴為「防曬裝備清單」。
 * 四個品類裡只有 sunscreen 會產生倒數，clothing 是 methodComponent，
 * eyewear 與 other_gear 純紀錄——清單必須把這件事講明白。
 */
const { productSettings } = useWebAppServices();
const router = useRouter();

const current = computed(() =>
  productSettings.products.value.filter(
    (product) => product.archivedAt === null && product.status === "active"
  )
);

const past = computed(() =>
  productSettings.products.value.filter(
    (product) => product.archivedAt !== null || product.status === "stopped"
  )
);

const hasAnyGear = computed(() => productSettings.products.value.length > 0);

/** 「只有非 sunscreen 裝備」是規格明列的狀態，必須明示沒有可建立倒數的產品。 */
const hasUsableSunscreen = computed(() =>
  current.value.some(
    (product) =>
      product.gearCategory === "sunscreen" &&
      product.currentSnapshot.ruleEligibilityAtApplication === "eligible"
  )
);

const loadFailed = computed(() => productSettings.phase.value === "error");

/*
 * 2026-08-31：不再一併 setup.ensureLoaded()。那個呼叫的唯一消費者是
 * SetupProcessBanner（已移除），留著等於載入沒有人讀的資料；/setup 自己
 * 會在進入時載入草稿，回復流程不受影響。
 */
onMounted(() => {
  void productSettings.ensureLoaded();
});

function addGear(): void {
  void router.push({ name: "product-new" });
}

function shareGear(): void {
  void router.push({ name: "product-share" });
}

/**
 * 2026-09-01：詳情從整頁改成就地升起的抽屜（使用者裁決）。
 *
 * 舊的 `/products/:id` 幾乎是編輯頁的子集——`GearForm` 底部本來就有
 * 「移至收納／恢復使用／刪除」。成本與頻率因此是反的：最常做的「看一眼」
 * 要跳一頁，要改東西得跳兩頁。抽屜讓看變成 0 次跳轉。
 *
 * **存的是 id 不是整筆紀錄。** 抽屜裡的動作（收納、恢復）會改寫這筆資料，
 * 存快照的話畫面會停在舊值；用 id 去 `products` 裡查，狀態永遠是最新的。
 * 資料被刪掉時查不到 → `openProduct` 變成 null → 抽屜自己關上。
 */
const openProductId = shallowRef<string | null>(null);

const openProduct = computed(
  () =>
    productSettings.products.value.find(
      (product) => product.productId === openProductId.value
    ) ?? null
);

function openGear(productId: string): void {
  openProductId.value = productId;
}

function closeGear(): void {
  openProductId.value = null;
}

function editGear(productId: string): void {
  openProductId.value = null;
  void router.push({ name: "product-edit", params: { id: productId } });
}
</script>

<template>
  <div class="page-stack gear-page">
    <!--
      2026-09-01：標題列右上角加分享入口（計畫 Task 1.3）。

      卡片是「我的裝備」整組而不是單件，所以入口在清單頁而不是詳情抽屜。
      位置沿用 2026-09-01 統一出來的「標題列右側單一動作」語彙（衛教兩頁、
      裝備詳情），那一格在這頁本來是空的。

      **沒有使用中的裝備時不出現**——沒東西可分享。
    -->
    <!--
      2026-09-04：改用共用的 `.page-heading--with-exit`，說明因此橫跨兩欄。

      這是 #130／#137 修過的同一個坑的第三個病例：標題與說明包在同一個
      `<div>` 裡當左欄，於是**說明也跟著少掉圖示鈕的寬度**。實測 375px：
      可用 336、說明只拿到 320——第一行提早斷在「⋯補擦倒數，」，右邊留下
      一塊空白（使用者圈的正是那裡）。分享鈕沒出現時那一欄仍在，所以空的
      時候也一樣窄。
    -->
    <header class="page-heading page-heading--with-exit">
      <h1 class="page-heading__title" data-typography-role="page-title">
        我的防曬裝備
      </h1>
      <IconButton
        v-if="current.length > 0"
        icon="tool-share"
        label="分享我的防曬裝備"
        @click="shareGear"
      />
      <p>清單儲存於本機。只有防曬乳支援補擦倒數，其他裝備僅供紀錄。</p>
    </header>


    <BroadcastLoader
      v-if="productSettings.phase.value === 'loading'"
      label="正在讀取裝備清單…"
    />

    <EmptyStateCard
      v-else-if="loadFailed"
      title="暫時讀不到裝備清單"
      body="本機資料目前無法讀取。這不代表清單是空的，請稍後再試，先不要重新建立同一筆裝備。"
      role="alert"
    />

    <template v-else>
      <!-- 完全沒有裝備 -->
      <EmptyStateCard
        v-if="!hasAnyGear"
        icon="nav-gear"
        title="還沒有任何裝備"
        body="把常用的防曬乳與裝備記在這裡，建立提醒時就不必重填包裝標示。也可以先不儲存防曬乳，直接建立提醒。"
      >
        <template #actions>
          <button class="button button--primary" type="button" @click="addGear">
            <Icon name="tool-plus" :size="20" />
            新增裝備
          </button>
        </template>
      </EmptyStateCard>

      <template v-else>
        <!--
          實測發現：current.length === 0 時（使用中整個是空的，裝備全部
          收納），這段話原本仍會顯示，且清單插值變成空字串，讀起來像
          「清單裡的 都不會產生倒數」，中間留一個沒有意義的空白。這段
          只該在「使用中裡有東西、但沒有能倒數的防曬乳」時出現。
        -->
        <p
          v-if="current.length > 0 && !hasUsableSunscreen"
          class="no-sunscreen-note"
          role="status"
        >
          目前沒有可以建立補擦倒數的防曬乳。清單裡的
          {{
            current
              .map((product) => GEAR_CATEGORY_LABELS[product.gearCategory])
              .filter((label, index, all) => all.indexOf(label) === index)
              .join("、")
          }}
          都不會產生倒數。
        </p>

        <section aria-labelledby="gear-current-title">
          <div class="gear-section-heading">
            <h2 id="gear-current-title" data-typography-role="section-title">
              使用中
            </h2>
          </div>
          <p v-if="current.length === 0" class="section-empty">
            目前沒有使用中的裝備。
          </p>
          <ul v-else class="gear-list">
            <li v-for="product in current" :key="product.productId">
              <GearListItem
                :product="product"
                @open="openGear(product.productId)"
              />
            </li>
          </ul>
        </section>

        <!--
          2026-08-31：新增鈕從清單上方移到「使用中」之後（使用者裁決）。
          先看有什麼、再決定要不要加，比先看到一顆按鈕自然；而且原本它
          夾在「沒有可倒數的防曬乳」那句提示與清單之間，把說明與它描述
          的清單拆開了。
        -->
        <button class="button button--primary" type="button" @click="addGear">
          <Icon name="tool-plus" :size="20" />
          新增裝備
        </button>

        <!--
          「收納中」取代原本的「過去紀錄」（2026-08-23 裁決）。「過去紀錄」
          語氣像是被淘汰，容易讓人以為裝備被刪除了；「收納中」中性得多，
          也符合這些裝備仍可從編輯頁恢復使用的事實。

          上緣那條線是 2026-09-01 使用者指定的位置：這兩段是**兩種不同的
          東西**——會用於新提醒的，與不會的；中間還隔著一顆主要 CTA，沒有
          線的時候「新增裝備」看起來像屬於下面這一段。

          2026-09-04 從獨立的 `<hr>` 改成這一段自己的上緣（理由見
          `.gear-past` 的註解）。條件不必再寫一次——線跟著這個 section 的
          `v-if`，沒有收納中的裝備時整段都不在，也就不會出現一條下面什麼
          都沒有的線。
        -->
        <section
          v-if="past.length > 0"
          class="gear-past"
          aria-labelledby="gear-past-title"
        >
          <div class="gear-section-heading">
            <h2 id="gear-past-title" data-typography-role="section-title">
              收納中
            </h2>
            <span class="gear-section-count">{{ past.length }} 件</span>
          </div>
          <!-- 2026-09-01：詳情頁已改成抽屜，這句不能再指向一個不存在的頁。 -->
          <p class="section-empty">
            這些裝備不會用於新的提醒；點一下可以恢復使用。
          </p>
          <ul class="gear-list">
            <li v-for="product in past" :key="product.productId">
              <GearListItem
                :product="product"
                @open="openGear(product.productId)"
              />
            </li>
          </ul>
        </section>
      </template>
    </template>

    <GearDetailSheet
      :product="openProduct"
      @close="closeGear"
      @edit="editGear"
    />
  </div>
</template>

<style scoped>
.page-heading h1,
.page-heading p,
h2,
p {
  margin: 0;
}

.page-heading {
  display: grid;
  gap: var(--space-2);
}

/* 標題群組在左、分享鈕在右上角同一列——跟 .flow-heading 同一套版型。 */


.page-heading p {
  color: var(--text-body);
  line-height: var(--line-height-body);
}

.app-card {
  display: grid;
  gap: var(--space-4);
  padding: var(--card-padding);
}

.no-sunscreen-note {
  padding: var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--color-untimed-soft, var(--surface-soft));
  color: var(--text-secondary);
  line-height: var(--line-height-body);
}

section {
  display: grid;
  gap: var(--space-3);
}

/* 值與衛教分類頁那條一致——全站的分隔線只有一種粗細與顏色。 */
/*
 * **2026-09-04：從獨立的 `<hr>` 改成上一段的下緣。**
 *
 * `<hr>` 是 `.page-stack` 的子元素，所以它上下**各吃一整份 stack gap**——
 * 實測衛教分類頁是 32 ＋ 1 ＋ 32 ＝ **65px 的帶裡只有 1px 是內容**，而且
 * 上下相等：那條線不屬於上面也不屬於下面，讀起來就是一條浮在空中的線
 * （使用者：「加了水平線之後這一區很空」）。
 *
 * 改成標題區自己的 `border-bottom` 之後，線與它所結束的那一段綁在一起，
 * 上緣的間距縮成 `--space-4`、下緣仍是 stack gap——**不對稱正是重點**。
 * 這也回到 repo 既有的做法：`.clear-row`、`.identity-fields` 都是
 * `border-top`，不是 `<hr>`。
 */
.page-heading--with-exit {
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
}

/* 同上，只是這一條標的是「會用於新提醒」與「不會」之間的轉折。 */
.gear-past {
  padding-top: var(--space-4);
  border-top: 1px solid var(--border-subtle);
}

.gear-section-heading {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.gear-section-heading h2 {
  margin: 0;
  font-size: var(--font-size-section-title);
}

.gear-section-count {
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
}

.section-empty {
  color: var(--text-secondary);
  line-height: var(--line-height-body);
}

.gear-list {
  display: grid;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>
