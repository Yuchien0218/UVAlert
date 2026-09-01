<script setup lang="ts">
import { computed } from "vue";
import Icon from "../icons/Icon.vue";
import type { ProductCatalogRecordV1 } from "@sunshield/contracts";
import {
  affectsCountdown,
  GEAR_CATEGORY_ICONS,
  GEAR_CATEGORY_LABELS,
  gearSafetyState
} from "../../features/product/gearPresentation";

const props = defineProps<{ product: ProductCatalogRecordV1 }>();
defineEmits<{ open: [] }>();

const safety = computed(() => gearSafetyState(props.product));
/**
 * 安全狀態的一行說明。
 *
 * **2026-08-31 大幅收斂。** 這裡原本還會顯示 SPF／PA／補擦間隔，沒有規格時
 * 落回品類的固定說明——但那句固定說明對每一張同品類的卡都一樣（重複度
 * 100%、資訊量 0），使用者回饋「收合前的文字太多，只留名稱就好」。
 *
 * **安全狀態留下來，那不是可以省的裝飾。** 被封鎖或不建立倒數的裝備必須在
 * 清單上就看得出來，不能等使用者點進詳情頁才知道；規格則是「進去看」也
 * 不遲。
 */
const safetyNotice = computed((): string | null =>
  safety.value.kind === "usable"
    ? null
    : `${safety.value.label}・${safety.value.detail}`
);
</script>

<template>
  <button class="gear-item" type="button" @click="$emit('open')">
    <span class="gear-item__icon" aria-hidden="true">
      <Icon :name="GEAR_CATEGORY_ICONS[product.gearCategory]" :size="32" />
    </span>

    <div class="gear-item__body">
      <p class="gear-item__category">
        {{ GEAR_CATEGORY_LABELS[product.gearCategory] }}
        <span
          v-if="!affectsCountdown(product.gearCategory)"
          class="gear-item__badge"
          >不會建立倒數</span
        >
      </p>
      <strong class="gear-item__name">{{ product.displayName }}</strong>
      <!--
        購買月份、到期日、個人附註與規格都只在詳情頁——清單的工作是「認出
        是哪一件」，不是把所有欄位攤開（2026-08-31 使用者裁決）。
      -->
      <p
        v-if="safetyNotice !== null"
        class="gear-item__summary"
        :class="`gear-item__summary--${safety.kind}`"
      >
        {{ safetyNotice }}
      </p>
    </div>
    <Icon name="tool-chevron-right" :size="20" />
  </button>
</template>

<style scoped>
.gear-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-4);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-primary);
  text-align: start;
  cursor: pointer;
  min-height: var(--tap-target);
}

.gear-item__icon {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  color: var(--text-secondary);
}

.gear-item__body {
  display: grid;
  gap: var(--space-1);
  flex: 1;
  min-width: 0;
}

p {
  margin: 0;
}

.gear-item__category {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
}

.gear-item__badge {
  padding: 0 var(--space-2);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-pill);
}

.gear-item__name {
  font-size: var(--font-size-card-title);
}

.gear-item__summary {
  color: var(--text-secondary);
  line-height: var(--line-height-body);
}

.gear-item__summary--blocked {
  color: var(--color-due);
}

.gear-item__summary--no_countdown {
  color: var(--color-untimed, var(--text-secondary));
}
</style>
