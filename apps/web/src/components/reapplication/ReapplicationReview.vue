<script setup lang="ts">
import { computed } from "vue";
import type { ZoneProjection } from "@sunshield/contracts";
import type { ReapplicationProductChoice } from "../../features/reapplication/createReapplicationController";
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
 * 這次會記錄成哪一瓶。
 *
 * **2026-09-03（使用者裁決）：不再分組。** 前一版依產品分組，是為了
 * 「不同部位用不同防曬乳」那個模式；使用者把那條路拿掉之後，選取的部位
 * 永遠共用同一瓶，分組只會剩下一組。
 *
 * 各部位指派不一致時回 null——與上方那個下拉一致（那時它也是空的）。
 * 顯示其中一瓶會是騙人的：介面已經沒有辦法表達「分開」。
 */
const productLabel = computed<string | null>(() => {
  const names = new Set(
    selectedZones.value.map((zone) => productName(zone.zoneInstanceId))
  );
  return names.size === 1 ? ([...names][0] ?? null) : null;
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
    <p class="review__product">{{ productLabel ?? "尚未選擇防曬乳" }}</p>
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
</style>
