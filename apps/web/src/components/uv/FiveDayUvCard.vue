<script setup lang="ts">
import type {
  FiveDayUvForecast,
  UvRiskLevel
} from "@sunshield/contracts";
import { CloudSun, RefreshCw } from "@lucide/vue";
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
  const [year, month, day] = localDate
    .split("-")
    .map((part) => Number(part));
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
      return "目前無法讀取已保存的地區與預報資料。";
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
    class="uv-forecast app-card"
    aria-labelledby="five-day-uv-title"
  >
    <div class="uv-forecast__heading">
      <div>
        <h2 id="five-day-uv-title" class="uv-forecast__title">
          未來 5 天 UV
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

    <div
      v-else-if="phase === 'no_region'"
      class="uv-forecast__state"
    >
      <span>
        需先
        <a class="text-link" href="#outdoor-context">設定地區</a>
        方可查看五日紫外線預報。
      </span>
    </div>

    <div
      v-else-if="phase === 'unavailable' || forecast === null"
      class="uv-forecast__state uv-forecast__state--error"
      role="status"
    >
      <strong>
        <span class="uv-forecast__status-dot" aria-hidden="true" />
        五日 UV 暫時無法顯示
      </strong>
      <span>{{ getUnavailableMessage(error) }}</span>
      <button
        class="button button--quiet uv-forecast__retry"
        type="button"
        @click="emit('refresh')"
      >
        <RefreshCw :size="17" aria-hidden="true" />
        再試一次
      </button>
    </div>

    <template v-else>
      <div class="uv-forecast__meta">
        <strong>{{ forecast.region.displayName }}</strong>
        <span v-if="phase === 'cached'" class="uv-forecast__badge">
          已保存資料
        </span>
        <span v-else class="uv-forecast__badge">
          區域預報
        </span>
      </div>

      <ol class="uv-forecast__days" aria-label="未來五日白日時段紫外線預報">
        <li
          v-for="day in forecast.days"
          :key="day.localDate"
          class="uv-day"
          :class="riskClass(day.riskLevel)"
        >
          <span class="uv-day__weekday">
            {{ formatForecastDate(day.localDate).weekday }}
          </span>
          <span class="uv-day__date stat-figure stat-figure--inline">
            {{ formatForecastDate(day.localDate).date }}
          </span>
          <strong class="uv-day__value stat-figure">
            <span class="screen-reader-only">紫外線指數</span>
            {{ day.uvi }}
          </strong>
          <span class="uv-day__level">
            {{ getUvRiskLevelLabel(day.riskLevel) }}
          </span>
        </li>
      </ol>

      <p class="uv-forecast__source">
        {{ forecast.sourceDisplayName }}・F-D0047-091・白日時段
        <span>
          更新
          <span class="uv-forecast__updated-at stat-figure stat-figure--inline">
            {{ formatUpdatedAt(forecast.fetchedAt) }}
          </span>
        </span>
      </p>
      <p class="uv-forecast__note">
        這是區域預報，不是即時測站觀測；UV 高低不會延長或縮短你的補擦計時。
      </p>
    </template>
  </section>
</template>

<style scoped>
.uv-forecast {
  display: grid;
  gap: var(--space-5);
  padding: clamp(1.25rem, 5vw, 1.75rem);
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
  font-size: var(--font-size-page-title);
  font-weight: 500;
}

.uv-forecast__state {
  display: grid;
  justify-items: start;
  gap: var(--space-4);
  color: var(--text-secondary);
  line-height: 1.7;
}

.uv-forecast__state strong,
.uv-forecast__meta strong {
  display: block;
  margin: 0;
  color: var(--text-primary);
  font-weight: 500;
  font-size: 1rem;
}

.uv-forecast__state strong {
  margin-bottom: var(--space-1);
}

.uv-forecast__state span {
  display: block;
  font-size: 0.95rem;
}

.uv-forecast__state--error strong {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.uv-forecast__status-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--color-due);
  flex: 0 0 auto;
}

.uv-forecast__retry {
  min-height: 2.5rem;
  margin-top: var(--space-3);
  padding: var(--space-3) var(--space-4);
  font-size: 0.95rem;
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
  font-size: 0.75rem;
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
  display: grid;
  justify-items: center;
  gap: var(--space-1);
  min-width: 0;
  padding: var(--space-3) var(--space-1);
  border-top: 0.22rem solid var(--color-uvi-low);
  border-radius: var(--radius-sm);
  background: var(--page-background);
  text-align: center;
}

.uv-day--moderate {
  border-top-color: var(--color-uvi-moderate);
}

.uv-day--high {
  border-top-color: var(--color-uvi-high);
}

.uv-day--very-high {
  border-top-color: var(--color-uvi-very-high);
}

.uv-day--extreme {
  border-top-color: var(--color-uvi-extreme);
}

.uv-day__weekday {
  font-weight: 500;
}

.uv-day__date,
.uv-day__level {
  overflow-wrap: anywhere;
  color: var(--text-secondary);
  font-size: 0.72rem;
}

.uv-day__value {
  margin-block: var(--space-1);
  font-size: clamp(1.5rem, 7vw, 2rem);
  font-weight: 500;
  line-height: 1;
}

.uv-forecast__source,
.uv-forecast__note {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.8rem;
  line-height: 1.7;
}

.uv-forecast__source span {
  display: block;
}

@media (max-width: 24rem) {
  .uv-forecast__days {
    gap: var(--space-1);
  }

  .uv-day {
    padding-inline: 0.15rem;
  }

  .uv-day__level {
    font-size: 0.65rem;
  }
}
</style>
