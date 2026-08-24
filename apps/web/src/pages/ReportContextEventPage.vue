<script setup lang="ts">
import { nextTick, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useWebAppServices } from "../app/injection";
import Icon from "../components/icons/Icon.vue";
import { getZoneLabel } from "../features/reminder/reminderPresentation";

const { contextEvent } = useWebAppServices();
const router = useRouter();

onMounted(() => {
  void contextEvent.load();
});

watch(
  () => contextEvent.error.value,
  (value) => {
    if (value === "not_found") void router.replace({ name: "reminder" });
  }
);

watch(
  () => contextEvent.phase.value,
  async (value) => {
    if (value === "success") {
      await nextTick();
      document
        .querySelector<HTMLElement>("#report-success-title")
        ?.focus();
    }
  }
);

function cancel(): void {
  void router.push({ name: "reminder" });
}

function localValue(iso: string): string {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function isQuickSelected(minutes: number): boolean {
  return (
    Math.abs(
      (Date.parse(contextEvent.referenceNow.value) -
        Date.parse(contextEvent.occurredAt.value)) /
        60_000 -
        minutes
    ) < 0.5
  );
}

function zoneNames(zoneIds: string[]): string {
  return zoneIds
    .map((zoneId) => {
      const zone = contextEvent.session.value?.zones.find(
        (item) => item.zoneInstanceId === zoneId
      );
      return zone ? getZoneLabel(zone) : zoneId;
    })
    .join("、");
}
</script>

<template>
  <div class="page-stack report-page">
    <header class="flow-heading">
      <div>
        <p class="eyebrow">記錄狀況</p>
        <h1>記錄這次狀況</h1>
        <p>
          記下這次狀況後，相關部位的提醒會更新；確認前不會改變提醒。
        </p>
      </div>
      <button class="icon-button" type="button" aria-label="返回提醒" @click="cancel">
        <Icon name="tool-close" :size="24" />
      </button>
    </header>

    <p v-if="contextEvent.phase.value === 'loading'" role="status">
      正在讀取目前提醒狀態…
    </p>

    <section
      v-else-if="
        contextEvent.phase.value === 'success' && contextEvent.success.value
      "
      class="app-card success-panel"
    >
      <h2 id="report-success-title" tabindex="-1">已記錄這次狀況</h2>
      <p>
        {{ contextEvent.success.value.label }}，{{
          new Date(contextEvent.success.value.occurredAt).toLocaleString(
            "zh-TW"
          )
        }}。
      </p>
      <p>影響部位：{{ zoneNames(contextEvent.success.value.zoneIds) }}</p>
      <p
        v-if="contextEvent.error.value === 'refresh_failed'"
        class="form-error"
        role="alert"
      >
        狀況紀錄已儲存，但目前提醒尚未重新讀取。
      </p>
      <button class="button button--primary" type="button" @click="cancel">
        返回目前提醒
      </button>
      <p class="correction-note">
        如果紀錄有誤，稍後可以從最近事件更正；本頁不會改寫已提交紀錄。
      </p>
    </section>

    <template v-else-if="contextEvent.session.value">
      <!-- 第一層：事件選擇 -->
      <section class="app-card" aria-labelledby="report-kind-title">
        <h2 id="report-kind-title">發生了什麼？</h2>
        <p class="section-helper">
          選擇最符合的一項。沒有可以結束的水上活動時，不會顯示「離水」。
        </p>
        <div class="kind-grid">
          <button
            v-for="choice in contextEvent.availableChoices.value"
            :key="choice.kind"
            class="kind-option"
            type="button"
            :aria-pressed="contextEvent.selectedKind.value === choice.kind"
            @click="contextEvent.selectKind(choice.kind)"
          >
            <strong>{{ choice.label }}</strong>
            <span>{{ choice.description }}</span>
          </button>
        </div>
        <p
          v-if="contextEvent.fieldErrors.value.kind?.[0]"
          class="form-error"
          role="alert"
        >
          {{ contextEvent.fieldErrors.value.kind[0] }}
        </p>
      </section>

      <!-- 第二層：確認 -->
      <template v-if="contextEvent.selectedKind.value">
        <section class="app-card" aria-labelledby="report-zones-title">
          <h2 id="report-zones-title">影響哪些部位？</h2>
          <p v-if="contextEvent.zoneSelectionLocked.value" class="section-helper">
            離水必須沿用入水時的部位集合，因此這裡不可調整。
          </p>
          <p v-else class="section-helper">
            只勾選這次實際受影響的部位；未勾選的部位狀態不會改變。
          </p>
          <div class="zone-grid">
            <label
              v-for="zone in contextEvent.selectableZones.value"
              :key="zone.zoneInstanceId"
              class="zone-chip"
              :class="{
                'zone-chip--locked': contextEvent.zoneSelectionLocked.value
              }"
            >
              <input
                type="checkbox"
                :checked="
                  contextEvent.selectedZoneIds.value.includes(
                    zone.zoneInstanceId
                  )
                "
                :disabled="contextEvent.zoneSelectionLocked.value"
                @change="contextEvent.toggleZone(zone.zoneInstanceId)"
              >
              <span>{{ getZoneLabel(zone) }}</span>
            </label>
          </div>
          <p
            v-if="contextEvent.fieldErrors.value.zones?.[0]"
            class="form-error"
            role="alert"
          >
            {{ contextEvent.fieldErrors.value.zones[0] }}
          </p>
        </section>

        <!-- 水上 interval 狀態 -->
        <section
          v-if="contextEvent.selectedKind.value === 'water_start'"
          class="app-card"
          aria-labelledby="report-water-title"
        >
          <h2 id="report-water-title">知道實際下水時間嗎？</h2>
          <p class="section-helper">
            不確定時不會建立耐水倒數，避免顯示不可信的時間。
          </p>
          <div class="choice-grid choice-grid--row">
            <label>
              <input
                type="radio"
                name="water-confidence"
                value="confirmed"
                :checked="
                  contextEvent.waterStartConfidence.value === 'confirmed'
                "
                @change="contextEvent.setWaterStartConfidence('confirmed')"
              >
              <span>知道，就是下面選的時間</span>
            </label>
            <label>
              <input
                type="radio"
                name="water-confidence"
                value="unknown"
                :checked="
                  contextEvent.waterStartConfidence.value === 'unknown'
                "
                @change="contextEvent.setWaterStartConfidence('unknown')"
              >
              <span>不確定</span>
            </label>
          </div>
        </section>

        <section class="app-card time-section" aria-labelledby="report-time-title">
          <h2 id="report-time-title">實際什麼時候發生？</h2>
          <div class="quick-times">
            <button
              v-for="item in [
                { label: '剛剛', minutes: 0 },
                { label: '15 分鐘前', minutes: 15 },
                { label: '30 分鐘前', minutes: 30 },
                { label: '60 分鐘前', minutes: 60 }
              ]"
              :key="item.minutes"
              class="button button--quiet"
              type="button"
              :aria-pressed="isQuickSelected(item.minutes)"
              @click="contextEvent.setQuickTime(item.minutes)"
            >
              {{ item.label }}
            </button>
          </div>
          <label for="report-time">自訂日期與時間</label>
          <input
            id="report-time"
            type="datetime-local"
            :value="localValue(contextEvent.occurredAt.value)"
            @change="
              contextEvent.setOccurredAt(
                new Date(
                  ($event.target as HTMLInputElement).value
                ).toISOString()
              )
            "
          >
          <p class="time-summary">
            確認時間：{{
              new Date(contextEvent.occurredAt.value).toLocaleString("zh-TW")
            }}
          </p>
          <p
            v-if="contextEvent.fieldErrors.value.occurredAt?.[0]"
            class="form-error"
            role="alert"
          >
            {{ contextEvent.fieldErrors.value.occurredAt[0] }}
          </p>
        </section>
      </template>

      <p
        v-if="
          contextEvent.error.value !== null &&
          contextEvent.error.value !== 'validation'
        "
        class="form-error"
        role="alert"
      >
        {{
          contextEvent.error.value === "state_changed"
            ? "提醒狀態已改變，請返回提醒頁重新確認後再記錄一次。"
            : contextEvent.error.value === "persistence"
              ? "資料沒有儲存，這次狀況尚未記錄。輸入仍會保留，可以再試一次。"
              : "這次狀況尚未記錄，請確認後再試一次。"
        }}
      </p>

      <div class="submit-actions">
        <button
          class="button button--primary"
          type="button"
          :disabled="contextEvent.phase.value === 'submitting'"
          @click="contextEvent.submit"
        >
          {{
            contextEvent.phase.value === "submitting" ? "記錄中…" : "確認記錄"
          }}
        </button>
        <button
          class="button button--quiet"
          type="button"
          :disabled="contextEvent.phase.value === 'submitting'"
          @click="cancel"
        >
          取消
        </button>
      </div>
      <p class="safety-note">
        記錄只會更新受影響部位的提醒時間，不代表防護效果或你可以在陽光下停留的時間。
      </p>
    </template>
  </div>
