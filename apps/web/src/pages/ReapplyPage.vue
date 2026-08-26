<script setup lang="ts">
import { nextTick, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useWebAppServices } from "../app/injection";
import Icon from "../components/icons/Icon.vue";
import ReapplicationZoneSelector from "../components/reapplication/ReapplicationZoneSelector.vue";
import ReapplicationProductAssignments from "../components/reapplication/ReapplicationProductAssignments.vue";
import QuickTimePicker from "../components/common/QuickTimePicker.vue";
import ReapplicationReview from "../components/reapplication/ReapplicationReview.vue";
import { getZoneLabel } from "../features/reminder/reminderPresentation";

const { reapplication } = useWebAppServices();
const router = useRouter();

onMounted(() => {
  void reapplication.load();
});
// 2026-08-24：這頁是從首頁主 CTA 進來的，取消／完成／找不到都回首頁。
// 原本回 /reminder（「查看完整狀態」詳細頁），跟進來的地方不一致。
watch(
  () => reapplication.error.value,
  (value) => {
    if (value === "not_found") void router.replace({ name: "home" });
  }
);
watch(
  () => reapplication.phase.value,
  async (value) => {
    if (value === "success") {
      await nextTick();
      document.querySelector<HTMLElement>("#reapply-success-title")?.focus();
    }
  }
);

function cancel(): void {
  void router.push({ name: "home" });
}
function finish(): void {
  void router.push({ name: "home" });
}
function zoneNames(zoneIds: string[]): string {
  return zoneIds
    .map((zoneId) => {
      const zone = reapplication.session.value?.zones.find(
        (item) => item.zoneInstanceId === zoneId
      );
      return zone ? getZoneLabel(zone) : zoneId;
    })
    .join("、");
}
</script>

