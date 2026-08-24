<script setup lang="ts">
import { SlidersHorizontal, Sparkles } from "@lucide/vue";
import Icon from "../icons/Icon.vue";
import type {
  SessionContext,
  SetupDraftZoneV1
} from "@sunshield/contracts";
import { computed, shallowRef } from "vue";
import {
  BODY_ZONE_LABELS,
  recommendedPresetFor
} from "../../features/setup/setupCatalog";

interface Props {
  context: SessionContext;
  zones: SetupDraftZoneV1[];
  pending?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  pending: false
});
defineEmits<{
  accept: [];
  adjust: [];
}>();

const expanded = shallowRef(true);

const preset = computed(() => recommendedPresetFor(props.context));
const zoneLabels = computed(() =>
  props.zones.map(
    (zone) =>
      zone.customLabel ?? BODY_ZONE_LABELS[zone.bodyZoneCode]
  )
);
</script>

<template>
  <section class="quick-protection">
    <button
      class="quick-protection__header"
      type="button"
      :aria-expanded="expanded"
      @click="expanded = !expanded"
    >
      <div class="quick-protection__mark">
        <Sparkles :size="22" aria-hidden="true" />
      </div>
      <div class="quick-protection__header-content">
        <p class="quick-protection__eyebrow">快速提醒（推薦）</p>
        <h2>{{ preset.label }}</h2>
      </div>
      <Icon
        name="tool-chevron-down"
        :size="20"
        class="quick-protection__toggle"
        :class="{ 'quick-protection__toggle--expanded': expanded }"
      />
    </button>

    <div
      v-if="expanded"
      class="quick-protection__details"
    >
      <p class="quick-protection__summary">{{ preset.summary }}</p>
      <p class="quick-protection__zones">
        這次會套用到：{{ zoneLabels.join("、") }}
      </p>
      <p class="quick-protection__note">
        確認實際塗抹時間後，才會建立正式提醒。
      </p>
      <div class="quick-protection__actions">
        <button
          v-if="pending"
          class="button button--primary"
          type="button"
          @click="$emit('accept')"
        >
          使用這組並繼續
        </button>
        <button
          class="button button--quiet"
          type="button"
          @click="$emit('adjust')"
        >
          <SlidersHorizontal :size="17" aria-hidden="true" />
          調整要提醒的部位
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.quick-protection {
  display: grid;
  gap: var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--color-soon-soft);
}

.quick-protection__header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: var(--space-4);
  align-items: center;
  padding: var(--space-5);
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: opacity var(--duration-fast) var(--ease-out);
}

.quick-protection__header:hover {
  opacity: 0.8;
}

.quick-protection__mark {
  display: grid;
  width: 3rem;
  height: 3rem;
  place-content: center;
  border-radius: 50%;
  background: var(--color-soon);
  color: var(--text-inverse);
  flex-shrink: 0;
}

.quick-protection__header-content {
  min-width: 0;
}

.quick-protection__eyebrow,
.quick-protection__header-content h2,
.quick-protection__summary,
.quick-protection__zones,
.quick-protection__note {
  margin: 0;
}

.quick-protection__eyebrow {
  color: var(--text-secondary);
  font-size: var(--font-size-label);
  font-weight: 500;
}

.quick-protection__header-content h2 {
  margin-top: var(--space-2);
  font-size: var(--font-size-title-md);
}

.quick-protection__toggle {
  color: var(--text-secondary);
  flex-shrink: 0;
  transition: transform var(--duration-fast) var(--ease-out);
}

.quick-protection__toggle--expanded {
  transform: rotate(180deg);
}

.quick-protection__details {
  display: grid;
  gap: var(--space-4);
  padding: 0 var(--space-5) var(--space-5);
  animation: slideDown var(--duration-base) var(--ease-out);
}

.quick-protection__summary {
  color: var(--text-secondary);
  font-size: var(--font-size-body);
  line-height: 1.7;
}

.quick-protection__zones {
  font-size: var(--font-size-body);
  color: var(--text-secondary);
  line-height: 1.7;
}

.quick-protection__note {
  color: var(--text-secondary);
  font-size: var(--font-size-label);
  line-height: 1.7;
}

.quick-protection__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-top: var(--space-2);
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-0.5rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 31rem) {
  .quick-protection__header {
    gap: var(--space-3);
  }

  .quick-protection__actions {
    display: grid;
  }

  .quick-protection__actions .button {
    width: 100%;
  }
}
</style>
