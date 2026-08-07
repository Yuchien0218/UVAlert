<script setup lang="ts">
import { Check, Save } from "@lucide/vue";
import { computed, onMounted, ref, shallowRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useWebAppServices } from "../app/injection";
import ProductSnapshotEditor from "../components/product/ProductSnapshotEditor.vue";
import SetupProcessBanner from "../components/product/SetupProcessBanner.vue";
import {
  makeSessionOnlyProductSnapshot,
  productSnapshotToFormValue,
  type ProductSnapshotFormValue
} from "../features/setup/productSnapshot";

const { boot, productSettings, setup } = useWebAppServices();
const route = useRoute();
const router = useRouter();
const product = ref<ProductSnapshotFormValue>({
  claimAnswer: "yes",
  waitAnswer: "none",
  waitMinutes: null,
  intervalAnswer: "none",
  intervalMinutes: null,
  waterResistance: "unknown"
});
const localError = shallowRef<string | null>(null);
const saved = shallowRef(false);
const displayName = ref("我的防曬產品");
const editingProductId = shallowRef<string | null>(null);
const returnTo = computed(() =>
  route.query.returnTo === "/setup/timing"
    ? "/setup/timing"
    : null
);
const hasActiveSetupDraft = computed(
  () =>
    boot.currentSession.value === null &&
    setup.draft.value?.initialContext !== null &&
    setup.draft.value?.initialContext !== undefined
);

watch(
  () => productSettings.snapshot.value,
  (snapshot) => {
    if (snapshot !== null) {
      product.value = productSnapshotToFormValue(snapshot);
    }
  },
  { immediate: true }
);

onMounted(() => {
  void Promise.all([
    productSettings.ensureLoaded(),
    setup.ensureLoaded()
  ]);
});

async function resumeSetup(): Promise<void> {
  setup.resumeDraft();
  const step = setup.recommendedResumeStep();
  // 兩步流程後只剩 context 與 timing；舊草稿的 review 一律回 timing。
  const routeName =
    step === "context" ? "setup-context" : "setup-timing";
  await router.push({ name: routeName });
}

async function save(): Promise<void> {
  localError.value = validate();
  if (localError.value !== null) return;

  const snapshot = makeSessionOnlyProductSnapshot(
    product.value,
    new Date().toISOString()
  );
  if (displayName.value.trim().length === 0) {
    localError.value = "請輸入方便辨識的產品名稱。";
    return;
  }
  saved.value = await productSettings.saveProduct(
    displayName.value,
    snapshot,
    editingProductId.value ?? undefined
  );
  if (!saved.value) {
    localError.value = "產品標示目前無法保存，請再試一次。";
  }
}

function validate(): string | null {
  if (
    product.value.waitAnswer === "explicit" &&
    (!Number.isInteger(product.value.waitMinutes) ||
      (product.value.waitMinutes ?? 0) <= 0)
  ) {
    return "請填寫包裝上的等待分鐘數。";
  }
  if (
    product.value.intervalAnswer === "explicit" &&
    (!Number.isInteger(product.value.intervalMinutes) ||
      (product.value.intervalMinutes ?? 0) <= 0)
  ) {
    return "請填寫包裝上的一般補擦分鐘數。";
  }
  return null;
}

function editProduct(productId: string): void {
  const record = productSettings.products.value.find(
    (item) => item.productId === productId
  );
  if (record === undefined) return;
  editingProductId.value = record.productId;
  displayName.value = record.displayName;
  product.value = productSnapshotToFormValue(record.currentSnapshot);
  saved.value = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function stopProduct(productId: string): Promise<void> {
  await productSettings.stopProduct(productId);
  if (editingProductId.value === productId) editingProductId.value = null;
}

function startNewProduct(): void {
  editingProductId.value = null;
  displayName.value = "我的防曬產品";
  saved.value = false;
}
</script>

<template>
  <div class="page-stack">
    <header class="page-heading">
      <h1 class="page-heading__title">防曬產品</h1>
      <p class="page-heading__body">
        在這裡確認目前使用產品的包裝標示。建立提醒時，只需要再確認實際塗抹時間。
      </p>
    </header>

    <SetupProcessBanner
      v-if="hasActiveSetupDraft"
      @resume="resumeSetup"
    />

    <label class="product-name app-card">
      <span>產品名稱</span>
      <input v-model="displayName" type="text" maxlength="80" autocomplete="off" />
      <small>只用於這台裝置上的產品選擇，不會寫入歷史 snapshot。</small>
      <button v-if="editingProductId" class="button button--quiet" type="button" @click="startNewProduct">
        改為新增另一項產品
      </button>
    </label>

    <ProductSnapshotEditor
      v-model="product"
      :water-context="true"
      eyebrow="目前使用"
      title="產品包裝標示"
      description="資料只保存在這台裝置，之後建立提醒時會沿用；實際塗抹時間不會沿用。"
    />

    <p v-if="localError" class="form-error" role="alert">
      {{ localError }}
    </p>
    <p v-if="saved" class="save-success" role="status">
      <Check :size="18" aria-hidden="true" />
      產品標示已保存
    </p>

    <button
      class="button button--primary save-button"
      type="button"
      :disabled="productSettings.phase.value === 'saving'"
      @click="save"
    >
      <Save :size="18" aria-hidden="true" />
      {{
        productSettings.phase.value === "saving"
          ? "保存中…"
          : editingProductId
            ? "更新產品標示"
            : "保存產品標示"
      }}
    </button>

    <section v-if="productSettings.products.value.length > 0" class="catalog" aria-labelledby="catalog-title">
      <h2 id="catalog-title">裝置內產品</h2>
      <article v-for="item in productSettings.products.value" :key="item.productId" class="app-card catalog-item">
        <div>
          <h3>{{ item.displayName }}</h3>
          <p>{{ item.status === "active" ? "可供補擦紀錄選擇" : "已停止使用" }}</p>
        </div>
        <div class="catalog-actions">
          <button class="button button--quiet" type="button" @click="editProduct(item.productId)">編輯</button>
          <button v-if="item.status === 'active'" class="text-link" type="button" @click="stopProduct(item.productId)">停止使用</button>
        </div>
      </article>
    </section>

    <RouterLink
      v-if="saved && returnTo"
      class="button button--quiet return-button"
      :to="returnTo"
    >
      返回設定塗抹時間
    </RouterLink>
  </div>
</template>

<style scoped>
.form-error,
.save-success {
  margin: 0;
  line-height: 1.7;
}

.product-name { display: grid; gap: var(--space-2); padding: var(--space-5); }
.product-name span { font-weight: 700; }
.product-name input { min-height: var(--tap-target); padding-inline: var(--space-3); border: 1px solid var(--border-strong); border-radius: var(--radius-sm); color: var(--text-primary); background: var(--surface-primary); }
.product-name small { color: var(--text-secondary); line-height: 1.6; }
.catalog { display: grid; gap: var(--space-4); }
.catalog h2, .catalog-item h3, .catalog-item p { margin: 0; }
.catalog-item { display: grid; gap: var(--space-4); padding: var(--space-5); }
.catalog-item > div:first-child { display: grid; gap: var(--space-2); }
.catalog-item p { color: var(--text-secondary); }
.catalog-actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3); }
.catalog-actions .text-link { border: 0; background: transparent; color: var(--text-primary); cursor: pointer; }

.form-error {
  color: var(--color-due);
}

.save-success {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-success);
}

.save-button,
.return-button {
  justify-self: start;
}

@media (max-width: 31rem) {
  .save-button,
  .return-button {
    width: 100%;
  }
}
</style>
