<script setup lang="ts">
import type { ZoneProjection } from "@sunshield/contracts";
import type { ReapplicationProductChoice } from "../../features/reapplication/createReapplicationController";
import { getZoneLabel } from "../../features/reminder/reminderPresentation";
import { formatDateTime } from "../../helpers/datetime";
defineProps<{
  zones: ZoneProjection[];
  selectedZoneIds: string[];
  choices: ReapplicationProductChoice[];
  assignments: Record<string, string>;
  appliedAt: string;
}>();
</script>
<template>
  <!--
    2026-09-03：補上 `app-card`。這一頁其他四個區塊都是卡片，只有這一塊
    是裸的 section——實測它的左緣在 x=20，鄰居都在 x=41，看起來像跑出去了。
  -->
  <section class="review app-card" aria-labelledby="review-title">
    <h2 id="review-title" data-typography-role="card-title">
      確認這次實際補擦
    </h2>
    <p>只有最後確認的部位會更新；其他部位的時間與狀態不會改變。</p>
    <ul>
      <li
        v-for="zone in zones.filter((item) =>
          selectedZoneIds.includes(item.zoneInstanceId)
        )"
        :key="zone.zoneInstanceId"
      >
        <strong>{{ getZoneLabel(zone) }}</strong
        >：{{
          choices.find(
            (choice) => choice.choiceId === assignments[zone.zoneInstanceId]
          )?.displayName ?? "尚未選擇"
        }}
      </li>
    </ul>
    <p>實際時間：{{ formatDateTime(appliedAt) }}</p>
  </section>
</template>
<style scoped>
.review {
  display: grid;
  gap: var(--space-3);
  padding: var(--card-padding);
}
h2,
p,
ul {
  margin: 0;
}
/*
 * 2026-09-03：section-title(20px) → card-title(18px)。同一頁五個區塊標題
 * 原本有兩種字級，這一個與部位那一個是僅有的兩個 20px。
 */
.review h2 {
  font-size: var(--font-size-card-title);
}
p,
li {
  line-height: var(--line-height-body);
}
ul {
  padding-inline-start: var(--space-5);
}
</style>
