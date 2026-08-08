<script setup lang="ts">
import { Download } from "@lucide/vue";
import { computed, onMounted, shallowRef } from "vue";
import { useWebAppServices } from "../../app/injection";

/**
 * S-19 本機資料管理。
 *
 * 匯出是 2026-08-07 裁決納入 P0 的：不做帳號的前提下，這是唯一能讓
 * 「不想註冊直接使用」的人也有備份手段的做法。因此文案不得暗示雲端
 * 或跨裝置同步，匯入也必須明講不在 P0 範圍。
 */
const { localData } = useWebAppServices();

type ClearScope = "drafts" | "history" | "all";
const confirming = shallowRef<ClearScope | null>(null);

const summary = computed(() => localData.summary.value);
const busy = computed(() => localData.phase.value === "working");

onMounted(() => {
  void localData.load();
});

function formatTime(value: string | null): string {
  return value === null ? "沒有紀錄" : new Date(value).toLocaleString("zh-TW");
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
</script>

<template>
  <div class="page-stack data-page">
    <header class="page-heading">
      <h1>本機資料管理</h1>
      <p>
        這個服務沒有帳號，資料只保存在這台裝置上。匯出的檔案由你的裝置直接產生，不會上傳、不經後端、不進分析。
      </p>
    </header>

    <p v-if="localData.phase.value === 'loading'" role="status">
      正在讀取本機資料概況…
    </p>

    <section
      v-else-if="localData.error.value === 'load_failed'"
      class="app-card"
      role="alert"
    >
      <h2>暫時讀不到本機資料</h2>
      <p>
        目前無法讀取這台裝置上的資料。這不代表資料已經消失，請稍後再試；在讀取成功之前建議先不要執行清除。
      </p>
    </section>

    <template v-else-if="summary">
      <section class="app-card" aria-labelledby="data-summary-title">
        <h2 id="data-summary-title">這台裝置保存了什麼</h2>
        <dl class="summary-grid">
          <div>
            <dt>防曬裝備</dt>
            <dd>{{ summary.productCount }} 筆</dd>
          </div>
          <div>
            <dt>進行中的提醒</dt>
            <dd>{{ summary.hasActiveSession ? "有一個進行中" : "沒有" }}</dd>
          </div>
          <div>
            <dt>已結束的提醒</dt>
            <dd>{{ summary.endedSessionCount }} 次</dd>
          </div>
          <div>
            <dt>未完成的設定草稿</dt>
            <dd>{{ summary.hasSetupDraft ? "有" : "沒有" }}</dd>
          </div>
          <div>
            <dt>最後一次氣象快照</dt>
            <dd>{{ formatTime(summary.lastWeatherSnapshotAt) }}</dd>
          </div>
          <div>
            <dt>最後一次時鐘校準</dt>
            <dd>{{ formatTime(summary.lastClockCalibrationAt) }}</dd>
          </div>
        </dl>
      </section>

      <section class="app-card" aria-labelledby="data-export-title">
        <h2 id="data-export-title">匯出本機資料</h2>
        <p>
          產生一個 JSON 檔案，包含你的防曬裝備、提醒紀錄、事件與偏好。檔案存到你自己選的位置，不會傳到任何伺服器。
        </p>
        <p class="caution">
          匯出檔案<strong>不包含</strong>裝置識別碼、精確座標與任何金鑰。目前版本<strong>只能匯出，不能匯入還原</strong>；還原能力會與帳號遷移政策一起在之後設計。
        </p>
        <button
          class="button button--primary"
          type="button"
          :disabled="busy"
          @click="localData.exportData"
        >
          <Download :size="18" aria-hidden="true" />
          {{ busy ? "處理中…" : "匯出本機資料" }}
        </button>

        <p
          v-if="localData.notice.value?.kind === 'exported'"
          class="notice notice--ok"
          role="status"
        >
          已產生 {{ localData.notice.value.fileName }}。請確認檔案已存到你要的位置。
        </p>
        <p
          v-if="localData.error.value === 'export_failed'"
          class="notice notice--error"
          role="alert"
        >
          匯出沒有完成，檔案沒有產生。本機資料沒有任何變動，可以再試一次。
        </p>
      </section>

      <section class="app-card" aria-labelledby="data-clear-title">
        <h2 id="data-clear-title">清除本機資料</h2>
        <p class="caution">
          清除無法復原。如果想留下紀錄，<strong>請先在上方匯出</strong>。
        </p>

        <p
          v-if="localData.notice.value?.kind === 'cleared'"
          class="notice notice--ok"
          role="status"
        >
          {{
            localData.notice.value.scope === "drafts"
              ? "設定草稿已清除。"
              : localData.notice.value.scope === "history"
                ? "產品與已結束的提醒歷史已清除。"
                : "這台裝置上的資料已全部清除。"
          }}
        </p>
        <p
          v-if="localData.error.value === 'clear_failed'"
          class="notice notice--error"
          role="alert"
        >
          清除沒有完成，資料維持原狀。請稍後再試。
        </p>

        <!-- 清除草稿 -->
        <div class="clear-row">
          <div>
            <strong>清除設定草稿</strong>
            <p>只刪除還沒建立提醒的設定進度。</p>
          </div>
          <button
            v-if="confirming !== 'drafts'"
            class="button button--quiet"
            type="button"
            :disabled="busy || !summary.hasSetupDraft"
            @click="confirming = 'drafts'"
          >
            清除草稿
          </button>
          <template v-else>
            <button
              class="button button--primary"
              type="button"
              :disabled="busy"
              @click="runClear('drafts')"
            >
              確定清除草稿
            </button>
            <button
              class="button button--quiet"
              type="button"
              @click="confirming = null"
            >
              取消
            </button>
          </template>
        </div>

        <!-- 清除產品與歷史 -->
        <div class="clear-row">
          <div>
            <strong>清除產品與歷史</strong>
            <p>
              刪除所有防曬裝備與已結束的提醒紀錄。
              <template v-if="summary.hasActiveSession">
                進行中的提醒<strong>不會</strong>被刪除；要結束它請到提醒頁明確結束，或使用下方的清除全部。
              </template>
            </p>
          </div>
          <button
            v-if="confirming !== 'history'"
            class="button button--quiet"
            type="button"
            :disabled="busy"
            @click="confirming = 'history'"
          >
            清除產品與歷史
          </button>
          <template v-else>
            <p class="confirm-note" role="alert">
              裝備清單與已結束的提醒都會消失，之後建立提醒需要重新填寫包裝標示。確定嗎？
            </p>
            <button
              class="button button--primary"
              type="button"
              :disabled="busy"
              @click="runClear('history')"
            >
              確定清除
            </button>
            <button
              class="button button--quiet"
              type="button"
              @click="confirming = null"
            >
              取消
            </button>
          </template>
        </div>

        <!-- 清除全部 -->
        <div class="clear-row clear-row--danger">
          <div>
            <strong>清除全部本機資料</strong>
            <p>把這台裝置恢復成剛安裝的狀態。</p>
          </div>
          <button
            v-if="confirming !== 'all'"
            class="button button--quiet"
            type="button"
            :disabled="busy"
            @click="confirming = 'all'"
          >
            清除全部
          </button>
          <template v-else>
            <div class="confirm-note" role="alert">
              <p>將會刪除：</p>
              <ul>
                <li>{{ summary.productCount }} 筆防曬裝備</li>
                <li v-if="summary.hasActiveSession">
                  <strong>目前進行中的提醒</strong>（倒數會直接消失）
                </li>
                <li>{{ summary.endedSessionCount }} 次已結束的提醒與全部事件紀錄</li>
                <li>設定草稿、地區與顯示偏好、氣象快取</li>
              </ul>
              <p>
                已安裝的 PWA 不會被移除，但重新開啟時會是全新狀態。
                <template v-if="!localData.hasExportedThisVisit.value">
                  你這次還沒有匯出，清除後無法復原。
                </template>
              </p>
            </div>
            <button
              class="button button--primary"
              type="button"
              :disabled="busy"
              @click="runClear('all')"
            >
              確定清除全部
            </button>
            <button
              class="button button--quiet"
              type="button"
              @click="confirming = null"
            >
              取消
            </button>
          </template>
        </div>
      </section>
    </template>
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
  color: var(--text-secondary);
  line-height: 1.7;
}

.app-card {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-5);
  justify-items: start;
}

.summary-grid {
  display: grid;
  gap: var(--space-3);
  width: 100%;
  margin: 0;
}

.summary-grid > div {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
}

.summary-grid dt {
  color: var(--text-secondary);
}

.caution {
  color: var(--text-secondary);
  line-height: 1.7;
}

.caution strong {
  color: var(--text-primary);
}

.notice {
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  line-height: 1.7;
  width: 100%;
}

.notice--ok {
  background: var(--color-success-soft, var(--surface-raised));
  color: var(--text-secondary);
}

.notice--error {
  color: var(--color-due);
}

.clear-row {
  display: grid;
  gap: var(--space-3);
  justify-items: start;
  width: 100%;
  padding-top: var(--space-4);
  border-top: 1px solid var(--border-strong);
}

.clear-row p {
  color: var(--text-secondary);
  line-height: 1.7;
}

.clear-row--danger strong {
  color: var(--color-due);
}

.confirm-note {
  width: 100%;
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-due);
  color: var(--text-secondary);
  line-height: 1.7;
}

.confirm-note ul {
  margin: var(--space-2) 0;
  padding-inline-start: var(--space-5);
}
</style>
