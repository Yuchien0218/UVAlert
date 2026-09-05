<script setup lang="ts">
import { ref, computed } from "vue";
import type { ZoneProjection } from "@sunshield/contracts";
import type { SessionEventStreamV1 } from "@sunshield/contracts";
import { formatMonthDayTime, formatTime } from "../../helpers/datetime";
import ChevronLink from "../common/ChevronLink.vue";
import ZoneScopeBadge from "../common/ZoneScopeBadge.vue";

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

/*
 * 2026-08-31：事件影響的部位（右欄）搬進 `ZoneScopeBadge`。
 *
 * 「涵蓋全部就寫『全部位』、部分就寫名稱」原本只有這一頁做，夜間首頁
 * 仍在寫「8 個追蹤部位」。規則只有一份實作之後兩處自動一致——使用者的
 * 原話是「文字樣式、文字內容、數值都要統一」。
 */
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
          <ZoneScopeBadge
            class="event-zones"
            :zone-ids="event.zoneIds"
            :zones="zones"
          />
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

      2026-08-31 第二次調整（使用者要求「改到最近事件的最後、文字縮短」）：

      **縮短成「更多 1 筆」，不縮成純箭頭。** 使用者原本要求「刪除文字只要
      `>` 符號」，實測下來不能做：裸箭頭沒有可及名稱（螢幕閱讀器只會讀到
      「按鈕」）、命中區從 44px 掉到 20px（過不了 SC 2.5.5）、而且看不出
      按下去會發生什麼。縮短是使用者第二輪確認的折衷。

      **視覺上接成清單的最後一列，但 DOM 仍在 `#recent-events-list` 外面。**
      移進去的話 `aria-controls` 會指向自己所在的容器——那等於宣告「這個
      按鈕會展開包含它自己的區域」，是騙人的。用 `.event-row` 的欄位節奏
      對齊即可，讀者看到的是最後一列，輔助技術拿到的關係仍然正確。
    -->
    <div v-if="displayEvents.length > 1" class="expand-control">
      <ChevronLink
        :expanded="isExpanded"
        controls="recent-events-list"
        :label="
          isExpanded
            ? '收合事件清單'
            : `展開其他 ${displayEvents.length - 1} 筆事件`
        "
        @click="isExpanded = !isExpanded"
      >
        {{ isExpanded ? "收合" : `更多 ${displayEvents.length - 1} 筆` }}
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

/* 顏色、膠囊與 nowrap 都在 ZoneScopeBadge 裡；這裡只管它在這一列的位置。 */
.event-zones {
  text-align: right;
}

/*
 * 接成清單的最後一列：跟 `.event-row` 用同一個縱向節奏（padding 與
 * 列距），所以視覺上它就是清單的一部分，而不是清單下面另外一個東西。
 * 大小與命中區仍然由 ChevronLink 決定，這裡不碰。
 */
.expand-control {
  display: grid;
  justify-items: start;
  margin-top: calc(var(--space-1) * -1);
  padding: var(--space-2) 0;
}
</style>
