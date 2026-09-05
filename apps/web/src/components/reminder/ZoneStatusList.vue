<script setup lang="ts">
import type { PrimaryAction, ZoneProjection } from "@sunshield/contracts";
import DisclosurePanel from "../common/DisclosurePanel.vue";
import { computed, ref } from "vue";
import ChevronLink from "../common/ChevronLink.vue";
import { useCurrentTime } from "../../composables/useCurrentTime";
import {
  getZoneLabel,
  isReminderActionDue
} from "../../features/reminder/reminderPresentation";

interface Props {
  primaryAction: PrimaryAction;
  zones: ZoneProjection[];
}

type ZoneTone = "tracking" | "soon" | "due" | "untimed" | "neutral";

interface ZoneChip {
  id: string;
  label: string;
}

interface ZoneGroup {
  status: ZoneProjection["timingStatus"];
  statusLabel: string;
  tone: ZoneTone;
  chips: ZoneChip[];
  /** 整個群組共有的說明。只有每一個部位都有這個原因時才成立。 */
  sharedNotice: string | null;
  collapsible: boolean;
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
    zone.timingStatus === "tracking" || zone.timingStatus === "reapply_soon";

  return isAffected &&
    canBecomeDue &&
    isReminderActionDue(props.primaryAction, currentTime.value)
    ? "reapply_due"
    : zone.timingStatus;
}

/**
 * 群組層級的共有說明。
 *
 * 2026-08-30：原本每個 pill 後面掛一句「・N 個原因」，那個數字**不告訴
 * 使用者任何事**——不知道是什麼原因、也不知道要不要處理。實測（390×844）
 * 8 個部位全是 `tracking` 而且 `reasonCodes` 都只有
 * `PRODUCT_IDENTITY_UNKNOWN`，所以畫面上是同一句話重複八次。
 *
 * 這是 **Session 層級的事實**（同一瓶防曬乳、同一個防護方式），不是部位
 * 層級的差異，所以提到群組層級講一次。
 *
 * **只做 PRODUCT_IDENTITY_UNKNOWN 一個碼**，不做 21 個 ReasonCode 的全表：
 * 其餘的碼要嘛是事件型（流汗、毛巾、碰水），效果已經反映在 `timingStatus`
 * 上、也就是群組標題本身；要嘛會讓部位落到別的群組。只有這一個是「不填
 * 防曬乳的使用者會永遠看到、而且與 2026-08-30 的保守倒數規則直接相關」。
 * 裁決見 docs/decisions/2026-08-30-pending-decisions.md 第三節。
 *
 * 文案刻意不寫「120 分鐘」：那個值是 domain 的 `GENERAL_MAX_MINUTES`，沒有
 * 對外 export，在 UI 寫死會跟著漂。
 */
const SHARED_NOTICES: Partial<Record<ZoneProjection["reasonCodes"][number], string>> =
  {
    PRODUCT_IDENTITY_UNKNOWN: "尚未確認防曬乳標示，採用較保守的補擦間隔。"
  };

/**
 * 可以收合的狀態。
 *
 * `tracking` 與 `not_applicable` 是「現在不用做事」的狀態，佔的 pill 也最
 * 多；需要行動或需要補資料的狀態一律常駐展開——DESIGN.md 第五節的展開收合
 * 契約寫明「採取動作前必須知道的條件」不可收，把「建議現在補擦」藏進
 * disclosure 正是那條要避免的事。
 */
const COLLAPSIBLE_STATUSES = new Set<ZoneProjection["timingStatus"]>([
  "tracking",
  "not_applicable"
]);

// Group zones by status instead of listing every zone as its own row.
// When most zones share a status (the common case), this collapses what
// would be many near-identical rows into one small labeled cluster.
const groups = computed<ZoneGroup[]>(() => {
  const order: ZoneProjection["timingStatus"][] = [];
  const byStatus = new Map<ZoneProjection["timingStatus"], ZoneChip[]>();
  const reasonsByStatus = new Map<
    ZoneProjection["timingStatus"],
    ZoneProjection["reasonCodes"][]
  >();

  for (const zone of props.zones) {
    const status = getEffectiveTimingStatus(zone);
    if (!byStatus.has(status)) {
      byStatus.set(status, []);
      reasonsByStatus.set(status, []);
      order.push(status);
    }
    byStatus.get(status)!.push({
      id: zone.zoneInstanceId,
      label: getZoneLabel(zone)
    });
    reasonsByStatus.get(status)!.push(zone.reasonCodes);
  }

  return order.map((status) => {
    const chips = byStatus.get(status)!;
    const reasonSets = reasonsByStatus.get(status)!;

    return {
      status,
      statusLabel: getTimingLabel(status),
      tone: getTimingTone(status),
      chips,
      sharedNotice: findSharedNotice(reasonSets),
      collapsible: COLLAPSIBLE_STATUSES.has(status) && chips.length > 1
    };
  });
});

