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
  <section class="review" aria-labelledby="review-title">
    <h2 id="review-title">確認這次實際補擦</h2>
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
}
h2,
p,
ul {
  margin: 0;
}
p,
li {
  line-height: 1.6;
}
ul {
  padding-inline-start: var(--space-5);
}
</style>
