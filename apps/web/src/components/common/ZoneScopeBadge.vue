<script setup lang="ts">
import { computed } from "vue";
import type { ZoneProjection } from "@sunshield/contracts";
import { getZoneLabel } from "../../features/reminder/reminderPresentation";

/**
 * 「這件事影響哪些部位」的統一表示法。
 *
 * **為什麼要有這個元件。** 2026-08-31 清點時，同一個問題在兩個地方各有
 * 一種答案：
 *
 *   RecentEventsList   「全部位」膠囊 ／ 「手臂、耳朵」純文字
 *   HomeNightSession   「8 個追蹤部位」純文字
 *
 * 後者報的 8 就是全部位——跟最近事件 2026-08-31 那次裁決是同一件事：
 * **「開始提醒」本來就是全部位，報一個數字沒有告訴讀者任何事。** 兩處
 * 現在走同一段邏輯，數字不再出現。
 *
 * **兩種內容、兩種樣子，這是刻意的**：實際部位名稱是**資料**，用純文字；
 * 「全部位」是**範圍分類**，用膠囊。膠囊在這個 App 裡一律代表分類，
 * 全部都套上去的話它就退化成裝飾。
 *
 * 部位**計數**（各部位狀態的「提醒進行中 8 個部位」）不走這裡——那是
 * 「這個群組裡有幾個」，不是範圍描述。2026-08-31 使用者確認維持純文字。
 */

const props = defineProps<{
  /** 這件事涵蓋的部位 instance id。空陣列時整個元件不輸出。 */
  zoneIds: string[];
  /** 判斷「全部」的分母來源：目前這次提醒的所有部位。 */
  zones: ZoneProjection[];
}>();

/**
 * 涵蓋了全部**追蹤中**的部位。
 *
 * 分母只算 `trackingStatus === "active"`：已經停止追蹤的部位不在這次
 * 提醒的範圍內，把它算進分母的話，「全部位」會永遠成立不了。
 */
const isAllZones = computed(() => {
  if (props.zoneIds.length === 0) return false;
  return (
    props.zoneIds.length ===
    props.zones.filter((zone) => zone.trackingStatus === "active").length
  );
});

const text = computed(() => {
  if (props.zoneIds.length === 0) return "";
  if (isAllZones.value) return "全部位";

  return props.zoneIds
    .map((id) => {
      const zone = props.zones.find((z) => z.zoneInstanceId === id);
      return zone ? getZoneLabel(zone) : id;
    })
    .join("、");
});
</script>

<template>
  <span
    v-if="text !== ''"
    class="zone-scope"
    :class="{ 'zone-scope--all': isAllZones }"
    >{{ text }}</span
  >
</template>

<style scoped>
.zone-scope {
  color: var(--text-secondary);
  white-space: nowrap;
}

/*
 * 膠囊的數值與衛教卡的 kicker 一致（app.css 的 .education-card-status）。
 * 那裡是全域類別、這裡是 scoped，沒有直接共用——但值刻意對齊，兩種膠囊
 * 在同一個 App 裡不該長得不一樣。
 */
.zone-scope--all {
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-pill);
  background: var(--border-subtle);
  font-size: var(--font-size-caption);
}
</style>
