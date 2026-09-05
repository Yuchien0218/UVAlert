<script setup lang="ts">
import type { SessionProjection } from "@sunshield/contracts";
import { computed } from "vue";
import { useCurrentTime } from "../../composables/useCurrentTime";
import { formatTime } from "../../helpers/datetime";
import Icon from "../icons/Icon.vue";
import ZoneScopeBadge from "../common/ZoneScopeBadge.vue";

/**
 * 夜間、且提醒仍在進行時的首屏（wireframe 09）。
 *
 * 這個狀態的主要行動是**結束提醒**，不是補擦——夜間 UV 為 0，繼續倒數
 * 沒有意義，但系統不自動結束，決定權在使用者（Sitemap §4.2）。
 *
 * **刻意不顯示倒數與 UV 數值。** 顯示「已進行多久」（往上加），不是
 * 「還有多久要補擦」——夜間補擦倒數沒有行動價值，而預報資料是日間值不是
 * 即時觀測，斷言一個「目前 UV」數字會讓使用者以為有即時測站。
 *
 * 反覆紀錄：2026-08-24 曾一度改為日夜共用版面（顯示倒數與進度條），
 * 2026-08-26 使用者確認改回這個收工版面，理由是「不讓倒數跨夜」。
 * 見 docs/decisions/2026-08-26-night-session-layout-revert.md。
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

/*
 * 2026-08-31：從「8 個追蹤部位」改成 `ZoneScopeBadge`（使用者要求統一）。
 *
 * 那個 8 就是全部位——跟最近事件 2026-08-31 的裁決是同一件事：**報一個
 * 數字沒有告訴讀者任何事**。現在跟最近事件走同一段規則，涵蓋全部時顯示
 * 「全部位」膠囊，只涵蓋一部分時顯示實際名稱。
 */
const trackedZoneIds = computed(() =>
  props.session.zones
    .filter((zone) => zone.zoneTimerStartedAt !== null)
    .map((zone) => zone.zoneInstanceId)
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
  return formatTime(startedAt.value);
});
</script>

<template>
  <section class="night-session" data-testid="home-night-session">
    <!--
      2026-08-31：eyebrow 前面補上月亮（使用者要求）。

      這一段的整個前提是「現在是夜間」，但畫面上原本沒有任何東西說出這件事
      ——只有一句「現在不需要防曬」，讀者得自己推。圖示放在 eyebrow 這一列
      而不是內文旁邊：它修飾的是**整個狀態**，不是那一句話。

      20px 是行內記號的檔位（DESIGN.md 第八節）；旁邊就有文字，所以維持
      decorative，不重複播報。
    -->
    <p class="night-session__eyebrow">
      <Icon name="state-night" :size="20" />
      提醒仍在進行
    </p>

    <p v-if="elapsedLabel !== null" class="stat-figure night-session__figure">
      {{ elapsedLabel }}
    </p>

    <p v-if="startedLabel !== null" class="night-session__meta">
      <span>自 {{ startedLabel }} 開始</span>
      <ZoneScopeBadge :zone-ids="trackedZoneIds" :zones="session.zones" />
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
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
}

.night-session__figure {
  margin: 0;
  font-size: clamp(2.25rem, 11vw, 2.75rem);
}

/*
 * 原本是「自 16:54 開始・8 個追蹤部位」一整句。膠囊有自己的內距與底色，
 * 塞進一句話裡會被「・」擠歪，所以改成 flex 兩個項目，用 gap 取代那個
 * 全形間隔號。
 */
.night-session__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-body);
}

.night-session__body {
  margin-top: var(--space-3);
  margin-bottom: 0;
  color: var(--text-emphasis);
  font-size: var(--font-size-body);
  line-height: var(--line-height-body);
}
</style>