</template>

<style scoped>
/*
 * 這頁跟 EventCorrectionPage 一直沿用 .flow-heading／.eyebrow 這兩個
 * class 名稱，但從未實際定義過任何樣式——標題列其實是瀏覽器預設的
 * 直向堆疊，不是設計稿那種橫向排版。跟關閉鈕收斂順手補上，對齊
 * ReapplyPage.vue 已有的版本。
 */
.flow-heading { display: flex; align-items: start; justify-content: space-between; gap: var(--space-4); }
.flow-heading h1, .flow-heading p { margin: 0; }
.flow-heading h1 { font-size: var(--font-size-page-title); }
.flow-heading div { display: grid; gap: var(--space-3); }
.flow-heading div > p:last-child { color: var(--text-secondary); line-height: 1.7; }
.eyebrow { letter-spacing: .16em; }

.app-card {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-5);
}

.success-panel {
  border-top: 0.35rem solid var(--color-success);
}

h2,
p {
  margin: 0;
}

.section-helper {
  color: var(--text-secondary);
  line-height: 1.7;
}

.kind-grid {
  display: grid;
  gap: var(--space-3);
}

.kind-option {
  display: grid;
  gap: var(--space-1);
  padding: var(--space-4);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-primary);
  text-align: start;
  cursor: pointer;
  min-height: var(--tap-target);
}

.kind-option[aria-pressed="true"] {
  border-color: var(--color-primary);
  background: var(--color-surface-cream-strong);
}

.kind-option span {
  color: var(--text-secondary);
}

.zone-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.zone-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-pill, 999px);
  min-height: var(--tap-target);
}

.zone-chip--locked {
  opacity: 0.75;
}

.quick-times {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.time-section input {
  min-height: var(--tap-target);
  padding-inline: var(--space-3);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  background: var(--surface-primary);
}

.time-summary {
  color: var(--text-secondary);
}

.form-error {
  color: var(--color-due);
  line-height: 1.7;
}

.correction-note {
  color: var(--text-secondary);
  line-height: 1.7;
}

.submit-actions {
  display: grid;
  gap: var(--space-3);
}

.submit-actions .button {
  width: 100%;
}

@media (min-width: 36rem) {
  .submit-actions {
    grid-template-columns: 1fr auto;
  }
}
</style>
