<script setup lang="ts">
import { useRouter } from "vue-router";
import IconButton from "../../components/common/IconButton.vue";
import Icon from "../../components/icons/Icon.vue";
import { computed, onMounted, shallowRef } from "vue";
import { useWebAppServices } from "../../app/injection";
import AppNotice from "../../components/common/AppNotice.vue";
import BackToMoreLink from "../../components/common/BackToMoreLink.vue";
import ConfirmAction from "../../components/common/ConfirmAction.vue";
import EmptyStateCard from "../../components/common/EmptyStateCard.vue";
import BroadcastLoader from "../../components/feedback/BroadcastLoader.vue";
import InlineLoader from "../../components/feedback/InlineLoader.vue";
import { formatMonthDayTime } from "../../helpers/datetime";

/**
 * 本機資料與匯出。
 *
 * 匯出是 2026-08-07 裁決納入 P0 的：不做帳號的前提下，這是唯一能讓
 * 「不想註冊直接使用」的人也有備份手段的做法。因此第一層的文案不得
 * 暗示雲端，匯入也必須明講不在 P0 範圍。
 *
 * 跨裝置同步已提升至獨立「帳號與跨裝置同步」專屬頁面，本頁專注於本機資料管理。
 */
const { localData } = useWebAppServices();

type ClearScope = "drafts" | "history" | "all";
const confirming = shallowRef<ClearScope | null>(null);
const confirmingImport = shallowRef(false);
const selectedFile = shallowRef<File | null>(null);
const fileInputRef = shallowRef<HTMLInputElement | null>(null);

const summary = computed(() => localData.summary.value);
const busy = computed(() => localData.phase.value === "working");

onMounted(() => {
  void localData.load();
});

function formatTime(value: string | null): string {
  return value === null ? "沒有紀錄" : formatMonthDayTime(value);
}

async function runClear(scope: ClearScope): Promise<void> {
  const ok =
    scope === "drafts"
      ? await localData.clearSetupDrafts()
      : scope === "history"
        ? await localData.clearProductsAndHistory()
        : await localData.clearAll();
  if (ok) confirming.value = null;
}

function triggerFileSelect(): void {
  fileInputRef.value?.click();
}

function onFileSelected(event: Event): void {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0] ?? null;
  if (!file) return;
  selectedFile.value = file;
  confirmingImport.value = true;
}

function cancelImport(): void {
  confirmingImport.value = false;
  selectedFile.value = null;
  if (fileInputRef.value) fileInputRef.value.value = "";
}

async function executeImport(): Promise<void> {
  if (!selectedFile.value) return;
  const ok = await localData.importData(selectedFile.value);
  if (ok) {
    confirmingImport.value = false;
    selectedFile.value = null;
    if (fileInputRef.value) fileInputRef.value.value = "";
  }
}

const router = useRouter();

function goBack(): void {
  void router.push({ name: "more" });
}
</script>

