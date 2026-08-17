<script setup lang="ts">
import type { PrimaryAction, ZoneProjection } from "@sunshield/contracts";
import { computed } from "vue";
import { useCurrentTime } from "../../composables/useCurrentTime";
import {
  getZoneLabel,
  isReminderActionDue
} from "../../features/reminder/reminderPresentation";

interface Props {
  primaryAction: PrimaryAction;
  zones: ZoneProjection[];
}

type ZoneTone =
  | "tracking"
  | "soon"
  | "due"
  | "untimed"
  | "neutral";

interface ZoneChip {
  id: string;
  label: string;
  reasons: number;
}

interface ZoneGroup {
  status: ZoneProjection["timingStatus"];
  statusLabel: string;
  tone: ZoneTone;
  chips: ZoneChip[];
}

const props = defineProps<Props>();
const currentTime = useCurrentTime();

function getEffectiveTimingStatus(
  zone: ZoneProjection
): ZoneProjection["timingStatus"] {
  const isAffected = props.primaryAction.affectedZoneInstanceIds.includes(
    zone.zoneInstanceId
  );
  const canBecomeDue =
    zone.timingStatus === "tracking" ||
    zone.timingStatus === "reapply_soon";

  return isAffected &&
    canBecomeDue &&
    isReminderActionDue(props.primaryAction, currentTime.value)
    ? "reapply_due"
    : zone.timingStatus;
}

// Group zones by status instead of listing every zone as its own row.
// When most zones share a status (the common case), this collapses what
// would be many near-identical rows into one small labeled cluster.
const groups = computed<ZoneGroup[]>(() => {
  const order: ZoneProjection["timingStatus"][] = [];
  const byStatus = new Map<ZoneProjection["timingStatus"], ZoneChip[]>();

  for (const zone of props.zones) {
    const status = getEffectiveTimingStatus(zone);
    if (!byStatus.has(status)) {
      byStatus.set(status, []);
      order.push(status);
    }
    byStatus.get(status)!.push({
      id: zone.zoneInstanceId,
      label: getZoneLabel(zone),
      reasons: zone.reasonCodes.length
    });
  }

  return order.map((status) => ({
    status,
    statusLabel: getTimingLabel(status),
    tone: getTimingTone(status),
    chips: byStatus.get(status)!
  }));
});

function getTimingLabel(
  timingStatus: ZoneProjection["timingStatus"]
): string {
  const labels: Record<ZoneProjection["timingStatus"], string> = {
    tracking: "提醒進行中",
    reapply_soon: "快到補擦時間",
    reapply_due: "建議現在補擦",
    label_wait: "依產品標示等待",
    untimed_action: "需要補充資料",
    not_applicable: "不使用倒數"
  };
  return labels[timingStatus];
}

function getTimingTone(
  timingStatus: ZoneProjection["timingStatus"]
): ZoneTone {
  if (timingStatus === "tracking") return "tracking";
  if (timingStatus === "reapply_soon") return "soon";
  if (timingStatus === "reapply_due") return "due";
  if (
    timingStatus === "label_wait" ||
    timingStatus === "untimed_action"
  ) {
    return "untimed";
  }
  return "neutral";
}
</script>

<template>
  <section id="zone-status" class="zone-list" aria-labelledby="zones-title">
    <div class="zone-list__heading">
      <div>
        <h2 id="zones-title" class="zone-list__title">各部位狀態</h2>
      </div>
    </div>

    <div class="zone-list__groups">
      <div
        v-for="group in groups"
        :key="group.status"
        class="zone-group"
        :class="`zone-group--${group.tone}`"
      >
        <p class="zone-group__status">{{ group.statusLabel }}</p>
        <ul class="zone-group__chips">
          <li v-for="chip in group.chips" :key="chip.id" class="zone-chip">
            {{ chip.label }}
            <span v-if="chip.reasons > 0" class="zone-chip__reason">
              ・<span class="stat-figure stat-figure--inline">
                {{ chip.reasons }}
              </span>
              個原因
            </span>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.zone-list {
  display: grid;
  gap: var(--space-5);
  padding-top: var(--space-5);
  border-top: 1px solid var(--border-subtle);
  scroll-margin-top: var(--space-8);
}

.zone-list__heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: var(--space-4);
}

.zone-list__title {
  margin: 0;
  font-size: var(--font-size-section-title);
  font-weight: 600;
}

.zone-list__groups {
  display: grid;
  gap: var(--space-4);
}

.zone-group {
  --tone: var(--text-secondary);
  --tone-soft: var(--surface-primary);
  display: grid;
  gap: var(--space-2);
}

.zone-group--tracking {
  --tone: var(--color-tracking);
  --tone-soft: var(--color-tracking-soft);
}

.zone-group--soon {
  --tone: var(--color-soon);
  --tone-soft: var(--color-soon-soft);
}

.zone-group--due {
  --tone: var(--color-due);
  --tone-soft: var(--color-due-soft);
}

.zone-group--untimed {
  --tone: var(--color-untimed);
  --tone-soft: var(--color-untimed-soft);
}

.zone-group__status {
  margin: 0;
  color: var(--tone);
  font-size: var(--font-size-label);
  font-weight: 600;
}

.zone-group__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.zone-chip {
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-pill);
  background: var(--tone-soft);
  color: var(--text-primary);
  font-size: var(--font-size-body);
  font-weight: 500;
  line-height: 1.4;
}

.zone-chip__reason {
  color: var(--text-secondary);
  font-weight: 400;
}
</style>