<template>
  <div class="page-stack reapply-page">
    <header class="flow-heading">
      <div>
        <p class="eyebrow">補擦紀錄</p>
        <h1>記錄補擦</h1>
        <p>請確認要記錄的部位、防曬乳與時間；儲存前不會更新提醒。</p>
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

    <p v-if="reapplication.phase.value === 'loading'" role="status">
      正在讀取目前部位與防曬乳…
    </p>

    <section
      v-else-if="
        reapplication.phase.value === 'success' && reapplication.success.value
      "
      class="app-card success-panel"
    >
      <h2 id="reapply-success-title" tabindex="-1">補擦紀錄已更新</h2>
      <p>
        已更新 {{ reapplication.success.value.zoneIds.length }} 個部位，{{
          new Date(reapplication.success.value.appliedAt).toLocaleString(
            "zh-TW"
          )
        }}。其他未選的部位維持原本狀態。
      </p>
      <ul class="success-groups">
        <li
          v-for="group in reapplication.success.value.productGroups"
          :key="`${group.displayName}-${group.zoneIds.join('-')}`"
        >
          <strong>{{ group.displayName }}</strong
          >：{{ zoneNames(group.zoneIds) }}
        </li>
      </ul>
      <div
        v-if="reapplication.error.value === 'refresh_failed'"
        class="refresh-warning"
        role="alert"
      >
        <p>
          補擦紀錄已儲存，但目前提醒尚未重新讀取。重新整理只會讀取已提交結果，不會再次送出補擦紀錄。
        </p>
        <button
          class="button button--quiet"
          type="button"
          @click="reapplication.refreshCommitted"
        >
          重新整理提醒
        </button>
      </div>
      <button class="button button--primary" type="button" @click="finish">
        返回目前提醒
      </button>
      <p class="correction-note">
        若紀錄有誤，稍後可從事件更正功能處理；本頁目前不會直接改寫已提交紀錄。
      </p>
    </section>

    <template v-else-if="reapplication.session.value">
      <ReapplicationZoneSelector
        :zones="reapplication.session.value.zones"
        :selected-zone-ids="reapplication.selectedZoneIds.value"
        :suggested-zone-ids="reapplication.suggestedZoneIds.value"
        :error="reapplication.fieldErrors.value.zones?.[0]"
        @suggested="reapplication.selectSuggested"
        @all="reapplication.selectAll"
        @toggle="reapplication.toggleZone"
      />
      <ReapplicationProductAssignments
        :zones="reapplication.session.value.zones"
        :selected-zone-ids="reapplication.selectedZoneIds.value"
        :choices="reapplication.productChoices.value"
        :assignments="reapplication.assignments.value"
        :errors="reapplication.fieldErrors.value"
        @assign="reapplication.assignProduct"
      />
      <QuickTimePicker
        :applied-at="reapplication.appliedAt.value"
        :reference-now="reapplication.referenceNow.value"
        :error="reapplication.fieldErrors.value.appliedAt?.[0]"
        @change="reapplication.setAppliedAt"
        @quick="reapplication.setQuickTime"
      />
      <ReapplicationReview
        :zones="reapplication.session.value.zones"
        :selected-zone-ids="reapplication.selectedZoneIds.value"
        :choices="reapplication.productChoices.value"
        :assignments="reapplication.assignments.value"
        :applied-at="reapplication.appliedAt.value"
      />

      <div
        v-if="
          reapplication.error.value &&
          reapplication.error.value !== 'validation'
        "
        class="app-card submit-error"
        role="alert"
      >
        <p>
          {{
            reapplication.error.value === "persistence"
              ? "補擦紀錄尚未儲存。草稿仍保留，請再試一次。"
              : reapplication.error.value === "product_changed"
                ? "防曬乳標示已變更，請重新讀取並確認防曬乳後再提交。"
                : reapplication.error.value === "state_changed"
                  ? "提醒狀態已變更，請重新讀取後確認。"
                  : "補擦紀錄已提交，但目前無法重新讀取提醒。"
          }}
        </p>
        <button
          v-if="
            reapplication.error.value === 'product_changed' ||
            reapplication.error.value === 'state_changed'
          "
          class="button button--quiet"
          type="button"
          @click="reapplication.load"
        >
          重新讀取
        </button>
        <button
          v-else-if="reapplication.error.value === 'persistence'"
          class="button button--quiet"
          type="button"
          @click="reapplication.resetError"
        >
          保留草稿並重試
        </button>
      </div>
      <div class="submit-actions">
        <button
          class="button button--primary"
          type="button"
          :disabled="reapplication.phase.value === 'submitting'"
          @click="reapplication.submit"
        >
          {{
            reapplication.phase.value === "submitting"
              ? "儲存中…"
              : "儲存補擦紀錄"
          }}
        </button>
        <span
          v-if="reapplication.phase.value === 'submitting'"
          class="screen-reader-only"
          role="status"
          >正在儲存補擦紀錄</span
        >
        <button
          class="button button--quiet"
          type="button"
          :disabled="reapplication.phase.value === 'submitting'"
          @click="cancel"
        >
          取消
        </button>
      </div>
      <p class="safety-note">
        記錄補擦只協助回看時間與部位，不代表防護已足夠，也不代表你可以在陽光下待多久。
      </p>
    </template>
  </div>
</template>

<style scoped>
.submit-error {
  display: grid;
  justify-items: start;
  gap: var(--space-3);
  padding: var(--space-5);
}
.submit-error p {
  margin: 0;
}
.correction-note {
  color: var(--text-secondary);
  line-height: 1.6;
}
.success-groups {
  margin: 0;
  padding-inline-start: var(--space-5);
  line-height: 1.6;
}
/*
 * 2026-08-24：原本用 --color-untimed-soft（「未計時」狀態色）。這是
 * role="alert" 的真警告（紀錄已存但提醒沒重讀），跟「未計時」無關；
 * 改用 --color-soon-soft，跟 ProductSnapshotEditor 的 .identity-warning
 * 一致——soon 是這套系統裡的警告色。untimed 今天剛從紫色改成中性灰，
 * 留著只會更像未套樣式。
 */
.refresh-warning {
  display: grid;
  justify-items: start;
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--color-soon-soft);
}
.refresh-warning p {
  margin: 0;
  line-height: 1.6;
}
</style>
