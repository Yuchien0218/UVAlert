<script setup lang="ts">
import type { FiveDayUvForecast, UvRiskLevel } from "@sunshield/contracts";
import { CloudSun } from "@lucide/vue";
import Icon from "../icons/Icon.vue";
import type {
  UvForecastError,
  UvForecastPhase
} from "../../features/uv/createUvForecastController";
import { getUvRiskLevelLabel } from "../../features/uv/uvForecastRules";

interface Props {
  phase: UvForecastPhase;
  error: UvForecastError;
  forecast: FiveDayUvForecast | null;
}

defineProps<Props>();

const emit = defineEmits<{
  refresh: [];
}>();

function formatForecastDate(localDate: string): {
  weekday: string;
  date: string;
} {
  const [year, month, day] = localDate.split("-").map((part) => Number(part));
  const date = new Date(year!, month! - 1, day!, 12);
  return {
    weekday: new Intl.DateTimeFormat("zh-TW", {
      weekday: "short"
    }).format(date),
    date: `${month}/${day}`
  };
}

function formatUpdatedAt(instant: string): string {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(instant));
}

function riskClass(riskLevel: UvRiskLevel): string {
  return `uv-day--${riskLevel.replace("_", "-")}`;
}

function getUnavailableMessage(error: UvForecastError): string {
  switch (error) {
    case "offline":
      return "目前離線，且這台裝置沒有仍可使用的五日預報。";
    case "storage_error":
      return "目前無法讀取已儲存的地區與預報資料。";
    case "network_error":
      return "暫時無法取得中央氣象署五日預報。";
    case "no_usable_data":
      return "目前沒有仍在有效時段內的五日 UV 預報。";
    case null:
      return "目前沒有可顯示的五日 UV 預報。";
  }
}
</script>

<template>
  <section
    id="five-day-uv"
    class="uv-forecast"
    aria-labelledby="five-day-uv-title"
  >
    <div class="uv-forecast__heading">
      <div>
        <h2 id="five-day-uv-title" class="uv-forecast__title">
          未來 5 天 UV 預報
        </h2>
      </div>
      <CloudSun :size="26" :stroke-width="1.5" aria-hidden="true" />
    </div>

    <div
      v-if="phase === 'idle' || phase === 'loading'"
      class="uv-forecast__state"
      role="status"
    >
      <strong>正在讀取白日時段預報…</strong>
      <span>不會影響目前的本機補擦提醒。</span>
    </div>

    <div v-else-if="phase === 'no_region'" class="uv-forecast__state">
      <span>
        請先
        <a class="text-link" href="#outdoor-context">設定地區</a>
        ，才能查看五日 UV 預報。
      </span>
    </div>

    <div
      v-else-if="phase === 'unavailable' || forecast === null"
      class="uv-forecast__state uv-forecast__state--error"
      role="status"
    >
      <strong>五日 UV 暫時無法顯示</strong>
      <span>{{ getUnavailableMessage(error) }}</span>
      <button
        class="button button--quiet uv-forecast__retry"
        type="button"
        @click="emit('refresh')"
      >
        <Icon name="tool-refresh" :size="20" />
        再試一次
      </button>
    </div>

    <template v-else>
      <div class="uv-forecast__meta">
        <strong>{{ forecast.region.displayName }}</strong>
        <span v-if="phase === 'cached'" class="uv-forecast__badge">
          已儲存資料
        </span>
        <span v-else class="uv-forecast__badge"> 地區預報 </span>
      </div>

      <ol class="uv-forecast__days" aria-label="未來五日白日時段紫外線預報">
        <li
          v-for="day in forecast.days"
          :key="day.localDate"
          class="uv-day"
          :class="riskClass(day.riskLevel)"
        >
          <span class="uv-day__date stat-figure">
            {{ formatForecastDate(day.localDate).date }}
          </span>
          <strong class="uv-day__value stat-figure">
            <span class="screen-reader-only">紫外線指數</span>
            {{ day.uvi }}
          </strong>
          <span
            class="uv-day__level-badge"
            :class="`uv-day__level-badge--${day.riskLevel}`"
            :aria-label="`風險等級：${getUvRiskLevelLabel(day.riskLevel)}`"
          >
            {{ getUvRiskLevelLabel(day.riskLevel) }}
          </span>
        </li>
      </ol>

      <p class="uv-forecast__source">
        {{ forecast.sourceDisplayName }}・F-D0047-091・白日時段
        <span>
          更新時間
          <span class="uv-forecast__updated-at stat-figure stat-figure--inline">
            {{ formatUpdatedAt(forecast.fetchedAt) }}
          </span>
        </span>
      </p>
      <p class="uv-forecast__note">
        這是依地區提供的預報，不是即時測站觀測；UV
        高低不會延長或縮短你的補擦計時。
      </p>
    </template>
  </section>
