<script setup lang="ts">
import { Plus } from "@lucide/vue";
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useWebAppServices } from "../app/injection";
import SetupProcessBanner from "../components/product/SetupProcessBanner.vue";
import GearListItem from "../components/product/GearListItem.vue";
import { GEAR_CATEGORY_LABELS } from "../features/product/gearPresentation";

/**
 * S-11 我的防曬裝備。
 *
 * 2026-08-06 裁決把本頁由「提醒用產品主檔」擴為「防曬裝備清單」。
 * 四個品類裡只有 sunscreen 會產生倒數，clothing 是 methodComponent，
 * eyewear 與 other_gear 純紀錄——清單必須把這件事講明白。
 */
const { boot, productSettings, setup } = useWebAppServices();
const router = useRouter();

const hasActiveSetupDraft = computed(
  () =>
    boot.currentSession.value === null &&
    setup.draft.value?.initialContext !== null &&
    setup.draft.value?.initialContext !== undefined
);

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

const hasAnyGear = computed(
  () => productSettings.products.value.length > 0
);

/** 「只有非 sunscreen 裝備」是規格明列的狀態，必須明示沒有可建立倒數的產品。 */
const hasUsableSunscreen = computed(() =>
  current.value.some(
    (product) =>
      product.gearCategory === "sunscreen" &&
      product.currentSnapshot.ruleEligibilityAtApplication === "eligible"
  )
);

const loadFailed = computed(
  () => productSettings.phase.value === "error"
);

onMounted(() => {
  void Promise.all([
    productSettings.ensureLoaded(),
    setup.ensureLoaded()
  ]);
});

function addGear(): void {
  void router.push({ name: "product-new" });
}

function editGear(productId: string): void {
  void router.push({ name: "product-edit", params: { id: productId } });
}
</script>

<template>
  <div class="page-stack gear-page">
    <header class="page-heading">
      <h1>我的防曬裝備</h1>
      <p>
        這份清單會先儲存在這台裝置。只有防曬乳會建立補擦倒數；其他裝備只做紀錄。
      </p>
    </header>

    <SetupProcessBanner v-if="hasActiveSetupDraft" />

    <p v-if="productSettings.phase.value === 'loading'" role="status">
      正在讀取裝備清單…
    </p>

    <section v-else-if="loadFailed" class="app-card" role="alert">
      <h2>暫時讀不到裝備清單</h2>
      <p>
        本機資料目前無法讀取。這不代表清單是空的，請稍後再試，先不要重新建立同一筆裝備。
      </p>
    </section>

    <template v-else>
      <!-- 完全沒有裝備 -->
      <section v-if="!hasAnyGear" class="app-card empty-state">
        <h2>還沒有任何裝備</h2>
        <p>
          把常用的防曬乳與裝備記在這裡，建立提醒時就不必重填包裝標示。也可以先不儲存防曬乳，直接建立提醒。
        </p>
        <button class="button button--primary" type="button" @click="addGear">
          <Plus :size="18" aria-hidden="true" />
          新增防曬裝備
        </button>
      </section>

      <template v-else>
        <button class="button button--primary" type="button" @click="addGear">
          <Plus :size="18" aria-hidden="true" />
          新增防曬裝備
        </button>

        <p
          v-if="!hasUsableSunscreen"
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
          <h2 id="gear-current-title">目前使用</h2>
          <p v-if="current.length === 0" class="section-empty">
            目前沒有使用中的裝備。
          </p>
          <ul v-else class="gear-list">
            <li v-for="product in current" :key="product.productId">
              <GearListItem
                :product="product"
                @open="editGear(product.productId)"
              />
            </li>
          </ul>
        </section>

        <section v-if="past.length > 0" aria-labelledby="gear-past-title">
          <h2 id="gear-past-title">過去紀錄</h2>
          <p class="section-empty">
            這些裝備不會用於新的提醒；需要時可以在編輯頁恢復。
          </p>
          <ul class="gear-list">
            <li v-for="product in past" :key="product.productId">
              <GearListItem
                :product="product"
                @open="editGear(product.productId)"
              />
            </li>
          </ul>
        </section>
      </template>
    </template>
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

.page-heading p {
  color: var(--text-secondary);
  line-height: 1.7;
}

.app-card {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-5);
}

.empty-state {
  justify-items: start;
}

.no-sunscreen-note {
  padding: var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--color-untimed-soft, var(--surface-raised));
  color: var(--text-secondary);
  line-height: 1.7;
}

section {
  display: grid;
  gap: var(--space-3);
}

.section-empty {
  color: var(--text-secondary);
  line-height: 1.7;
}

.gear-list {
  display: grid;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>
