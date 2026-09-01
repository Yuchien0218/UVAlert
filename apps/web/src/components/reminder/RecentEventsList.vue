<script setup lang="ts">
import { ref, computed } from "vue";
import type { ZoneProjection } from "@sunshield/contracts";
import type { SessionEventStreamV1 } from "@sunshield/contracts";
import { getZoneLabel } from "../../features/reminder/reminderPresentation";
import { formatMonthDayTime, formatTime } from "../../helpers/datetime";
import ChevronLink from "../common/ChevronLink.vue";

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

/**
 * 事件影響的部位，顯示在每一列的右欄。
 *
 * **涵蓋全部追蹤中的部位時寫「全部位」**（2026-08-31 使用者要求）。原本
 * 寫「8 個部位」——但「開始提醒」本來就是全部位，報一個數字沒有告訴讀者
 * 任何事；而部分部位的事件顯示的是實際名稱（「手臂、耳朵」），兩者放在
 * 同一欄卻一個是數量一個是名稱，讀起來也不一致。
 *
 * 「全部位」兩者都解決：它是一個範圍描述，跟名稱清單是同一種東西。
 */
/** 這次事件是不是涵蓋了全部追蹤中的部位。 */
function isAllZones(zoneIds: string[], zones: ZoneProjection[]): boolean {
  if (zoneIds.length === 0) return false;
  return (
    zoneIds.length ===
    zones.filter((zone) => zone.trackingStatus === "active").length
  );
}

function getZoneNames(zoneIds: string[], zones: ZoneProjection[]): string {
  if (zoneIds.length === 0) return "";
  if (isAllZones(zoneIds, zones)) return "全部位";

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

    <div id="recent-events-list" class="events-list">
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
          <!--
            2026-08-31：涵蓋全部位時改用膠囊（使用者要求）。

            那一欄有兩種內容：實際部位名稱（「手臂、耳朵」）與範圍描述
            （「全部位」）。名稱是資料，範圍是分類——分類用膠囊，跟衛教
            卡的 kicker 與各部位狀態的 chip 是同一套語彙。
          -->
          <span
            class="event-zones"
            :class="{ 'event-zones--all': isAllZones(event.zoneIds, zones) }"
            >{{ getZoneNames(event.zoneIds, zones) }}</span
          >
        </component>
      </template>
    </div>

    <!--
      2026-08-31：展開鈕從滿寬的 quiet 按鈕改成文字＋箭頭（使用者要求：
      「想變得跟提醒進行中類似」）。

      那顆滿寬按鈕在畫面上比它要展開的內容還醒目——一筆事件的收合控制，
      份量不該大過事件本身。改成跟 ZoneStatusList 的 `.zone-group__toggle`
      同一種樣子：文字在左、箭頭在右，箭頭換圖示 name 而不是 rotate
      （DESIGN.md 第五節的展開收合契約）。
    -->
    <div v-if="displayEvents.length > 1" class="expand-control">
      <ChevronLink
        :expanded="isExpanded"
        controls="recent-events-list"
        @click="isExpanded = !isExpanded"
      >
        {{
          isExpanded ? "收合" : `查看其他 ${displayEvents.length - 1} 筆事件`
        }}
      </ChevronLink>
    </div>
  </section>
</template>

<style scoped>
/*
 * 2026-08-31：拿掉區塊分隔線（使用者要求，與頁首那條同一批）。
 *
 * 區塊之間本來就靠標題與留白分開；線是第二套分隔機制，兩套同時存在會
 * 讓頁面看起來比實際更破碎。padding-top 留著——那是區塊之間的呼吸，
 * 不是線的附屬品。
 */
/*
 * 2026-08-31：上緣加回分隔線（使用者指定位置）。
 *
 * 這跟同一天把提醒頁分隔線全部拿掉不衝突，理由與 UV 區塊那兩條相同：
 * 拿掉的是「每個區塊各自在上緣畫一條」的零散做法；現在只有兩個位置有線
 * ——UV 帶狀區的上下緣，以及這裡。它分開的是「你現在的狀態」與「你做過
 * 什麼」，那是首頁最大的一個轉折。
 */
.events-section {
  display: grid;
  gap: var(--space-4);
  padding-top: var(--space-5);
  border-top: 1px solid var(--border-subtle);
}

.section-header {
  display: grid;
  gap: var(--space-2);
}

/*
 * 2026-08-31：拿掉 --text-secondary（使用者要求統一）。
 *
 * 「最近事件」與「各部位狀態」是首頁下半部兩個平行的區塊標題，但一個是
 * 深咖、一個是次要灰——同一個層級用兩種顏色，讀起來像其中一個比較不重要。
 * 兩者現在都走 section-title 的預設顏色。
 */
#events-title {
  margin: 0;
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
  line-height: var(--line-height-body);
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
  line-height: var(--line-height-body);
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

/*
 * 膠囊的數值與衛教卡的 kicker 一致（app.css 的 .education-card-status）。
 * 那裡是全域類別、這裡是 scoped，沒有直接共用——但值刻意對齊，兩種膠囊
 * 在同一個 App 裡不該長得不一樣。
 */
.event-zones--all {
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-pill);
  background: var(--border-subtle);
  font-size: var(--font-size-caption);
}

.expand-control {
  display: grid;
  padding-top: var(--space-2);
}
</style>
