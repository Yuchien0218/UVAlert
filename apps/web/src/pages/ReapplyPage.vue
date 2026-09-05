<script setup lang="ts">
import { nextTick, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useWebAppServices } from "../app/injection";
import ReapplicationZoneSelector from "../components/reapplication/ReapplicationZoneSelector.vue";
import ReapplyReasonPicker from "../components/reapplication/ReapplyReasonPicker.vue";
import ReapplicationProductAssignments from "../components/reapplication/ReapplicationProductAssignments.vue";
import QuickTimePicker from "../components/common/QuickTimePicker.vue";
import ReapplicationReview from "../components/reapplication/ReapplicationReview.vue";
import { getZoneLabel } from "../features/reminder/reminderPresentation";
import { formatDateTime } from "../helpers/datetime";
import IconButton from "../components/common/IconButton.vue";
import IconLead from "../components/common/IconLead.vue";
import InlineLoader from "../components/feedback/InlineLoader.vue";

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
/**
 * 「現在還不能補擦」的出口（階段二，2026-09-03）。
 *
 * 記錄狀況不再是首頁上與補擦並列的目的地，而是這條路走不通時的岔出——
 * 「遇到了事件＝需要補擦」是主線，「知道發生了但現在補不了」才是例外。
 */
function goToReport(): void {
  void router.push({ name: "reminder-report" });
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
        <h1 data-typography-role="page-title">記錄補擦</h1>
        <!--
          2026-09-03：拿掉「請確認要記錄的部位、防曬乳與時間」。下面每一張卡
          的標題已經把那三件事各問了一次，頁首再列一遍是同一句話說兩次。
          留下的是這一頁唯一還沒被說過的事：按下儲存之前什麼都不會變。
        -->
      </div>
      <IconButton icon="tool-close" label="返回提醒" @click="cancel" />
      <!--
        2026-09-03：成功之後這句要收起來。它與正下方的「補擦紀錄已更新」
        直接矛盾——記錄已經寫進去了，「儲存前不會更新」不再成立。

        同日搬出上面那個 div：說明在圖示鈕下方，不必為按鈕讓出寬度，
        `.flow-heading > p` 讓它橫跨兩欄。
      -->
      <p v-if="reapplication.phase.value !== 'success'">
        儲存前不會更新提醒。
      </p>
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
      <!--
        2026-09-03：「已儲存」的訊號從彩色粗上緣改成領銜圖示
        （`state-success` 的 `<title>` 本來就是「已儲存」）。理由見 app.css
        的 `.success-panel`。
      -->
      <IconLead icon="state-success">
      <h2
        id="reapply-success-title"
        data-typography-role="card-title"
        tabindex="-1"
      >
        補擦紀錄已更新
      </h2>
      </IconLead>
      <p>
        已更新 {{ reapplication.success.value.zoneIds.length }} 個部位，{{
          formatDateTime(reapplication.success.value.appliedAt)
        }}。其他未選的部位維持原本狀態。
      </p>
      <!--
        2026-09-03：只有一組時不用清單。「不同部位用不同防曬乳」拿掉之後
        這裡永遠只有一組，一個項目的項目符號清單讀起來像漏了東西。
      -->
      <p
        v-if="reapplication.success.value.productGroups.length === 1"
        class="success-groups__single user-text"
      >
        <strong>{{
          reapplication.success.value.productGroups[0]?.displayName
        }}</strong
        >：{{
          zoneNames(reapplication.success.value.productGroups[0]?.zoneIds ?? [])
        }}
      </p>
      <ul v-else class="success-groups user-text">
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
      <!--
        「為什麼補擦？」放在最前面（2026-09-02，事件＝需要補擦 階段一）。

        排在部位之前是刻意的：原因是這次補擦的脈絡，先講脈絡再問細節，
        跟記錄狀況那頁「發生了什麼？→ 影響哪些部位？」同一個順序。
      -->
      <ReapplyReasonPicker
        :model-value="reapplication.reason.value"
        @update:model-value="reapplication.setReason"
        @exit="goToReport"
      />
      <ReapplicationZoneSelector
        :zones="reapplication.session.value.zones"
        :selected-zone-ids="reapplication.selectedZoneIds.value"
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
              ? "補擦紀錄尚未儲存，草稿仍保留，可以再試一次。"
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
          <InlineLoader v-if="reapplication.phase.value === 'submitting'" />
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
        <!--
          2026-09-03：`button--quiet` → 文字連結。
          2026-08-31 的裁決是「次要動作用文字連結，實心／描邊按鈕是主行動
          的語彙」，記錄狀況那頁已經照做，這頁漏了——兩個並排的流程，取消
          長得不一樣。
        -->
        <button
          class="text-link submit-actions__cancel"
          data-typography-role="body"
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
  padding: var(--card-padding);
}
.submit-error p {
  margin: 0;
}
/*
 * 2026-09-03：body(16px) → supporting(14px)。它是卡片結尾的補充說明，
 * 跟主要訊息同一個字級會讓兩者讀起來一樣重要。
 */
.correction-note {
  color: var(--text-secondary);
  font-size: var(--font-size-supporting);
  line-height: var(--line-height-body);
}

.success-groups__single {
  margin: 0;
  line-height: var(--line-height-body);
}
.success-groups {
  margin: 0;
  padding-inline-start: var(--space-5);
  line-height: var(--line-height-body);
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
  line-height: var(--line-height-body);
}
</style>
