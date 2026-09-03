<script setup lang="ts">
import { computed } from "vue";
import type { ZoneProjection } from "@sunshield/contracts";
import type { ReapplicationProductChoice } from "../../features/reapplication/createReapplicationController";
import { getZoneLabel } from "../../features/reminder/reminderPresentation";
import { formatDateTime } from "../../helpers/datetime";

const props = defineProps<{
  zones: ZoneProjection[];
  selectedZoneIds: string[];
  choices: ReapplicationProductChoice[];
  assignments: Record<string, string>;
  appliedAt: string;
}>();

const selectedZones = computed(() =>
  props.zones.filter((zone) => props.selectedZoneIds.includes(zone.zoneInstanceId))
);

function productName(zoneInstanceId: string): string {
  return (
    props.choices.find(
      (choice) => choice.choiceId === props.assignments[zoneInstanceId]
    )?.displayName ?? "尚未選擇"
  );
}

/**
 * 依防曬乳分組。
 *
 * **2026-09-03：從「逐條列出每個部位」改成分組摘要。**
 *
 * 改動前這一塊把 13 個部位一行一行再列一次，每一行的右半邊都是同一個
 * 產品名——實測 488px，是這一頁最高的區塊之一，而它的內容**上面三張卡
 * 全部都已經顯示過**（部位清單就在正上方，而且是勾選狀態看得見的）。
 *
 * 分組之後，多數情況（全部同一瓶）只有一行；真的分了不同瓶時才會多幾行，
 * 那時的差異也才是使用者真正需要再確認的東西。
 *
 * 分組形狀刻意與成功頁的 `productGroups` 一致——同一件事在提交前後不該
 * 長成兩種樣子。
 */
const groups = computed(() => {
  const byProduct = new Map<string, string[]>();
  for (const zone of selectedZones.value) {
    const name = productName(zone.zoneInstanceId);
    const labels = byProduct.get(name) ?? [];
    labels.push(getZoneLabel(zone));
    byProduct.set(name, labels);
  }
  return [...byProduct.entries()].map(([displayName, zoneLabels]) => ({
    displayName,
    zoneLabels
  }));
});
</script>
<template>
  <section class="review app-card" aria-labelledby="review-title">
    <h2 id="review-title" data-typography-role="card-title">確認送出</h2>
    <!--
      「只有最後確認的部位會更新」移到頁首說一次就好（2026-09-03）——
      這一頁原本用三種說法講同一件事。
    -->
    <p class="review__summary">
      將更新
      <strong>{{ selectedZones.length }}</strong>
      個部位，{{ formatDateTime(appliedAt) }}。
    </p>
    <!--
      只有一種產品時不再列表：那一行的內容等於上面那句話加一個產品名，
      直接接在後面讀起來比較短。分了不同瓶才需要逐項看。
    -->
    <p v-if="groups.length === 1" class="review__product">
      {{ groups[0]?.displayName }}
    </p>
    <ul v-else class="review__groups">
      <li v-for="group in groups" :key="group.displayName">
        <strong>{{ group.displayName }}</strong
        >：{{ group.zoneLabels.join("、") }}
      </li>
    </ul>
  </section>
</template>
<style scoped>
.review {
  display: grid;
  gap: var(--space-2);
  padding: var(--card-padding);
}
/*
 * 2026-09-03：section-title(20px) → card-title(18px)。同一頁五個區塊標題
 * 原本有兩種字級，這一個與部位那一個是僅有的兩個 20px。
 */
.review h2 {
  font-size: var(--font-size-card-title);
}
.review__summary,
.review__product {
  margin: 0;
  line-height: var(--line-height-body);
}
.review__product {
  color: var(--text-secondary);
}
.review__groups {
  margin: 0;
  padding-inline-start: var(--space-5);
  line-height: var(--line-height-body);
}
</style>
