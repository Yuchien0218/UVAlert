<script setup lang="ts">
import { TriangleAlert } from "@lucide/vue";
import type {
  ProductLabelSnapshotV1,
  SetupDraftV1,
  SetupDraftZoneV1
} from "@sunshield/contracts";
import { computed } from "vue";
import type { WaterStartFormValue } from "../../features/setup/createSetupController";
import { BODY_ZONE_LABELS } from "../../features/reminder/reminderPresentation";

/**
 * S-05 提交前必顯內容（原 S-06）。
 *
 * 兩步流程後這是唯一的揭露點：快速提醒會自動寫入建議部位，使用者沒有逐一挑選，
 * 所以 AC-34 Scenario B 要求按鈕上方就地顯示完整摘要，不得摺疊隱藏。
 *
 * 必顯五項：情境與水上狀態、追蹤部位、產品 snapshot 標示、
 * 產品資格警示，以及「不代表你可以在陽光下待多久」的提醒。
 */

interface Props {
  draft: SetupDraftV1;
  applicationTime: string | null;
  productSnapshot?: ProductLabelSnapshotV1 | null;
  waterStart?: WaterStartFormValue | null;
}

const props = withDefaults(defineProps<Props>(), {
  productSnapshot: null,
  waterStart: null
});

function getZoneLabel(zone: SetupDraftZoneV1): string {
  return zone.bodyZoneCode === "custom" && zone.customLabel !== null
    ? zone.customLabel
    : BODY_ZONE_LABELS[zone.bodyZoneCode];
}

function getContextLabel(context: string | null): string {
  if (context === null) return "未選擇";
  const labels: Record<string, string> = {
    outdoor_general: "一般戶外",
    outdoor_sport: "戶外運動",
    indoor_window: "室內近直射窗邊",
    indoor_away: "室內遠離直射光",
    water_preparing: "水上活動（準備下水）",
    water_active: "水上活動（已在水中）"
  };
  return labels[context] ?? context;
}

/** 產品資格警示。不合格時必須顯眼呈現，文案取自 Copy Deck 已審查條目。 */
const eligibilityWarning = computed(() => {
  const eligibility =
    props.productSnapshot?.ruleEligibilityAtApplication ?? null;
  if (eligibility === null || eligibility === "eligible") return null;
  const copy: Record<string, { title: string; body: string }> = {
    expired: {
      title: "這瓶防曬乳已超過記錄的有效期限",
      body: "這瓶防曬乳已過期，無法用來建立新的補擦提醒。"
    },
    abnormal_reported: {
      title: "已回報這瓶防曬乳有異常",
      body: "相關部位不再顯示這瓶防曬乳的補擦期限。請停止使用並依包裝警語處理。"
    },
    discomfort_reported: {
      title: "已回報使用這瓶防曬乳後不適",
      body: "請停止使用並依包裝警語處理；需要時尋求醫療協助。"
    },
    no_sunscreen_claim: {
      title: "這瓶防曬乳沒有明確防曬標示",
      body: "這筆紀錄不會產生 120、40 或 80 分鐘期限。"
    },
    identity_unconfirmed: {
      title: "這瓶防曬乳的身分尚未確認",
      body: "這瓶防曬乳的防曬標示尚未確認，暫時無法建立補擦倒數。"
    }
  };
  return copy[eligibility] ?? null;
});

/** 產品包裝標示摘要。曝曬前等待、補擦間隔與耐水都必須揭露。 */
const labelLines = computed(() => {
  const snapshot = props.productSnapshot;
  if (snapshot === null) return [];
  const lines: string[] = [];

  const spfPa = [
    snapshot.spf === null ? null : `SPF ${snapshot.spf}`,
    snapshot.paGrade
  ].filter((value): value is string => value !== null);
  if (spfPa.length > 0) lines.push(spfPa.join("　"));

  lines.push(
    snapshot.preExposureWaitStatus === "explicit_minutes" &&
      snapshot.preExposureWaitMinutes !== null
      ? `曝曬前需等待 ${snapshot.preExposureWaitMinutes} 分鐘`
      : snapshot.preExposureWaitStatus === "no_instruction"
        ? "包裝沒有曝曬前等待說明"
        : "曝曬前等待未確認"
  );

  lines.push(
    snapshot.reapplicationIntervalStatus === "explicit_minutes" &&
      snapshot.reapplicationIntervalMinutes !== null
        ? `包裝標示的補擦間隔 ${snapshot.reapplicationIntervalMinutes} 分鐘`
      : snapshot.reapplicationIntervalStatus === "no_numeric_interval"
        ? "包裝沒有明確補擦分鐘數"
        : "補擦間隔未確認"
  );

  lines.push(
    snapshot.waterResistanceStatus === "40" ||
      snapshot.waterResistanceStatus === "80"
      ? `耐水 ${snapshot.waterResistanceStatus} 分鐘`
      : snapshot.waterResistanceStatus === "not_water_resistant"
        ? "明確標示不耐水"
        : snapshot.waterResistanceStatus === "no_claim"
          ? "沒有耐水標示"
          : "耐水標示未確認"
  );

  return lines;
});

