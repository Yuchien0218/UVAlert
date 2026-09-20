<script setup lang="ts">
import Icon from "../components/icons/Icon.vue";
import BroadcastLoader from "../components/feedback/BroadcastLoader.vue";
import EmptyStateCard from "../components/common/EmptyStateCard.vue";
import {
  computed,
  onMounted,
  ref,
  shallowRef,
  watch,
  type ComponentPublicInstance
} from "vue";
import { useRouter } from "vue-router";
import { useWebAppServices } from "../app/injection";
import IconButton from "../components/common/IconButton.vue";
import GearDetailSheet from "../components/product/GearDetailSheet.vue";
import GearListItem from "../components/product/GearListItem.vue";
import { GEAR_CATEGORY_LABELS } from "../features/product/gearPresentation";
import type { ProductCatalogRecordV1 } from "@sunshield/contracts";

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

// 拖曳排序與拖曳收納/恢復支援
const activeItems = ref<ProductCatalogRecordV1[]>([]);
const isDragging = shallowRef(false);
const dragSource = shallowRef<"current" | "past" | null>(null);
const draggedIndex = shallowRef<number | null>(null);
const draggingProduct = shallowRef<ProductCatalogRecordV1 | null>(null);
const isOverArchiveZone = shallowRef(false);
const isOverRestoreZone = shallowRef(false);

const archiveZoneRef = shallowRef<HTMLElement | null>(null);
const pastZoneRef = shallowRef<HTMLElement | null>(null);
const restoreZoneRef = shallowRef<HTMLElement | null>(null);
const currentSectionRef = shallowRef<HTMLElement | null>(null);

watch(
  current,
  (val) => {
    if (!isDragging.value) {
      activeItems.value = [...val];
    }
  },
  { immediate: true }
);

const listContainerRef =
  shallowRef<ComponentPublicInstance | HTMLElement | null>(null);

const dragOffsetY = ref(0);

function getContainerEl(): HTMLElement | null {
  if (!listContainerRef.value) return null;
  if (listContainerRef.value instanceof HTMLElement) {
    return listContainerRef.value;
  }
  return listContainerRef.value.$el instanceof HTMLElement
    ? listContainerRef.value.$el
    : null;
}

function startDrag(event: PointerEvent, index: number): void {
  if (activeItems.value.length === 0) return;

  const product = activeItems.value[index];
  if (!product) return;

  const targetHandle = event.target as HTMLElement | null;
  const pointerId = event.pointerId;
  try {
    targetHandle?.setPointerCapture?.(pointerId);
  } catch {
    // 某些環境可能不支援 setPointerCapture
  }

  let dragStartY = event.clientY;
  dragOffsetY.value = 0;

  dragSource.value = "current";
  draggingProduct.value = product;
  isDragging.value = true;
  draggedIndex.value = index;
  isOverArchiveZone.value = false;
  isOverRestoreZone.value = false;

  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate?.(10);
  }

  const onPointerMove = (e: PointerEvent) => {
    if (!isDragging.value || draggedIndex.value === null) return;

    const clientX = e.clientX;
    const clientY = e.clientY;

    // 即時計算跟手位移
    dragOffsetY.value = clientY - dragStartY;

    // 檢查是否移入收納投放區或既有的收納中區塊
    let overTarget = false;
    if (archiveZoneRef.value) {
      const rect = archiveZoneRef.value.getBoundingClientRect();
      if (
        clientY >= rect.top - 10 &&
        clientY <= rect.bottom + 10 &&
        clientX >= rect.left &&
        clientX <= rect.right
      ) {
        overTarget = true;
      }
    }
    if (!overTarget && pastZoneRef.value) {
      const rect = pastZoneRef.value.getBoundingClientRect();
      if (
        clientY >= rect.top &&
        clientY <= rect.bottom &&
        clientX >= rect.left &&
        clientX <= rect.right
      ) {
        overTarget = true;
      }
    }

    if (overTarget !== isOverArchiveZone.value) {
      isOverArchiveZone.value = overTarget;
      if (overTarget && typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.(20);
      }
    }

    // 若正在懸停在收納區，不進行清單內換位
    if (isOverArchiveZone.value) return;

    // 在清單內部進行換位
    const container = getContainerEl();
    if (!container) return;

    const listItems = Array.from(
      container.querySelectorAll(":scope > li")
    ) as HTMLElement[];

    const currentIndex = draggedIndex.value;
    let targetIndex = currentIndex;

    for (let i = 0; i < listItems.length; i += 1) {
      if (i === currentIndex) continue;
      const item = listItems[i];
      if (!item) continue;
      const rect = item.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (i > currentIndex && clientY >= midY) {
        targetIndex = i;
      } else if (i < currentIndex && clientY <= midY) {
        targetIndex = i;
        break;
      }
    }

    if (
      targetIndex !== currentIndex &&
      targetIndex >= 0 &&
      targetIndex < activeItems.value.length
    ) {
      const itemHeight = listItems[targetIndex]?.offsetHeight ?? 72;
      const slotDistance = itemHeight + 12;
      const slotShift = (targetIndex - currentIndex) * slotDistance;

      const currentList = [...activeItems.value];
      const [moved] = currentList.splice(currentIndex, 1);
      if (moved !== undefined) {
        currentList.splice(targetIndex, 0, moved);
        activeItems.value = currentList;
        dragStartY += slotShift;
        dragOffsetY.value = clientY - dragStartY;
        draggedIndex.value = targetIndex;
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate?.(10);
        }
      }
    }
  };

  const onPointerUp = () => {
    try {
      targetHandle?.releasePointerCapture?.(pointerId);
    } catch {
      // 忽略釋放失敗
    }

    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);

    const shouldArchive = isOverArchiveZone.value;

    isDragging.value = false;
    dragSource.value = null;
    draggedIndex.value = null;
    isOverArchiveZone.value = false;
    dragOffsetY.value = 0;

    if (shouldArchive) {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.([15, 50, 15]);
      }
      void productSettings.archiveProduct(product.productId);
      return;
    }

    const newOrderedIds = activeItems.value.map((p) => p.productId);
    const oldIds = current.value.map((p) => p.productId);
    const hasChanged =
      newOrderedIds.length !== oldIds.length ||
      newOrderedIds.some((id, idx) => id !== oldIds[idx]);

    if (hasChanged) {
      void productSettings.reorderProducts(newOrderedIds);
    }
  };

  window.addEventListener("pointermove", onPointerMove, { passive: false });
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
}