<template>
  <div class="page-stack data-page">
    <header class="page-heading page-heading--with-exit">
      <h1 class="page-heading__title" data-typography-role="page-title">
        本機資料與匯出
      </h1>
      <p>
        匯出檔案由裝置直接產生，不會上傳或用於分析。
      </p>
      <IconButton icon="tool-arrow-left" label="返回更多" @click="goBack" />
    </header>

    <BroadcastLoader
      v-if="localData.phase.value === 'loading'"
      label="正在讀取本機資料概況"
    />

    <EmptyStateCard
      v-else-if="localData.error.value === 'load_failed'"
      title="暫時讀不到本機資料"
      body="目前無法讀取這台裝置上的資料。既有資料仍妥善保存中，請稍後重試。在讀取成功前建議先不要執行清除。"
      role="alert"
    />

    <template v-else-if="summary">
      <section class="app-card" aria-labelledby="data-summary-title">
        <h2
          class="section-heading"
          id="data-summary-title"
          data-typography-role="card-title"
        >
          <Icon name="more-data" :size="32" />
          <span>這台裝置儲存了什麼</span>
        </h2>
        <p class="summary-scope">
          此為裝置上的本機紀錄，不含其他裝置或未下載的雲端資料。
        </p>
        <dl class="summary-grid">
          <div>
            <dt>防曬裝備</dt>
            <dd>{{ summary.productCount }} 筆</dd>
          </div>
          <div>
            <dt>進行中提醒</dt>
            <dd>{{ summary.hasActiveSession ? "有" : "沒有紀錄" }}</dd>
          </div>
          <div>
            <dt>已結束的提醒</dt>
            <dd>{{ summary.endedSessionCount }} 次</dd>
          </div>
          <div>
            <dt>未儲存草稿</dt>
            <dd>{{ summary.hasSetupDraft ? "有" : "沒有紀錄" }}</dd>
          </div>
          <div>
            <dt>氣象資料最後更新</dt>
            <dd>{{ formatTime(summary.lastWeatherSnapshotAt) }}</dd>
          </div>
          <div>
            <dt>上次時間校對</dt>
            <dd>{{ formatTime(summary.lastClockCalibrationAt) }}</dd>
          </div>
        </dl>
      </section>

      <section class="app-card" aria-labelledby="data-export-title">
        <h2
          class="section-heading"
          id="data-export-title"
          data-typography-role="card-title"
        >
          <Icon name="tool-download" :size="32" />
          <span>本機備份與還原</span>
        </h2>
        <div class="card-prose">
          <p>
            匯出或還原包含防曬裝備、提醒歷程與偏好設定的 JSON 備份檔案（不含定位與裝置識別碼）。
          </p>
        </div>

        <div class="backup-actions">
          <button
            class="button button--secondary"
            type="button"
            :disabled="busy"
            @click="localData.exportData"
          >
            <InlineLoader v-if="busy && !confirmingImport" />
            {{ busy && !confirmingImport ? "處理中" : "匯出本機資料" }}
          </button>

          <input
            ref="fileInputRef"
            type="file"
            accept=".json,application/json"
            class="visually-hidden"
            @change="onFileSelected"
          />

          <ConfirmAction
            :confirming="confirmingImport"
            :pending="busy"
            trigger-label="匯入備份資料"
            confirm-label="確認覆蓋並還原"
            @trigger="triggerFileSelect"
            @confirm="executeImport"
            @cancel="cancelImport"
          >
            <template #warning>
              <p>
                匯入備份將會<strong>完整覆蓋</strong>這台裝置目前所有的防曬裝備與歷史紀錄。
              </p>
              <p v-if="summary.hasActiveSession">
                <strong>目前進行中的防曬提醒也會被終止並覆蓋。</strong>
              </p>
              <p v-if="selectedFile">
                已選取備份檔案：<code>{{ selectedFile.name }}</code>
              </p>
            </template>
          </ConfirmAction>
        </div>

        <AppNotice v-if="localData.notice.value?.kind === 'exported'" kind="ok">
          已產生
          {{ localData.notice.value.fileName }}。請確認檔案已儲存到你要的位置。
        </AppNotice>
        <AppNotice v-if="localData.notice.value?.kind === 'imported'" kind="ok">
          已成功還原備份資料（共 {{ localData.notice.value.productCount }} 筆防曬裝備、{{ localData.notice.value.sessionCount }} 次提醒紀錄）。
        </AppNotice>
        <AppNotice
          v-if="localData.error.value === 'export_failed'"
          kind="error"
        >
          匯出沒有完成，本機資料沒有任何變動，可以再試一次。
        </AppNotice>
        <AppNotice
          v-if="localData.error.value === 'import_invalid_file'"
          kind="error"
        >
          匯入檔案格式不符合《防曬晴報員》備份規格或已損毀，本機資料維持原狀。
        </AppNotice>
        <AppNotice
          v-if="localData.error.value === 'import_failed'"
          kind="error"
        >
          匯入還原過程發生未預期的錯誤，本機資料已安全復原維持原狀。
        </AppNotice>
      </section>

      <section class="app-card" aria-labelledby="data-clear-title">
        <h2
          class="section-heading"
          id="data-clear-title"
          data-typography-role="card-title"
        >
          <Icon name="tool-delete" :size="32" />
          <span>清除本機資料</span>
        </h2>
        <AppNotice v-if="localData.notice.value?.kind === 'cleared'" kind="ok">
          {{
            localData.notice.value.scope === "drafts"
              ? "設定草稿已清除。"
              : localData.notice.value.scope === "history"
                ? "裝備與提醒紀錄已清除。"
                : "這台裝置上的資料已全部清除。"
          }}
        </AppNotice>
        <AppNotice v-if="localData.error.value === 'clear_failed'" kind="error">
          清除沒有完成，資料維持原狀。請稍後再試。
        </AppNotice>

        <div class="clear-row">
          <p v-if="summary.hasSetupDraft">
            只刪除還沒建立提醒的設定進度。
          </p>
          <ConfirmAction
            :confirming="confirming === 'drafts'"
            :pending="busy"
            :trigger-disabled="!summary.hasSetupDraft"
            :trigger-label="
              summary.hasSetupDraft ? '清除設定草稿' : '沒有草稿可以清除'
            "
            confirm-label="確定清除"
            @trigger="confirming = 'drafts'"
            @confirm="runClear('drafts')"
            @cancel="confirming = null"
          />
        </div>

        <div class="clear-row">
          <p v-if="summary.hasActiveSession">
            進行中的提醒<strong>不會</strong>被刪除。如需結束請至提醒頁明確結束，或點選「清除全部本機資料」。
          </p>
          <ConfirmAction
            :confirming="confirming === 'history'"
            :pending="busy"
            trigger-label="清除裝備與提醒紀錄"
            confirm-label="確定清除"
            @trigger="confirming = 'history'"
            @confirm="runClear('history')"
            @cancel="confirming = null"
          >
            <template #warning>
              <p>
                裝備清單與已結束的提醒會消失且<strong>無法復原</strong>。之後建立提醒需重新填寫包裝標示。
              </p>
            </template>
          </ConfirmAction>
        </div>

        <div class="clear-row clear-row--danger">
          <ConfirmAction
            :confirming="confirming === 'all'"
            :pending="busy"
            trigger-label="清除全部本機資料"
            confirm-label="確定清除"
            @trigger="confirming = 'all'"
            @confirm="runClear('all')"
            @cancel="confirming = null"
          >
            <template #warning>
              <p>將會刪除：</p>
              <ul>
                <li>{{ summary.productCount }} 筆防曬裝備</li>
                <li v-if="summary.hasActiveSession">
                  <strong>目前進行中的提醒</strong>（倒數會直接消失）
                </li>
                <li>
                  {{ summary.endedSessionCount }} 次已結束的提醒與全部事件紀錄
                </li>
                <li>設定草稿、地區與顯示偏好、氣象快取</li>
              </ul>
              <p>已安裝的 PWA 不會被移除，但重新開啟時會是全新狀態。</p>
              <p v-if="!localData.hasExportedThisVisit.value">
                你這次還沒有匯出，清除後無法復原。
              </p>
            </template>
          </ConfirmAction>
        </div>
      </section>
    </template>

    <BackToMoreLink />
  </div>
