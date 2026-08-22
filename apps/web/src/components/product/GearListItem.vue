<script setup lang="ts">
import { computed } from "vue";
import Icon from "../icons/Icon.vue";
import type { ProductCatalogRecordV1 } from "@sunshield/contracts";
import {
  affectsCountdown,
  formatPurchaseMonth,
  GEAR_CATEGORY_LABELS,
  GEAR_CATEGORY_REMINDER_EFFECT,
  gearSafetyState
} from "../../features/product/gearPresentation";

const props = defineProps<{ product: ProductCatalogRecordV1 }>();
defineEmits<{ open: [] }>();

const safety = computed(() => gearSafetyState(props.product));
const purchase = computed(() => formatPurchaseMonth(props.product.purchaseMonth));
</script>

<template>
  <button class="gear-item" type="button" @click="$emit('open')">
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
        v-if="safety.kind !== 'usable'"
        class="gear-item__status"
        :class="`gear-item__status--${safety.kind}`"
      >
        {{ safety.label }}・{{ safety.detail }}
      </p>
      <p v-else class="gear-item__effect">
        {{ GEAR_CATEGORY_REMINDER_EFFECT[product.gearCategory] }}
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

.gear-item__body {
  display: grid;
  gap: var(--space-1);
  flex: 1;
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

.gear-item__effect,
.gear-item__meta,
.gear-item__note {
  color: var(--text-secondary);
  line-height: 1.6;
}

.gear-item__status {
  line-height: 1.6;
}

.gear-item__status--blocked {
  color: var(--color-due);
}

.gear-item__status--no_countdown {
  color: var(--color-untimed, var(--text-secondary));
}
</style>
