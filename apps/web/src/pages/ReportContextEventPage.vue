<script setup lang="ts">
import { nextTick, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useWebAppServices } from "../app/injection";
import Icon from "../components/icons/Icon.vue";
import QuickTimePicker from "../components/common/QuickTimePicker.vue";
import BroadcastLoader from "../components/feedback/BroadcastLoader.vue";
import ZoneSelectorGrid from "../components/reminder/ZoneSelectorGrid.vue";
import { getZoneLabel } from "../features/reminder/reminderPresentation";
import { formatDateTime } from "../helpers/datetime";

const { contextEvent } = useWebAppServices();
const router = useRouter();

onMounted(() => {
  void contextEvent.load();
});

watch(
  () => contextEvent.error.value,
  (value) => {
    // 2026-08-24：這頁從首頁主 CTA 進來，取消／完成／找不到都回首頁。
    if (value === "not_found") void router.replace({ name: "home" });
  }
);

watch(
  () => contextEvent.phase.value,
  async (value) => {
    if (value === "success") {
      await nextTick();
      document.querySelector<HTMLElement>("#report-success-title")?.focus();
    }
  }
);

function cancel(): void {
  void router.push({ name: "home" });
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
        <h1 data-typography-role="page-title">記錄這次狀況</h1>
        <p>記下這次狀況後，相關部位的提醒會更新；確認前不會改變提醒。</p>
      </div>
      <button
        class="icon-button"
        type="button"
        aria-label="返回提醒"
        @click="cancel"
      >
        <Icon name="tool-close" :size="24" />
      </button>
    </header>

    <BroadcastLoader
      v-if="contextEvent.phase.value === 'loading'"
      label="正在讀取目前提醒狀態…"
    />

    <section
      v-else-if="
        contextEvent.phase.value === 'success' && contextEvent.success.value
      "
      class="app-card success-panel"
    >
      <h2
        id="report-success-title"
        data-typography-role="section-title"
        tabindex="-1"
      >
        已記錄這次狀況
      </h2>
      <p>
        {{ contextEvent.success.value.label }}，{{
          formatDateTime(contextEvent.success.value.occurredAt)
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
        <h2 id="report-kind-title" data-typography-role="card-title">
          發生了什麼？
        </h2>
        <p class="section-helper">
          選擇最符合的一項。沒有可以結束的水上活動時，不會顯示「離水」。
        </p>
        <div class="kind-grid">
          <button
            v-for="choice in contextEvent.availableChoices.value"
            :key="choice.kind"
            class="kind-option app-card"
            :class="{
              'option-selected': contextEvent.selectedKind.value === choice.kind
            }"
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
          <h2 id="report-zones-title" data-typography-role="card-title">
            影響哪些部位？
          </h2>
          <p
            v-if="contextEvent.zoneSelectionLocked.value"
            class="section-helper"
          >
            離水必須沿用入水時的部位集合，因此這裡不可調整。
          </p>
          <p v-else class="section-helper">
            只勾選這次實際受影響的部位；未勾選的部位狀態不會改變。
          </p>
          <ZoneSelectorGrid
            :zones="contextEvent.selectableZones.value"
            :selected-zone-ids="contextEvent.selectedZoneIds.value"
            :locked="contextEvent.zoneSelectionLocked.value"
            @toggle="contextEvent.toggleZone"
          />
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
          <h2 id="report-water-title" data-typography-role="card-title">
            知道實際下水時間嗎？
          </h2>
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
              />
              <span>知道，就是下面選的時間</span>
            </label>
            <label>
              <input
                type="radio"
                name="water-confidence"
                value="unknown"
                :checked="contextEvent.waterStartConfidence.value === 'unknown'"
                @change="contextEvent.setWaterStartConfidence('unknown')"
              />
              <span>不確定</span>
            </label>
          </div>
        </section>

        <QuickTimePicker
          heading="實際什麼時候發生？"
          id-prefix="report-time"
          :applied-at="contextEvent.occurredAt.value"
          :reference-now="contextEvent.referenceNow.value"
          :error="contextEvent.fieldErrors.value.occurredAt?.[0]"
          @change="contextEvent.setOccurredAt"
          @quick="contextEvent.setQuickTime"
        />
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
.app-card {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-5);
}

h2,
p {
  margin: 0;
}

.app-card:not(.success-panel) > h2 {
  font-size: var(--font-size-card-title);
}

.section-helper {
  color: var(--text-secondary);
  line-height: 1.6;
}

.kind-grid {
  display: grid;
  gap: var(--space-3);
}

/*
 * 2026-08-24：這裡原本自己寫了 border 與 background: transparent，
 * scoped 的特異性（.kind-option[data-v-xxx]）高過共用的 .option-selected，
 * 把選取態整組蓋掉——選了以後底色與邊框都沒變，看起來像沒選到。
 * 同一個陷阱今天已經在 ContextSelector 與 ApplicationTimePicker 修過，
 * DESIGN.md 第十節也記過一次（min-height 那次）。
 * 邊框與底色改由共用的 .app-card 提供，這裡只留版面。
 */
.kind-option {
  display: grid;
  gap: var(--space-1);
  padding: var(--space-4);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  text-align: start;
  cursor: pointer;
  min-height: var(--tap-target);
}

.kind-option span {
  color: var(--text-secondary);
}

.correction-note {
  color: var(--text-secondary);
  line-height: 1.6;
}
</style>
