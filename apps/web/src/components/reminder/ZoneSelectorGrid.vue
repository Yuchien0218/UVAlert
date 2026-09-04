<script setup lang="ts">
import type { ZoneProjection } from "@sunshield/contracts";
import { getZoneLabel } from "../../features/reminder/reminderPresentation";

interface Props {
  zones: ZoneProjection[];
  selectedZoneIds: string[];
  locked?: boolean;
}

const props = withDefaults(defineProps<Props>(), { locked: false });

const emit = defineEmits<{
  toggle: [zoneInstanceId: string];
}>();
</script>

<template>
  <div class="zone-grid">
    <label
      v-for="zone in props.zones"
      :key="zone.zoneInstanceId"
      class="zone-chip"
      :class="{ 'zone-chip--locked': props.locked }"
    >
      <!--
        原生的核取方塊藏起來（2026-09-03，使用者：「前面不要有勾勾符號」）。
        只是視覺上拿掉——它仍然在 DOM 裡、仍然可以 Tab 到、仍然被螢幕閱讀器
        報成核取方塊，選取狀態改由藥丸本身呈現（`:has(input:checked)`）。
      -->
      <input
        class="screen-reader-only"
        type="checkbox"
        :checked="props.selectedZoneIds.includes(zone.zoneInstanceId)"
        :disabled="props.locked"
        @change="emit('toggle', zone.zoneInstanceId)"
      />
      <span class="user-text">{{ getZoneLabel(zone) }}</span>
    </label>
  </div>
</template>

<style scoped>
.zone-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.zone-chip {
  position: relative;
  display: inline-flex;
  align-items: center;
  /* 方塊拿掉之後左右各多給一階，否則藥丸會瘦成一個貼著文字的框。 */
  padding: var(--space-2) var(--space-4);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-pill);
  min-height: var(--tap-target);
  cursor: pointer;
  transition:
    background-color var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    filter var(--duration-fast) var(--ease-out);
}

/*
 * 2026-09-04：這顆原本 transition 與 :active 都沒有——選取是瞬變、按下
 * 完全沒回饋，而它是記錄補擦時點最多次的東西。
 *
 * 鎖定時 input 是 disabled 的，所以按壓回饋要排除掉，否則會回應一個
 * 按不動的東西。
 */
.zone-chip:not(.zone-chip--locked):active {
  background-color: var(--color-hairline);
  filter: brightness(var(--press-dim));
}

/*
 * 勾勾拿掉之後，「選了沒」全靠藥丸本身——用共用的已選取外觀
 * （app.css 的 `.option-selected`：muted 邊框 ＋ hairline 底），跟情境選擇
 * 與裝備分類同一組訊號。
 */
.zone-chip:has(input:checked) {
  border-color: var(--color-muted);
  background: var(--color-hairline);
}

/*
 * **藏掉原生控制項就必須自己接回焦點框。** 焦點原本畫在那個方塊上，
 * 方塊不見了，鍵盤使用者就完全看不出停在哪一顆（WCAG SC 2.4.7）。
 * 沿用 ContextSelector 的做法。
 */
.zone-chip:has(input:focus-visible) {
  outline: 0.15rem solid var(--focus-ring);
  outline-offset: 0.2rem;
}

.zone-chip--locked {
  opacity: 0.75;
}
</style>