</template>

<style scoped>
.page-heading {
  display: grid;
  gap: var(--space-2);
}

h1,
h2,
p,
dt,
dd {
  margin: 0;
}

.page-heading p {
  color: var(--text-body);
  line-height: var(--line-height-body);
}

.app-card {
  display: grid;
  gap: var(--space-3);
  padding: var(--card-padding);
  justify-items: start;
}

.app-card > h2 {
  font-size: var(--font-size-card-title);
}

.card-prose {
  display: grid;
  gap: var(--space-2);
  justify-items: start;
}

.summary-scope {
  margin: 0;
  color: var(--text-body);
  font-size: var(--font-size-supporting);
  line-height: var(--line-height-body);
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr;
  width: 100%;
  margin: 0;
  color: var(--text-secondary);
}

@media (min-width: 30rem) {
  .summary-grid {
    grid-template-columns: 1fr 1fr;
    gap: 0 var(--space-4);
  }
}

.summary-grid > div {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-2);
  padding-block: var(--space-2);
  border-top: 1px solid var(--border-subtle);
}

.summary-grid > div:first-child {
  border-top: 0;
}

@media (min-width: 30rem) {
  .summary-grid > div:nth-child(2) {
    border-top: 0;
  }
}

.summary-grid dt {
  flex: 0 0 auto;
}

.caution {
  color: var(--text-body);
  line-height: var(--line-height-body);
}

.clear-row {
  display: grid;
  gap: var(--space-2);
  justify-items: start;
  width: 100%;
  padding-top: var(--space-2);
}

.clear-row p {
  color: var(--text-secondary);
  line-height: var(--line-height-body);
}

.clear-row--danger > .button {
  color: var(--color-due);
}

.clear-row--danger strong {
  color: var(--color-due);
}

.backup-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
}

.backup-actions .button {
  min-width: 8.5rem;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
