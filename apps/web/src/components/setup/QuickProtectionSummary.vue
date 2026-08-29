<script setup lang="ts">
import { SlidersHorizontal, Sparkles } from "@lucide/vue";
import Icon from "../icons/Icon.vue";
import type { SessionContext, SetupDraftZoneV1 } from "@sunshield/contracts";
import { computed, shallowRef, watch } from "vue";
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

/**
 * 尚未確認時攤開（使用者沒挑過部位，推薦內容必須看得到）；一旦確認就
 * 收合成單行——這時它的任務已經完成，下面還要填塗抹時間、看確認摘要，
 * 讓它繼續佔掉整段版面只是把頁面拉長。使用者仍可點標題列重新展開。
 */
const expanded = shallowRef(props.pending);

watch(
  () => props.pending,
  (pending) => {
    expanded.value = pending;
  }
);

const preset = computed(() => recommendedPresetFor(props.context));
const zoneLabels = computed(() =>
  props.zones.map(
    (zone) => zone.customLabel ?? BODY_ZONE_LABELS[zone.bodyZoneCode]
  )
);
</script>

<template>
  <section class="quick-protection app-card">
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
        <h2 data-typography-role="card-title">{{ preset.label }}</h2>
      </div>
      <Icon
        name="tool-chevron-down"
        :size="20"
        class="quick-protection__toggle"
        :class="{ 'quick-protection__toggle--expanded': expanded }"
      />
    </button>

    <div v-if="expanded" class="quick-protection__details">
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
/*
 * 2026-08-24：原本整區用 --color-soon-soft 當底、圓形圖示用 --color-soon。
 * 但 --color-soon 的語意是「即將到期」，這區講的是「這是推薦的部位組合」，
 * 完全不同的事——DESIGN.md 第二節明訂狀態色不得與裝飾用法混淆。
 *
 * SetupProcessBanner 2026-08-23 已經因為同一個理由把 --color-soon 換掉
 * （「同一個顏色會讓使用者把該去完成設定跟該去補擦搞混」），這一處是當時
 * 漏掉的。改用共用的 .app-card，跟同頁其他區塊一致。
 */
.quick-protection {
  display: grid;
  gap: var(--space-4);
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
  background: var(--surface-soft);
  color: var(--color-primary);
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
  font-size: var(--font-size-caption);
  font-weight: 500;
}

.quick-protection__header-content h2 {
  margin-top: var(--space-2);
  font-size: var(--font-size-card-title);
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
  animation: quickProtectionFadeIn var(--duration-base) var(--ease-out);
}

.quick-protection__summary {
  color: var(--text-secondary);
  font-size: var(--font-size-supporting);
  line-height: 1.6;
}

.quick-protection__zones {
  font-size: var(--font-size-supporting);
  color: var(--text-secondary);
  line-height: 1.6;
}

/*
 * 2026-08-25：這是說明／標籤角色，DESIGN.md 對應的 CJK 行高是 1.5。
 */
.quick-protection__note {
  color: var(--text-secondary);
  font-size: var(--font-size-supporting);
  line-height: 1.5;
}

.quick-protection__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-top: var(--space-2);
}

/*
 * 2026-08-24：原本叫 slideDown、帶 translateY(-0.5rem)，但 DESIGN.md
 * 第十二節明訂動畫「只用 opacity，不用位移或縮放」。改成純淡入。
 */
@keyframes quickProtectionFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
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
