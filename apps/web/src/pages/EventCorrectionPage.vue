<script setup lang="ts">
import { computed, nextTick, onMounted, shallowRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useWebAppServices } from "../app/injection";
import Icon from "../components/icons/Icon.vue";
import { getZoneLabel } from "../features/reminder/reminderPresentation";

/**
 * S-10 更正最近事件。
 *
 * 原事件不會被改寫或刪除——這頁送出的是 replace／void 後繼事件。
 */
const { eventCorrection } = useWebAppServices();
const route = useRoute();
const router = useRouter();

const confirmingVoid = shallowRef(false);

const targetId = computed(() =>
  typeof route.params.id === "string" ? route.params.id : ""
);
const isGroup = computed(
  () => eventCorrection.context.value?.kind === "application_group"
);
const alreadyCorrected = computed(
  () => eventCorrection.error.value === "already_corrected"
);

onMounted(() => {
  void eventCorrection.load(targetId.value);
});

watch(
  () => eventCorrection.error.value,
  (value) => {
    if (value === "not_found") void router.replace({ name: "reminder" });
  }
);

watch(
  () => eventCorrection.phase.value,
  async (value) => {
    if (value === "success") {
      await nextTick();
      document
        .querySelector<HTMLElement>("#correction-success-title")
        ?.focus();
    }
  }
);

function back(): void {
  void router.push({ name: "reminder" });
}

