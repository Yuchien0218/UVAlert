<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { ProductCatalogRecordV1 } from "@sunshield/contracts";
import BottomSheet from "../common/BottomSheet.vue";
import Icon from "../icons/Icon.vue";
import { gearSafetyState } from "../../features/product/gearPresentation";

interface Props {
  open: boolean;
  products: ProductCatalogRecordV1[];
  selectedProductId: string | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  select: [productId: string | null];
  close: [];
  addNew: [];
}>();

const activeSunscreens = computed(() =>
  props.products.filter(
    (product) =>
      product.gearCategory === "sunscreen" &&
      product.archivedAt === null &&
      product.status === "active"
  )
);

const localSelectedId = ref<string | null>(props.selectedProductId);

watch(
  () => [props.open, props.selectedProductId] as const,
  ([isOpen]) => {
    if (isOpen) {
      localSelectedId.value = props.selectedProductId;
    }
  }
);

function formatSunscreenSpec(product: ProductCatalogRecordV1): string | null {
  const parts: string[] = [];
  if (product.currentSnapshot.spf !== null) {
    parts.push(`SPF ${product.currentSnapshot.spf}`);
  }
  if (product.currentSnapshot.paGrade !== null) {
    parts.push(product.currentSnapshot.paGrade);
  }
  const waterStatus = product.currentSnapshot.waterResistanceStatus;
  if (waterStatus === "40" || waterStatus === "80") {
    parts.push(`耐水 ${waterStatus} 分鐘`);
  } else if (waterStatus === "not_water_resistant") {
    parts.push("標示不耐水");
  }
  const interval = product.currentSnapshot.reapplicationIntervalMinutes;
  if (interval !== null) {
    parts.push(`補擦間隔 ${interval} 分鐘`);
  }
  return parts.length > 0 ? parts.join("・") : null;
}

function formatSafetyWarning(product: ProductCatalogRecordV1): string | null {
  const safety = gearSafetyState(product);
  return safety.kind === "usable" ? null : `${safety.label}・${safety.detail}`;
}

function confirm(): void {
  emit("select", localSelectedId.value);
  emit("close");
}

function handleAddNew(): void {
  emit("addNew");
}
</script>

<template>
  <BottomSheet
    :open="open"
    title="選擇這次使用的防曬乳"
    labelled-by-id="sunscreen-selection-sheet-title"
    @close="emit('close')"
  >
    <div class="sunscreen-sheet">
      <div
        class="choice-grid"
        role="radiogroup"
        aria-label="防曬乳選項"
      >
        <!-- 裝備庫中的有效防曬乳 -->
        <label
          v-for="product in activeSunscreens"
          :key="product.productId"
          class="sunscreen-option"
        >
          <input
            type="radio"
            name="setup-sunscreen-selection"
            :value="product.productId"
            :checked="localSelectedId === product.productId"
            @change="localSelectedId = product.productId"
          />
          <div class="sunscreen-option__content">
            <strong class="sunscreen-option__name user-text">
              {{ product.displayName }}
            </strong>
            <p
              v-if="formatSunscreenSpec(product)"
              class="sunscreen-option__spec"
            >
              {{ formatSunscreenSpec(product) }}
            </p>
            <p
              v-if="formatSafetyWarning(product)"
              class="sunscreen-option__warning"
            >
              {{ formatSafetyWarning(product) }}
            </p>
          </div>
        </label>

        <!-- 未指定標示防曬乳 -->
        <label class="sunscreen-option">
          <input
            type="radio"
            name="setup-sunscreen-selection"
            value="unassigned"
            :checked="localSelectedId === null"
            @change="localSelectedId = null"
          />
          <div class="sunscreen-option__content">
            <strong class="sunscreen-option__name">
              未指定標示防曬乳
            </strong>
            <p class="sunscreen-option__spec">
              採用 120 分鐘保守補擦間隔
            </p>
          </div>
        </label>
      </div>

      <button
        class="text-link sunscreen-sheet__add"
        type="button"
        @click="handleAddNew"
      >
        <Icon name="tool-plus" :size="16" />
        填寫新防曬乳標示
      </button>
    </div>

    <template #footer>
      <button
        class="button button--primary sunscreen-sheet__confirm"
        type="button"
        @click="confirm"
      >
        確定
      </button>
    </template>
  </BottomSheet>
</template>

<style scoped>
.sunscreen-sheet {
  display: grid;
  gap: var(--space-4);
  padding: var(--card-padding);
}

.sunscreen-option__content {
  display: grid;
  gap: var(--space-1);
  min-width: 0;
}

.sunscreen-option__name {
  color: var(--text-primary);
  font-size: var(--font-size-body);
  line-height: var(--line-height-body);
}

.sunscreen-option__spec {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-supporting);
  line-height: var(--line-height-supporting);
}

.sunscreen-option__warning {
  margin: 0;
  color: var(--color-due);
  font-size: var(--font-size-caption);
  line-height: var(--line-height-caption);
}

.sunscreen-sheet__add {
  justify-self: start;
  min-height: var(--tap-target);
}

.sunscreen-sheet__confirm {
  width: 100%;
}
</style>
