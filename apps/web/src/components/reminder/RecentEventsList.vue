<script setup lang="ts">
import { ref, computed } from "vue";
import type { ZoneProjection } from "@sunshield/contracts";
import type { SessionEventStreamV1 } from "@sunshield/contracts";
import { getZoneLabel } from "../../features/reminder/reminderPresentation";
import { formatMonthDayTime, formatTime } from "../../helpers/datetime";

interface Props {
  zones: ZoneProjection[];
  events: SessionEventStreamV1 | null;
  clockTrusted?: boolean;
}

const props = defineProps<Props>();

/** 每列可點進 S-10 更正；本清單是取得事件 id 的唯一入口。 */
const emit = defineEmits<{
  correct: [eventId: string];
}>();

const isExpanded = ref(false);

/** 供 `查看最近紀錄` 次要 CTA 就地展開（S-07 2026-08-07 裁決）。 */
defineExpose({
  expand(): void {
    isExpanded.value = true;
  }
});

interface DisplayEvent {
  id: string;
  time: Date;
  label: string;
  zoneIds: string[];
  correctable: boolean;
}

function buildDisplayEvents(
  zones: ZoneProjection[],
  events: SessionEventStreamV1 | null
): DisplayEvent[] {
  if (!events) return [];

  const displayEvents: DisplayEvent[] = [];

  // 事件流由持久層先解析過 correction leaf，這裡拿到的都是目前有效版本。
  // 已被取代的舊版不得出現：S-10 的 target 必須是唯一有效 leaf，
  // 點進舊版只會拿到 CORRECTION_CONFLICT。

  // 補擦紀錄以 confirmation group 為單位。個別 applicationEvent 在契約上
  // 不可更正——可更正的是它所屬的 group，走 correctionOfGroupId。
  for (const group of events.applicationConfirmationGroups) {
    displayEvents.push({
      id: group.id,
      time: new Date(group.appliedAt),
      label: "記錄補擦",
      zoneIds: group.confirmedZoneInstanceIds,
      correctable: true
    });
  }

  // 入水事件（water_start）
  for (const event of events.contextEvents) {
    if (event.eventType === "context_event") {
      if (event.contextType === "water_start") {
        const startLabel =
          event.startConfidence === "confirmed" ? "入水" : "入水（時間未知）";
        displayEvents.push({
          id: event.id,
          time: new Date(event.effectiveOccurredAt),
          label: startLabel,
          zoneIds: event.zoneInstanceIds,
          correctable: true
        });
      } else if (event.contextType === "water_end") {
        displayEvents.push({
          id: event.id,
          time: new Date(event.effectiveOccurredAt),
          label: "離開水中",
          zoneIds: event.zoneInstanceIds,
          correctable: true
        });
      } else if (event.contextType === "context_changed") {
        displayEvents.push({
          id: event.id,
          time: new Date(event.effectiveOccurredAt),
          label: "情境變更",
          zoneIds: zones.map((z) => z.zoneInstanceId),
          correctable: false
        });
      } else if (
        event.contextType === "heavy_sweat" ||
        event.contextType === "towel" ||
        event.contextType === "friction" ||
        event.contextType === "hand_wash"
      ) {
        const causeLabels: Record<string, string> = {
          heavy_sweat: "流汗",
          towel: "擦拭",
          friction: "摩擦",
          hand_wash: "洗手"
        };
        displayEvents.push({
          id: event.id,
          time: new Date(event.effectiveOccurredAt),
          label: causeLabels[event.contextType] || "事件",
          zoneIds: event.zoneInstanceIds,
          correctable: true
        });
      }
    }
  }

  // 開始提醒事件
  if (events.sessionStarted) {
    displayEvents.push({
      id: events.sessionStarted.id,
      time: new Date(events.sessionStarted.effectiveStartedAt),
      label: "開始提醒",
      zoneIds: events.sessionStarted.zoneInstanceIds,
      correctable: false
    });
  }

  // 按時間倒序排列（最新在前）
  displayEvents.sort((a, b) => b.time.getTime() - a.time.getTime());

  return displayEvents;
}

