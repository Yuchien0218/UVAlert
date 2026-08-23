<script setup lang="ts">
import type { SessionProjection } from "@sunshield/contracts";
import { computed } from "vue";
import { useCurrentTime } from "../../composables/useCurrentTime";

/**
 * 夜間、且提醒仍在進行時的首屏（wireframe 09）。
 *
 * 這個狀態的主要行動是**結束提醒**，不是補擦——夜間 UV 為 0，繼續倒數
 * 沒有意義，但系統不自動結束，決定權在使用者（Sitemap §4.2）。
 *
 * **刻意不顯示 UV 數值。** wireframe 原本寫「目前 UV 0 低量級」，但預報
 * 資料是日間值不是即時觀測，斷言一個「目前」數字會讓使用者以為有即時
 * 測站。既有的 `NightWindDownPrompt` 也是用「現在紫外線通常較低」這種
 * 不斷言數字的寫法，這裡沿用同一個做法。
 */

const props = defineProps<{ session: SessionProjection }>();

const currentTime = useCurrentTime();

/**
 * Session 起始時間。
 *
 * `SessionProjection` 沒有 session 層級的起始欄位，最早的
 * `zoneTimerStartedAt` 就是第一次塗抹的時間，語意上正是「這次提醒何時
 * 開始」。所有部位都沒有計時起點時回 null，整段不顯示。
 */
const startedAt = computed<number | null>(() => {
  const starts = props.session.zones
    .map((zone) => zone.zoneTimerStartedAt)
    .filter((value): value is string => value !== null)
    .map((value) => Date.parse(value))
    .filter((value) => !Number.isNaN(value));

  return starts.length === 0 ? null : Math.min(...starts);
});

const trackedZoneCount = computed(
  () =>
    props.session.zones.filter(
      (zone) => zone.zoneTimerStartedAt !== null
    ).length
);

const elapsedLabel = computed<string | null>(() => {
  if (startedAt.value === null) return null;

  const minutes = Math.max(
    0,
    Math.floor((currentTime.value.getTime() - startedAt.value) / 60_000)
  );
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return hours === 0 ? `${rest} 分` : `${hours} 小時 ${rest} 分`;
});

const startedLabel = computed<string | null>(() => {
  if (startedAt.value === null) return null;
  return new Date(startedAt.value).toLocaleTimeString("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
});
</script>

<template>
  <section class="night-session" data-testid="home-night-session">
    <p class="night-session__eyebrow">提醒仍在進行</p>

    <p v-if="elapsedLabel !== null" class="stat-figure night-session__figure">
      {{ elapsedLabel }}
    </p>

    <p v-if="startedLabel !== null" class="night-session__meta">
      自 {{ startedLabel }} 開始・{{ trackedZoneCount }} 個追蹤部位
    </p>

    <p class="night-session__body">
      現在不需要防曬。結束提醒後就不會再收到補擦通知。
    </p>
  </section>
</template>

<style scoped>
.night-session {
  display: grid;
  gap: var(--space-2);
}

.night-session__eyebrow {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
}

.night-session__figure {
  margin: 0;
  font-size: clamp(2.25rem, 11vw, 2.75rem);
}

.night-session__meta {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.night-session__body {
  margin-top: var(--space-3);
  margin-bottom: 0;
  color: var(--color-body-strong, var(--text-primary));
  font-size: 0.875rem;
  line-height: 1.7;
}
</style>