function startDragFromPast(event: PointerEvent, product: ProductCatalogRecordV1): void {
  const targetHandle = event.target as HTMLElement | null;
  const pointerId = event.pointerId;
  try {
    targetHandle?.setPointerCapture?.(pointerId);
  } catch {
    // 某些環境可能不支援 setPointerCapture
  }

  let dragStartY = event.clientY;
  dragOffsetY.value = 0;

  dragSource.value = "past";
  draggingProduct.value = product;
  isDragging.value = true;
  draggedIndex.value = null;
  isOverRestoreZone.value = false;
  isOverArchiveZone.value = false;

  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate?.(10);
  }

  const onPointerMove = (e: PointerEvent) => {
    if (!isDragging.value || dragSource.value !== "past") return;

    const clientX = e.clientX;
    const clientY = e.clientY;

    // 即時計算跟手位移
    dragOffsetY.value = clientY - dragStartY;

    let overTarget = false;
    if (restoreZoneRef.value) {
      const rect = restoreZoneRef.value.getBoundingClientRect();
      if (
        clientY >= rect.top - 15 &&
        clientY <= rect.bottom + 15 &&
        clientX >= rect.left - 10 &&
        clientX <= rect.right + 10
      ) {
        overTarget = true;
      }
    }
    if (!overTarget && currentSectionRef.value) {
      const rect = currentSectionRef.value.getBoundingClientRect();
      if (
        clientY >= rect.top &&
        clientY <= rect.bottom &&
        clientX >= rect.left &&
        clientX <= rect.right
      ) {
        overTarget = true;
      }
    }

    if (overTarget !== isOverRestoreZone.value) {
      isOverRestoreZone.value = overTarget;
      if (overTarget && typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.(20);
      }
    }
  };

  const onPointerUp = () => {
    try {
      targetHandle?.releasePointerCapture?.(pointerId);
    } catch {
      // 忽略釋放失敗
    }

    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);

    const shouldRestore = isOverRestoreZone.value;

    isDragging.value = false;
    dragSource.value = null;
    draggingProduct.value = null;
    isOverRestoreZone.value = false;
    dragOffsetY.value = 0;

    if (shouldRestore) {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.([15, 50, 15]);
      }
      void productSettings.restoreProduct(product.productId);
    }
  };

  window.addEventListener("pointermove", onPointerMove, { passive: false });
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
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
          <button
            class="button button--primary page-primary-action"
            type="button"
            @click="addGear"
          >
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
          清單中的
          {{
            current
              .map((product) => GEAR_CATEGORY_LABELS[product.gearCategory])
              .filter((label, index, all) => all.indexOf(label) === index)
              .join("、")
          }}
          僅供防護紀錄。新增具備標示的防曬乳即可為你建立補擦倒數。
        </p>

        <section
          ref="currentSectionRef"
          aria-labelledby="gear-current-title"
          :class="{ 'gear-current--drop-active': isDragging && dragSource === 'past' && isOverRestoreZone }"
        >
          <div class="gear-section-heading">
            <h2 id="gear-current-title" data-typography-role="section-title">
              使用中
            </h2>
            <span v-if="activeItems.length > 1" class="gear-section-hint">
              可拖曳調整順序
            </span>
          </div>
          <p v-if="activeItems.length === 0" class="section-empty">
            目前沒有使用中的裝備。
          </p>
          <TransitionGroup
            v-else
            ref="listContainerRef"
            tag="ul"
            name="gear-flip"
            class="gear-list"
          >
            <li
              v-for="(product, index) in activeItems"
              :key="product.productId"
              :class="{ 'is-dragging': isDragging && dragSource === 'current' && draggedIndex === index }"
              :style="isDragging && dragSource === 'current' && draggedIndex === index ? { transform: `translate3d(0, ${dragOffsetY}px, 0) scale(1.045) rotate(-1.5deg)` } : undefined"
            >
              <GearListItem
                :product="product"
                :draggable="activeItems.length > 1"
                @open="openGear(product.productId)"
                @drag-start="startDrag($event, index)"
              />
            </li>
          </TransitionGroup>

          <!-- 拖曳至收納投放提示區（由使用中向下拖） -->
          <div
            v-if="isDragging && dragSource === 'current'"
            ref="archiveZoneRef"
            class="drop-action-zone drop-archive-zone"
            :class="{ 'drop-action-zone--active': isOverArchiveZone }"
            aria-live="polite"
          >
            <span class="drop-action-zone__icon">
              <Icon name="tool-download" :size="24" />
            </span>
            <p class="drop-action-zone__text">
              {{ isOverArchiveZone ? "放開移至收納" : "移至收納" }}
            </p>
          </div>

          <!-- 拖曳恢復使用投放提示區（由收納中向上拖） -->
          <div
            v-if="isDragging && dragSource === 'past'"
            ref="restoreZoneRef"
            class="drop-action-zone drop-restore-zone"
            :class="{ 'drop-action-zone--active': isOverRestoreZone }"
            aria-live="polite"
          >
            <span class="drop-action-zone__icon">
              <Icon name="tool-refresh" :size="24" />
            </span>
            <p class="drop-action-zone__text">
              {{ isOverRestoreZone ? "放開移至使用中" : "移至使用中" }}
            </p>
          </div>
        </section>

        <!--
          2026-08-31：新增鈕從清單上方移到「使用中」之後（使用者裁決）。
          先看有什麼、再決定要不要加，比先看到一顆按鈕自然；而且原本它
          夾在「沒有可倒數的防曬乳」那句提示與清單之間，把說明與它描述
          的清單拆開了。
        -->
        <button
          class="button button--primary page-primary-action"
          type="button"
          @click="addGear"
        >
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
          ref="pastZoneRef"
          :class="{ 'gear-past--drop-active': isDragging && dragSource === 'current' && isOverArchiveZone }"
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
            這些裝備不會用於新的提醒，點選或向上拖曳可移至使用中。
          </p>
          <ul class="gear-list">
            <li
              v-for="product in past"
              :key="product.productId"
              :class="{ 'is-dragging': isDragging && dragSource === 'past' && draggingProduct?.productId === product.productId }"
              :style="isDragging && dragSource === 'past' && draggingProduct?.productId === product.productId ? { transform: `translate3d(0, ${dragOffsetY}px, 0) scale(1.045) rotate(-1.5deg)` } : undefined"
            >
              <GearListItem
                :product="product"
                :draggable="true"
                drag-label="移至使用中"
                @open="openGear(product.productId)"
                @drag-start="startDragFromPast($event, product)"
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