</template>

<style scoped>
.uv-forecast {
  display: grid;
  gap: var(--space-5);
  padding-top: var(--space-5);
  border-top: 1px solid var(--border-subtle);
  scroll-margin-top: var(--space-6);
}

.uv-forecast__heading,
.uv-forecast__meta {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: var(--space-4);
}

.uv-forecast__title {
  margin: 0;
  font-size: var(--font-size-section-title);
}

.uv-forecast__state {
  display: grid;
  justify-items: start;
  gap: var(--space-3);
  color: var(--text-secondary);
  line-height: 1.6;
}

.uv-forecast__state strong,
.uv-forecast__meta strong {
  display: block;
  margin: 0;
  color: var(--text-primary);
  font-weight: 600;
  font-size: var(--font-size-body);
  line-height: 1.4;
}

.uv-forecast__state span {
  display: block;
  font-size: var(--font-size-body);
}

.uv-forecast__state--error strong {
  color: var(--color-due);
}

/* 不要在這裡寫 min-height：.button 已經帶 min-height: var(--tap-target)，
   區域覆寫只會把點擊目標壓到 44px 以下（先前是 2.5rem = 40px）。 */
.uv-forecast__retry {
  padding: var(--space-3) var(--space-4);
  font-size: var(--font-size-body);
  font-weight: 500;
}

.uv-forecast__meta {
  align-items: center;
}

.uv-forecast__badge {
  padding: var(--space-1) var(--space-3);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-pill);
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
  white-space: nowrap;
}

.uv-forecast__days {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--space-2);
  padding: 0;
  margin: 0;
  list-style: none;
}

.uv-day {
  position: relative;
  display: grid;
  grid-template-rows: auto 1fr auto;
  justify-items: center;
  gap: var(--space-3);
  min-width: 0;
  padding: var(--space-4) var(--space-2);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--surface-primary);
  text-align: center;
  transition: all var(--duration-fast) var(--ease-out);
}

.uv-day:hover {
  border-color: var(--text-secondary);
}

.uv-day--low {
  border-color: var(--color-uvi-low);
}

.uv-day--moderate {
  border-color: var(--color-uvi-moderate);
}

.uv-day--high {
  border-color: var(--color-uvi-high);
}

.uv-day--very-high {
  border-color: var(--color-uvi-very-high);
}

.uv-day--extreme {
  border-color: var(--color-uvi-extreme);
}

.uv-day__date {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  color: var(--text-secondary);
  font-size: var(--font-size-label);
  font-weight: 500;
  line-height: 1;
}

.uv-day__value {
  font-size: clamp(1.8rem, 8vw, 2.5rem);
  font-weight: 600;
  line-height: 1;
}

.uv-day__level-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  height: 2rem;
  padding: 0 var(--space-2);
  border-radius: var(--radius-pill);
  font-size: var(--font-size-caption);
  font-weight: 600;
  white-space: nowrap;
}

.uv-day__level-badge--low {
  background: var(--color-uvi-low);
  color: var(--text-inverse);
}

.uv-day__level-badge--moderate {
  background: var(--color-uvi-moderate);
  color: var(--text-inverse);
}

.uv-day__level-badge--high {
  background: var(--color-uvi-high);
  color: var(--text-inverse);
}

.uv-day__level-badge--very-high {
  background: var(--color-uvi-very-high);
  color: var(--text-inverse);
}

.uv-day__level-badge--extreme {
  background: var(--color-uvi-extreme);
  color: var(--text-inverse);
}

/*
 * 2026-08-25：跟其他 body 級文字一起被批次改成 1.75，但這是 label 級
 * （12.8px）文字，DESIGN.md「說明／標籤」對應的 CJK 行高是 1.5，改回來。
 */
.uv-forecast__source,
.uv-forecast__note {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-label);
  line-height: 1.5;
}

.uv-forecast__source span {
  display: block;
}

@media (max-width: 24rem) {
  .uv-forecast__days {
    gap: var(--space-2);
  }

  .uv-day {
    padding: var(--space-3) var(--space-1);
    gap: var(--space-2);
  }

  .uv-day__date {
    top: var(--space-1);
    right: var(--space-1);
    font-size: 0.7rem;
  }

  .uv-day__value {
    font-size: clamp(1.5rem, 6vw, 2rem);
  }

  .uv-day__level-badge {
    min-width: 1.75rem;
    height: 1.75rem;
    font-size: 0.65rem;
  }
}
</style>