/**
 * 只有**每一個**部位都帶這個原因時才算共有。少一個部位有，就不是群組層級
 * 的事實，寧可不顯示也不要說得比實際情況廣。
 */
function findSharedNotice(
  reasonSets: ZoneProjection["reasonCodes"][]
): string | null {
  if (reasonSets.length === 0) return null;

  for (const [code, notice] of Object.entries(SHARED_NOTICES)) {
    if (reasonSets.every((codes) => codes.includes(code as never))) {
      return notice ?? null;
    }
  }
  return null;
}

const expandedStatuses = ref(new Set<ZoneProjection["timingStatus"]>());

function isExpanded(group: ZoneGroup): boolean {
  return !group.collapsible || expandedStatuses.value.has(group.status);
}

function toggle(group: ZoneGroup): void {
  const next = new Set(expandedStatuses.value);
  if (next.has(group.status)) {
    next.delete(group.status);
  } else {
    next.add(group.status);
  }
  expandedStatuses.value = next;
}

function getTimingLabel(timingStatus: ZoneProjection["timingStatus"]): string {
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

function getTimingTone(timingStatus: ZoneProjection["timingStatus"]): ZoneTone {
  if (timingStatus === "tracking") return "tracking";
  if (timingStatus === "reapply_soon") return "soon";
  if (timingStatus === "reapply_due") return "due";
  if (timingStatus === "label_wait" || timingStatus === "untimed_action") {
    return "untimed";
  }
  return "neutral";
}
</script>

<template>
  <section id="zone-status" class="zone-list" aria-labelledby="zones-title">
    <div class="zone-list__heading">
      <div>
        <h2
          id="zones-title"
          class="zone-list__title"
          data-typography-role="section-title"
        >
          各部位狀態
        </h2>
      </div>
    </div>

    <div class="zone-list__groups">
      <div
        v-for="group in groups"
        :key="group.status"
        class="zone-group"
        :class="`zone-group--${group.tone}`"
      >
        <p v-if="!group.collapsible" class="zone-group__status">
          {{ group.statusLabel }}
        </p>
        <!--
          aria-label 明講一次：兩個 span 之間的間隔是 flex gap，視覺上有，
          但 textContent 會連成「建議現在補擦8 個部位」，螢幕閱讀器讀起來
          沒有停頓。
        -->
        <ChevronLink
          v-else
          class="zone-group__toggle"
          :expanded="isExpanded(group)"
          :controls="`zone-group-${group.status}`"
          :label="`${group.statusLabel}，${group.chips.length} 個部位`"
          tone="var(--tone)"
          @click="toggle(group)"
        >
          <span class="zone-group__status">{{ group.statusLabel }}</span>
          <span class="zone-group__count"
            >{{ group.chips.length }} 個部位</span
          >
        </ChevronLink>

        <p v-if="group.sharedNotice !== null" class="zone-group__notice">
          {{ group.sharedNotice }}
        </p>

        <DisclosurePanel :open="isExpanded(group)">
          <ul
            :id="`zone-group-${group.status}`"
            class="zone-group__chips"
          >
            <li
              v-for="chip in group.chips"
              :key="chip.id"
              class="zone-chip user-text"
            >
              {{ chip.label }}
            </li>
          </ul>
        </DisclosurePanel>
      </div>
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
.zone-list {
  display: grid;
  gap: var(--space-5);
  padding-top: var(--space-5);
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
  font-size: var(--font-size-supporting);
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

/*
 * 觸發器用「標籤化按鈕」（DESIGN.md 第五節展開收合契約）：按鈕文字本身
 * 就說明會展開什麼——「提醒進行中 8 個部位」。chevron 換圖示 name，不用
 * transform: rotate，也不加淡入。
 */
/*
 * 2026-08-31：外觀改由 ChevronLink 提供（使用者要求「所有類似五日預報 ›
 * 的按鈕都要同一個大小樣式」），這裡只剩定位用的東西。
 *
 * class 保留是刻意的：既有樣式與測試都以它為錨點。
 */
.zone-group__toggle {
  justify-self: start;
}

.zone-group__count {
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
  font-weight: 400;
}

/*
 * 群組共有的說明。取代原本掛在每個 pill 後面的「・N 個原因」——同一句話
 * 重複八次，而且那個數字不告訴使用者任何事。
 */
.zone-group__notice {
  margin: 0;
  color: var(--text-body);
  font-size: var(--font-size-supporting);
  line-height: var(--line-height-body);
}
</style>