.gear-section-hint {
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
  position: relative;
}

.gear-list > li {
  transition:
    transform var(--duration-fast) var(--ease-out),
    filter var(--duration-fast) var(--ease-out);
}

.gear-flip-move {
  transition: transform var(--duration-fast) var(--ease-out);
}

.is-dragging {
  z-index: var(--z-drag);
  position: relative;
  transform: scale(1.045) rotate(-1.5deg);
  filter:
    drop-shadow(0 6px 14px rgb(46 41 37 / 18%))
    drop-shadow(0 16px 32px rgb(46 41 37 / 24%));
  transition: none !important;
  will-change: transform;
}

.is-dragging :deep(.gear-item-card) {
  border-color: var(--color-primary);
  background-color: var(--color-canvas);
  box-shadow: 0 0 0 2px var(--color-primary);
}

.is-dragging :deep(.gear-item__handle) {
  background-color: var(--color-primary);
  color: var(--color-white);
}

.drop-action-zone,
.drop-archive-zone {
  margin-top: var(--space-3);
  padding: var(--space-4);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  border: 2px dashed var(--border-subtle);
  border-radius: var(--radius-md);
  background-color: var(--surface-soft);
  color: var(--text-secondary);
  transition:
    border-color var(--duration-fast) var(--ease-out),
    background-color var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out),
    transform var(--duration-fast) var(--ease-out);
}

.drop-action-zone--active,
.drop-archive-zone--active {
  border-color: var(--color-primary);
  background-color: var(--color-surface-cream-strong);
  color: var(--color-primary-text);
  transform: scale(1.02);
}

.drop-action-zone__icon,
.drop-archive-zone__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.drop-action-zone__text,
.drop-archive-zone__text {
  margin: 0;
  font-size: var(--font-size-body);
  font-weight: 500;
}

.gear-past--drop-active,
.gear-current--drop-active {
  border-radius: var(--radius-md);
  background-color: var(--color-surface-cream-strong);
  transition: background-color var(--duration-fast) var(--ease-out);
}
</style>