const waterStartText = computed(() => {
  if (props.waterStart === null) return null;
  return props.waterStart.confidence === "confirmed" &&
    props.waterStart.activityStartedAt !== null
    ? `已在水中，入水時間 ${formatTime(props.waterStart.activityStartedAt)}`
    : "已在水中，入水時間不確定（採保守提醒）";
});

function formatTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("zh-TW");
}
</script>

<template>
  <section
    v-if="draft"
    class="completion-summary"
    aria-labelledby="summary-title"
  >
    <h2 id="summary-title">確認這次提醒</h2>
    <p class="summary-help">
      請檢查情境、提醒部位、防曬乳與實際塗抹時間。送出後仍可更正最近的紀錄。
    </p>

    <!-- 警示排在最前，沒有警示時不佔版位 -->
    <div
      v-if="eligibilityWarning"
      class="summary-warning"
      role="alert"
    >
      <TriangleAlert :size="18" aria-hidden="true" />
      <div>
        <strong>{{ eligibilityWarning.title }}</strong>
        <p>{{ eligibilityWarning.body }}</p>
      </div>
    </div>

    <div class="summary-grid">
      <div class="summary-item">
        <h3>情境</h3>
        <p>{{ getContextLabel(draft.initialContext) }}</p>
        <p v-if="waterStartText" class="summary-sub">
          {{ waterStartText }}
        </p>
      </div>

      <div class="summary-item">
        <h3>提醒部位</h3>
        <ul v-if="draft.zones.length > 0">
          <li v-for="zone in draft.zones" :key="zone.draftZoneKey">
            {{ getZoneLabel(zone) }}
          </li>
        </ul>
        <p v-else class="empty-state">尚未選擇部位</p>
      </div>

      <div v-if="labelLines.length > 0" class="summary-item">
        <h3>防曬乳包裝標示</h3>
        <ul>
          <li v-for="line in labelLines" :key="line">{{ line }}</li>
        </ul>
      </div>

      <div v-if="applicationTime" class="summary-item">
        <h3>實際塗抹時間</h3>
        <p>{{ formatTime(applicationTime) }}</p>
      </div>
    </div>

    <p class="summary-note">
      顯示的時間是檢查／補擦提醒，不代表你可以在陽光下待多久。
    </p>
  </section>
</template>

<style scoped>
.completion-summary {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-5);
  background: var(--surface-secondary);
  border-radius: var(--radius-sm);
}

h2 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
}

.summary-help {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.7;
  font-size: 0.875rem;
}

.summary-warning {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-sm);
  border-left: 0.25rem solid var(--color-due);
  background: var(--color-due-soft, var(--surface-secondary));
  color: var(--text-primary);
}

.summary-warning strong {
  display: block;
  font-weight: 600;
}

.summary-warning p {
  margin: var(--space-2) 0 0;
  color: var(--text-secondary);
  line-height: 1.6;
  font-size: 0.875rem;
}

.summary-grid {
  display: grid;
  gap: var(--space-3);
}

.summary-item {
  display: grid;
  gap: var(--space-2);
}

.summary-item h3 {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-secondary);
}

.summary-item p {
  margin: 0;
  color: var(--text-primary);
  line-height: 1.6;
}

.summary-sub {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.summary-item ul {
  margin: 0;
  padding-inline-start: 1.3rem;
  list-style: disc;
}

.summary-item li {
  color: var(--text-primary);
  line-height: 1.6;
}

.empty-state {
  color: var(--text-secondary);
  font-style: italic;
}

.summary-note {
  margin: 0;
  padding-top: var(--space-3);
  border-top: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  line-height: 1.7;
  font-size: 0.875rem;
}
</style>
