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
  const routeName =
    step === "context"
      ? "setup-context"
      : step === "review"
        ? "setup-review"
        : "setup-timing";
  await router.push({ name: routeName });
}

async function save(): Promise<void> {
  localError.value = validate();
  if (localError.value !== null) return;

  const snapshot = makeSessionOnlyProductSnapshot(
    product.value,
    new Date().toISOString()
  );
  saved.value = await productSettings.save(snapshot);
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
          : "保存產品標示"
      }}
    </button>

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