function localValue(iso: string): string {
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function isQuickSelected(minutes: number): boolean {
  return (
    Math.abs(
      (Date.parse(eventCorrection.referenceNow.value) -
        Date.parse(eventCorrection.occurredAt.value)) /
        60_000 -
        minutes
    ) < 0.5
  );
}

function zoneNames(zoneIds: string[]): string {
  return zoneIds
    .map((zoneId) => {
      const zone = eventCorrection.session.value?.zones.find(
        (item) => item.zoneInstanceId === zoneId
      );
      return zone ? getZoneLabel(zone) : zoneId;
    })
    .join("、");
}

async function runVoid(): Promise<void> {
  if (await eventCorrection.submitVoid()) confirmingVoid.value = false;
}
</script>

<template>
  <div class="page-stack correction-page">
    <header class="flow-heading">
      <div>
        <p class="eyebrow">更正紀錄</p>
        <h1>更正這筆紀錄</h1>
        <p>
          原本的紀錄會保留下來，你會在後面新增一筆更正。送出前不會改變目前提醒。
        </p>
      </div>
      <button class="icon-button" type="button" aria-label="返回提醒" @click="back">
        <Icon name="tool-close" :size="24" />
      </button>
    </header>

    <p v-if="eventCorrection.phase.value === 'loading'" role="status">
      正在讀取這筆紀錄…
    </p>

    <section
      v-else-if="
        eventCorrection.phase.value === 'success' &&
        eventCorrection.success.value
      "
      class="app-card success-panel"
    >
      <h2 id="correction-success-title" tabindex="-1">
        {{
          eventCorrection.success.value.action === "void"
            ? "已作廢這筆紀錄"
            : "已更正這筆紀錄"
        }}
      </h2>
      <p v-if="eventCorrection.success.value.action === 'void'">
        {{ eventCorrection.success.value.label }}不再影響目前提醒。原紀錄仍保留在事件歷史中。
      </p>
      <p v-else>
        {{ eventCorrection.success.value.label }}已更新為
        {{
          new Date(
            eventCorrection.success.value.occurredAt
          ).toLocaleString("zh-TW")
        }}，影響部位：{{ zoneNames(eventCorrection.success.value.zoneIds) }}。
      </p>
      <button class="button button--primary" type="button" @click="back">
        返回目前提醒
      </button>
    </section>

    <template v-else-if="eventCorrection.context.value">
      <!-- 目標已被更正：顯示最新狀態，不允許建立第二個 successor -->
      <section v-if="alreadyCorrected" class="app-card" role="alert">
        <h2>這筆紀錄已經被更正過</h2>
        <p>
            同一筆紀錄只能更正一次。請返回提醒頁，從最近事件找到最新的一筆再更正。
        </p>
        <button class="button button--primary" type="button" @click="back">
          返回目前提醒
        </button>
      </section>

      <template v-else>
        <section class="app-card" aria-labelledby="correction-zones-title">
          <h2 id="correction-zones-title">影響哪些部位？</h2>
          <p
            v-if="eventCorrection.zoneSelectionLocked.value"
            class="section-helper"
          >
            這段水上活動已經有對應的離水紀錄。改動入水的部位會讓那筆離水失去配對，因此這裡不可調整；需要改的話請先更正離水那一筆。
          </p>
          <p v-else class="section-helper">
            取消勾選的部位會從這筆紀錄移除，其他部位不受影響。
          </p>
          <div class="zone-grid">
            <label
              v-for="zone in eventCorrection.selectableZones.value"
              :key="zone.zoneInstanceId"
              class="zone-chip"
            >
              <input
                type="checkbox"
                :checked="
                  eventCorrection.selectedZoneIds.value.includes(
                    zone.zoneInstanceId
                  )
                "
                :disabled="eventCorrection.zoneSelectionLocked.value"
                @change="eventCorrection.toggleZone(zone.zoneInstanceId)"
              >
              <span>{{ getZoneLabel(zone) }}</span>
            </label>
          </div>
          <p
            v-if="eventCorrection.fieldErrors.value.zones?.[0]"
            class="form-error"
            role="alert"
          >
            {{ eventCorrection.fieldErrors.value.zones[0] }}
          </p>
          <p v-if="isGroup" class="section-helper">
            這次補擦使用的防曬乳會原樣沿用，更正不會改變防曬乳紀錄。
          </p>
        </section>

        <section class="app-card time-section" aria-labelledby="correction-time-title">
          <h2 id="correction-time-title">
            {{ isGroup ? "實際何時補擦？" : "實際什麼時候發生？" }}
          </h2>
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
              @click="eventCorrection.setQuickTime(item.minutes)"
            >
              {{ item.label }}
            </button>
          </div>
          <label for="correction-time">自訂日期與時間</label>
          <input
            id="correction-time"
            type="datetime-local"
            :value="localValue(eventCorrection.occurredAt.value)"
            @change="
              eventCorrection.setOccurredAt(
                new Date(
                  ($event.target as HTMLInputElement).value
                ).toISOString()
              )
            "
          >
          <p class="time-summary">
            更正後：{{
              new Date(eventCorrection.occurredAt.value).toLocaleString("zh-TW")
            }}
          </p>
          <p
            v-if="eventCorrection.fieldErrors.value.occurredAt?.[0]"
            class="form-error"
            role="alert"
          >
            {{ eventCorrection.fieldErrors.value.occurredAt[0] }}
          </p>
        </section>

        <p
          v-if="
            eventCorrection.error.value !== null &&
            eventCorrection.error.value !== 'validation'
          "
          class="form-error"
          role="alert"
        >
          {{
            eventCorrection.error.value === "invalid_water_interval"
              ? "這個更正會讓水上活動的起點與終點對不起來，因此沒有送出。原本的紀錄維持不變。"
              : eventCorrection.error.value === "state_changed"
                ? "提醒狀態已經改變，請返回提醒頁重新確認後再更正一次。"
                : eventCorrection.error.value === "persistence"
                  ? "資料沒有儲存，這次更正尚未寫入。輸入仍會保留，可以再試一次。"
                  : "這次更正沒有送出，原本的紀錄維持不變。"
          }}
        </p>

        <div class="submit-actions">
          <button
            class="button button--primary"
            type="button"
            :disabled="eventCorrection.phase.value === 'submitting'"
            @click="eventCorrection.submitReplace"
          >
            {{
              eventCorrection.phase.value === "submitting"
                ? "更正中…"
                : "儲存更正"
            }}
          </button>
          <button
            class="button button--quiet"
            type="button"
            :disabled="eventCorrection.phase.value === 'submitting'"
            @click="back"
          >
            取消
          </button>
        </div>

        <section class="app-card danger-zone">
          <h2>作廢這筆紀錄</h2>
          <template v-if="!confirmingVoid">
            <p>
              如果這筆紀錄根本不該存在，可以作廢它。原紀錄仍會留在事件歷史中，只是不再影響提醒。
            </p>
            <button
              class="button button--quiet"
              type="button"
              @click="confirmingVoid = true"
            >
              作廢這筆紀錄
            </button>
          </template>
          <template v-else>
            <p class="form-error" role="alert">
              作廢後，這筆紀錄對各部位的影響會被移除，倒數會依剩下的紀錄重新計算。
            </p>
            <button
              class="button button--primary"
              type="button"
              :disabled="eventCorrection.phase.value === 'submitting'"
              @click="runVoid"
            >
              作廢這筆紀錄
            </button>
            <button
              class="button button--quiet"
              type="button"
              @click="confirmingVoid = false"
            >
              取消
            </button>
          </template>
        </section>
      </template>
    </template>
  </div>
</template>

<style scoped>
.app-card {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-5);
}

.success-panel {
  border-top: 0.35rem solid var(--color-success);
}

h1,
h2,
p {
  margin: 0;
}

/*
 * 跟 ReportContextEventPage 一直沿用 .flow-heading／.eyebrow 這兩個
 * class 名稱，但只定義過 `.flow-heading p` 的顏色，沒有版面（橫向排列、
 * 內距 div 的直向堆疊）——標題列其實是瀏覽器預設的直向堆疊。跟關閉鈕
 * 收斂順手補上，對齊 ReapplyPage.vue 已有的版本。
 */
.flow-heading { display: flex; align-items: start; justify-content: space-between; gap: var(--space-4); }
.flow-heading h1 { font-size: var(--font-size-page-title); }
.flow-heading div { display: grid; gap: var(--space-3); }
.flow-heading div > p:last-child {
  color: var(--text-secondary);
  line-height: 1.7;
}

.section-helper {
  color: var(--text-secondary);
  line-height: 1.7;
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

.danger-zone {
  justify-items: start;
}

.danger-zone p {
  color: var(--text-secondary);
  line-height: 1.7;
}

.form-error {
  color: var(--color-due);
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
