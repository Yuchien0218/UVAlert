<script setup lang="ts">
import { computed } from "vue";
import type {
  RegionError,
  RegionPhase
} from "../../features/region/createRegionController";
import type { RegionSelection } from "@sunshield/contracts";
import Icon from "../icons/Icon.vue";

interface Props {
  phase: RegionPhase;
  error: RegionError;
  candidate: RegionSelection | null;
  approximateAccuracyMeters: number | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  locate: [];
  confirm: [];
}>();

const errorMessage = computed(() => {
  switch (props.error) {
    case "permission_denied":
      return "你沒有允許定位。可以改用下方手動選擇地區。";
    case "position_unavailable":
      return "目前無法取得位置。請稍後重試，或手動選擇地區。";
    case "timeout":
      return "無法取得位置。請確認定位權限，或移到訊號較好的地方重試；你也可以手動選擇地區。";
    case "unsupported":
      return "這個瀏覽器不支援定位，請改用手動選擇。";
    case "outside_supported_area":
      return "無法將目前位置配對到臺灣行政區，請改用手動選擇。";
    case "boundary_ambiguous":
      return "目前位置可能接近行政區邊界，請手動確認地區。";
    case "storage_error":
      return "目前無法儲存地區設定，請再試一次。";
    case "invalid_region":
      return "找不到這個行政區，請重新選擇。";
    case null:
      return "";
    default:
      return "";
  }
});
</script>

<template>
  <section class="location-panel app-card" aria-labelledby="location-title">
    <div class="location-panel__heading">
      <div>
        <p class="eyebrow--mono">裝置定位</p>
        <h2
          id="location-title"
          class="location-panel__title"
          data-typography-role="section-title"
        >
          使用目前位置
        </h2>
      </div>
      <Icon name="feature-locate" :size="24" />
    </div>

    <p class="location-panel__body">
      僅短暫定位以配對行政區，不儲存或分析位置資訊，可手動選擇或略過設定。
    </p>

    <button
      v-if="candidate === null"
      data-testid="use-current-position"
      class="button button--primary location-panel__action"
      type="button"
      :disabled="phase === 'locating' || phase === 'saving'"
      @click="emit('locate')"
    >
      {{ phase === "locating" ? "正在取得位置…" : "使用目前位置" }}
    </button>

    <div
      v-if="candidate !== null"
      class="location-panel__candidate"
      role="region"
      aria-labelledby="location-candidate-title"
      aria-live="polite"
    >
      <h3 id="location-candidate-title" data-typography-role="card-title">
        確認所在行政區
      </h3>
      <p>
        系統配對為 <strong>{{ candidate.displayName }}</strong>
        <template v-if="approximateAccuracyMeters !== null">
          ，這次定位精度約 {{ approximateAccuracyMeters }} 公尺
        </template>
        。請確認後再儲存。
      </p>
      <button
        class="button button--primary"
        type="button"
        :disabled="phase === 'saving'"
        @click="emit('confirm')"
      >
        {{ phase === "saving" ? "正在儲存…" : "確認並使用此地區" }}
      </button>
      <button
        data-testid="relocate"
        class="text-link location-panel__relocate location-panel__relocate--centered"
        type="button"
        :disabled="phase === 'saving'"
        @click="emit('locate')"
      >
        重新定位
      </button>
    </div>

    <p v-if="errorMessage" class="location-panel__error" role="alert">
      {{ errorMessage }}
    </p>
  </section>
</template>

<style scoped>
.location-panel {
  display: grid;
  gap: var(--space-4);
  padding: clamp(1.25rem, 5vw, 1.75rem);
}

.location-panel__heading {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: var(--space-4);
}

.location-panel__title,
.location-panel__body,
.location-panel__candidate h3,
.location-panel__candidate p,
.location-panel__error {
  margin: 0;
}

.location-panel__title {
  margin-top: var(--space-1);
  font-size: var(--font-size-section-title);
}

.location-panel__body {
  color: var(--text-body);
  line-height: var(--line-height-body);
}

.location-panel__candidate p {
  color: var(--text-secondary);
  line-height: var(--line-height-body);
}

.location-panel__candidate {
  display: grid;
  gap: var(--space-3);
  padding-top: var(--space-4);
  border-top: 1px solid var(--border-subtle);
}

.location-panel__candidate h3 {
  font-size: var(--font-size-card-title);
}

.location-panel__relocate {
  min-height: var(--tap-target);
  padding-inline: var(--space-2);
  text-decoration: underline;
  text-underline-offset: 0.2rem;
}

.location-panel__relocate--centered {
  justify-self: center;
}

.location-panel__error {
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--color-due-soft);
  line-height: var(--line-height-body);
}
</style>
