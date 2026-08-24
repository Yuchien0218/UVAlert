<script setup lang="ts">
import { computed } from "vue";
import Icon from "../icons/Icon.vue";
import type { GearCategory, ProductCatalogRecordV1 } from "@sunshield/contracts";
import {
  affectsCountdown,
  formatPurchaseMonth,
  GEAR_CATEGORY_LABELS,
  GEAR_CATEGORY_REMINDER_EFFECT,
  gearSafetyState
} from "../../features/product/gearPresentation";
import type { IconName } from "../../generated/icons.generated";

const props = defineProps<{ product: ProductCatalogRecordV1 }>();
defineEmits<{ open: [] }>();

/** 每個品類對應的圖示色塊圖示（依 Claude Design 元件庫，2026-08-23 同步）。 */
const GEAR_CATEGORY_ICONS: Record<GearCategory, IconName> = {
  sunscreen: "gear-sunscreen",
  clothing: "gear-clothing",
  eyewear: "gear-sunglasses",
  other_gear: "gear-other"
};

const safety = computed(() => gearSafetyState(props.product));
const purchase = computed(() => formatPurchaseMonth(props.product.purchaseMonth));

/**
 * 一行摘要。防曬乳用真實規格（SPF／PA／補擦間隔），沒資料就不編造，
 * 落回品類的一般提醒效果說明；其他品類本來就只有效果說明可用。
 */
const summary = computed((): string => {
  if (safety.value.kind !== "usable") {
    return `${safety.value.label}・${safety.value.detail}`;
  }
  if (props.product.gearCategory === "sunscreen") {
    const snapshot = props.product.currentSnapshot;
    const parts: string[] = [];
    if (snapshot.spf !== null) parts.push(`SPF ${snapshot.spf}`);
    // paGrade 存的是使用者輸入的完整標示（欄位 placeholder 就是
    // 「PA++++」），不要再自己加 PA 前綴——會變成「PAPA++++」。
    if (snapshot.paGrade !== null) parts.push(snapshot.paGrade);
    if (snapshot.reapplicationIntervalMinutes !== null) {
      parts.push(`補擦間隔 ${snapshot.reapplicationIntervalMinutes} 分鐘`);
    }
    if (parts.length > 0) return parts.join("・");
  }
  return GEAR_CATEGORY_REMINDER_EFFECT[props.product.gearCategory];
});
</script>

<template>
  <button class="gear-item" type="button" @click="$emit('open')">
    <span class="gear-item__icon" aria-hidden="true">
      <Icon :name="GEAR_CATEGORY_ICONS[product.gearCategory]" :size="24" />
    </span>

    <div class="gear-item__body">
      <p class="gear-item__category">
        {{ GEAR_CATEGORY_LABELS[product.gearCategory] }}
        <span
          v-if="!affectsCountdown(product.gearCategory)"
          class="gear-item__badge"
        >不會建立倒數</span>
      </p>
      <strong class="gear-item__name">{{ product.displayName }}</strong>
      <p
        class="gear-item__summary"
        :class="{ [`gear-item__summary--${safety.kind}`]: safety.kind !== 'usable' }"
      >
        {{ summary }}
      </p>

      <p v-if="purchase || product.expiryDate" class="gear-item__meta">
        <span v-if="purchase">{{ purchase }}</span>
        <span v-if="purchase && product.expiryDate">・</span>
        <span v-if="product.expiryDate">到期日 {{ product.expiryDate }}</span>
      </p>
      <p v-if="product.note" class="gear-item__note">{{ product.note }}</p>
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
  border-radius: var(--radius-pill, 999px);
}

.gear-item__name {
  font-size: 1.0625rem;
}

.gear-item__summary,
.gear-item__meta,
.gear-item__note {
  color: var(--text-secondary);
  line-height: 1.6;
}

.gear-item__summary--blocked {
  color: var(--color-due);
}

.gear-item__summary--no_countdown {
  color: var(--color-untimed, var(--text-secondary));
}
</style>