const displayEvents = computed(() =>
  buildDisplayEvents(props.zones, props.events)
);

function formatEventTime(date: Date): string {
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();

  if (!sameDay) {
    return formatMonthDayTime(date);
  }

  return formatTime(date);
}

function getZoneNames(zoneIds: string[], zones: ZoneProjection[]): string {
  if (zoneIds.length === 0) return "";
  if (
    zoneIds.length === zones.filter((z) => z.trackingStatus === "active").length
  ) {
    return `${zones.filter((z) => z.trackingStatus === "active").length} 個部位`;
  }
  return zoneIds
    .map((id) => {
      const zone = zones.find((z) => z.zoneInstanceId === id);
      return zone ? getZoneLabel(zone) : id;
    })
    .join("、");
}
</script>

<template>
  <section
    v-if="displayEvents.length > 0"
    class="events-section"
    aria-labelledby="events-title"
  >
    <div class="section-header">
      <h2 id="events-title" data-typography-role="section-title">最近事件</h2>
    </div>

    <div class="clock-warning" v-if="!clockTrusted" role="alert">
      <p>時間可能不準，但已記錄的事件仍會列在下方。</p>
    </div>

    <div class="events-list">
      <template v-for="(event, index) in displayEvents" :key="event.id">
        <!-- 預設只顯示最新一筆，展開時顯示全部 -->
        <component
          :is="event.correctable ? 'button' : 'div'"
          v-if="index === 0 || isExpanded"
          class="event-row"
          :type="event.correctable ? 'button' : undefined"
          :aria-label="
            event.correctable
              ? `更正 ${formatEventTime(event.time)} 的${event.label}`
              : undefined
          "
          @click="event.correctable && emit('correct', event.id)"
        >
          <span class="event-time">{{ formatEventTime(event.time) }}</span>
          <span class="event-label">{{ event.label }}</span>
          <span class="event-zones">{{
            getZoneNames(event.zoneIds, zones)
          }}</span>
        </component>
      </template>
    </div>

    <!-- 展開／收合控制 -->
    <div v-if="displayEvents.length > 1" class="expand-control">
      <button
        class="button button--quiet"
        type="button"
        :aria-expanded="isExpanded"
        @click="isExpanded = !isExpanded"
      >
        {{
          isExpanded ? "收合" : `查看其他 ${displayEvents.length - 1} 筆事件`
        }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.events-section {
  display: grid;
  gap: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--border-subtle);
}

.section-header {
  display: grid;
  gap: var(--space-2);
}

#events-title {
  margin: 0;
  color: var(--text-secondary);
}

/*
 * 2026-08-24：原本用 --color-untimed-soft（「未計時」狀態色）。這是
 * role="alert" 的真警告（時間可能不準），改用系統的警告色 soon，
 * 跟 .identity-warning 一致。
 */
.clock-warning {
  padding: var(--space-3) var(--space-4);
  background: var(--color-soon-soft);
  border-radius: var(--radius-sm);
}

.clock-warning p {
  margin: 0;
  font-size: var(--font-size-body);
  line-height: 1.6;
  color: var(--text-body);
}

.events-list {
  display: grid;
  gap: var(--space-1);
}

.event-row {
  display: grid;
  width: 100%;
  min-height: var(--tap-target);
  grid-template-columns: auto 1fr auto;
  gap: var(--space-3);
  align-items: baseline;
  padding: var(--space-2) 0;
  border: 0;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  font-size: var(--font-size-body);
  line-height: 1.6;
  text-align: left;
}

button.event-row {
  cursor: pointer;
}

button.event-row:hover .event-label {
  text-decoration: underline;
  text-underline-offset: 0.2rem;
}

.event-time {
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  min-width: 3.5rem;
}

.event-label {
  color: var(--text-primary);
  font-weight: 500;
}

.event-zones {
  color: var(--text-secondary);
  text-align: right;
  white-space: nowrap;
}

.expand-control {
  display: grid;
  justify-items: start;
  padding-top: var(--space-2);
}
</style>
