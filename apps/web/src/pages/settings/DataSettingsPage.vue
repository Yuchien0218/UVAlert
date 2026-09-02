<script setup lang="ts">
import Icon from "../../components/icons/Icon.vue";
import { computed, onMounted, shallowRef } from "vue";
import { useWebAppServices } from "../../app/injection";
import AppNotice from "../../components/common/AppNotice.vue";
import BackToMoreLink from "../../components/common/BackToMoreLink.vue";
import ChevronLink from "../../components/common/ChevronLink.vue";
import ConfirmAction from "../../components/common/ConfirmAction.vue";
import EmptyStateCard from "../../components/common/EmptyStateCard.vue";
import BroadcastLoader from "../../components/feedback/BroadcastLoader.vue";
import { formatDateTime } from "../../helpers/datetime";

/**
 * S-19 本機資料與隱私。
 *
 * 匯出是 2026-08-07 裁決納入 P0 的：不做帳號的前提下，這是唯一能讓
 * 「不想註冊直接使用」的人也有備份手段的做法。因此第一層的文案不得
 * 暗示雲端，匯入也必須明講不在 P0 範圍。
 *
 * 2026-08-29 把 `/settings/sync` 併進本頁的次要區塊——實作原本把
 * `DESIGN.md` 第五節訂的一張「本機資料與隱私」拆成兩頁，然後又花一
 * 整張卡解釋「你要找的東西在另一頁」。同步的行為完全沒改，只是模板
 * 從兩頁收斂成一頁。裁決見
 * `docs/decisions/2026-08-29-settings-data-sync-merge.md`。
 */
const { auth, localData, sync } = useWebAppServices();

type ClearScope = "drafts" | "history" | "all";
const confirming = shallowRef<ClearScope | null>(null);

const summary = computed(() => localData.summary.value);
const busy = computed(() => localData.phase.value === "working");

/* ---- 次要區塊：跨裝置同步（原 SyncSettingsPage，行為未改） ---- */
const syncDisabled = shallowRef(readSyncDisabled());
const syncBusy = computed(
  () =>
    sync.state.value.status === "preparing" ||
    sync.state.value.status === "syncing"
);
const signedIn = computed(() => auth.state.value.auth.kind === "signed_in");
const preview = computed(() => sync.state.value.preview);

onMounted(() => {
  void localData.load();
  void auth.refresh();
});

function formatTime(value: string | null): string {
  return value === null ? "沒有紀錄" : formatDateTime(value);
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

async function signIn(): Promise<void> {
  await auth.signInWithGoogle();
}

async function prepare(): Promise<void> {
  if (!syncDisabled.value) await sync.preparePreview();
}

async function confirmSync(): Promise<void> {
  await sync.confirm();
}

function cancelSync(): void {
  sync.cancelPreview();
}

function enableSync(): void {
  writeSyncDisabled(false);
  syncDisabled.value = false;
}

function labelFor(kind: string): string {
  switch (kind) {
    case "active_session":
      return "進行中的提醒";
    case "product_catalog":
      return "防曬裝備";
    case "region_preference":
      return "地區設定";
    case "user_preferences":
      return "提醒與顯示偏好";
    default:
      return kind;
  }
}

function statusLabelFor(status: string): string {
  switch (status) {
    case "unchanged":
      return "兩邊相同";
    case "conflict":
      return "需要選擇版本";
    case "local_only":
      return "只有本機資料";
    case "remote_only":
      return "只有雲端資料";
    case "local_deleted":
      return "本機已刪除";
    case "remote_deleted":
      return "雲端已刪除";
    default:
      return "尚未同步";
  }
}

function readSyncDisabled(): boolean {
  return globalThis.localStorage?.getItem("uvalert.sync.disabled") === "true";
}

function writeSyncDisabled(value: boolean): void {
  if (value) globalThis.localStorage?.setItem("uvalert.sync.disabled", "true");
  else globalThis.localStorage?.removeItem("uvalert.sync.disabled");
}
</script>

<template>
  <div class="page-stack data-page">
    <header class="page-heading">
      <h1 class="page-heading__title" data-typography-role="page-title">
        本機資料與隱私
      </h1>
      <p>
        免登入即可使用，未同步的資料只留於本機。匯出檔案由裝置直接產生，絕不上傳或用於分析。
      </p>
    </header>

    <BroadcastLoader
      v-if="localData.phase.value === 'loading'"
      label="正在讀取本機資料概況"
    />

    <EmptyStateCard
      v-else-if="localData.error.value === 'load_failed'"
      title="暫時讀不到本機資料"
      body="目前無法讀取這台裝置上的資料。這不代表資料已經消失，請稍後再試；在讀取成功之前建議先不要執行清除。"
      role="alert"
    />

    <template v-else-if="summary">
      <section class="app-card" aria-labelledby="data-summary-title">
        <h2 id="data-summary-title" data-typography-role="card-title">
          這台裝置儲存了什麼
        </h2>
        <!--
          2026-08-30：補上範圍說明。這些數字只數得到本機 IndexedDB 裡的
          東西——登入同步後雲端可能還有其他裝置上傳的紀錄，這張卡看不到
          也數不到。不講清楚的話，使用者會把「防曬裝備 0 筆」讀成「我的
          資料都不見了」。

          這正是 2026-08-29 settings-data-sync-merge 那次合併要解決的
          「本機 vs 雲端」混淆（見該裁決第九節），只是當時沒有訂這句。
        -->
        <p class="summary-scope">
          以下數量只代表這台裝置上的本機紀錄，不包含其他裝置或尚未下載的雲端資料。
        </p>
        <dl class="summary-grid">
          <div>
            <dt>防曬裝備</dt>
            <dd>{{ summary.productCount }} 筆</dd>
          </div>
          <div>
            <dt>進行中提醒</dt>
            <dd>{{ summary.hasActiveSession ? "有" : "無" }}</dd>
          </div>
          <div>
            <dt>已結束的提醒</dt>
            <dd>{{ summary.endedSessionCount }} 次</dd>
          </div>
          <div>
            <dt>未儲存草稿</dt>
            <dd>{{ summary.hasSetupDraft ? "有" : "無" }}</dd>
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
        <h2 id="data-export-title" data-typography-role="card-title">
          匯出本機資料
        </h2>
        <div class="card-prose">
          <p>
            匯出包含裝備、提醒與偏好的 JSON
            檔案（<strong>不含</strong>定位與裝置識別碼）。
          </p>
          <p class="caution">
            目前<strong>僅支援匯出備份</strong>，匯入還原功能將於後續版本更新。
          </p>
        </div>
        <button
          class="button button--primary"
          type="button"
          :disabled="busy"
          @click="localData.exportData"
        >
          <Icon name="tool-download" :size="20" />
          {{ busy ? "處理中…" : "匯出本機資料" }}
        </button>

        <AppNotice v-if="localData.notice.value?.kind === 'exported'" kind="ok">
          已產生
          {{ localData.notice.value.fileName }}。請確認檔案已儲存到你要的位置。
        </AppNotice>
        <AppNotice
          v-if="localData.error.value === 'export_failed'"
          kind="error"
        >
          匯出沒有完成，檔案沒有產生。本機資料沒有任何變動，可以再試一次。
        </AppNotice>
      </section>

      <section class="app-card" aria-labelledby="data-clear-title">
        <h2 id="data-clear-title" data-typography-role="card-title">
          清除本機資料
        </h2>
        <p class="caution">
          清除後<strong>無法還原</strong>，如需備份請先匯出資料。
        </p>

        <AppNotice v-if="localData.notice.value?.kind === 'cleared'" kind="ok">
          {{
            localData.notice.value.scope === "drafts"
              ? "設定草稿已清除。"
              : localData.notice.value.scope === "history"
                ? "裝備與已結束的提醒歷史已清除。"
                : "這台裝置上的資料已全部清除。"
          }}
        </AppNotice>
        <AppNotice v-if="localData.error.value === 'clear_failed'" kind="error">
          清除沒有完成，資料維持原狀。請稍後再試。
        </AppNotice>

        <!--
          2026-09-01：說明為什麼按鈕是淡的（使用者回報「這頁上面有個按鈕
          顏色比較淡」）。

          查證結果**不是 bug**：「清除草稿」在沒有草稿時是 `disabled`，
          淡色來自 `.button:disabled` 的 opacity 0.55，行為正確。

          但一顆變淡的按鈕如果沒說原因，看起來就像壞掉。上面那張概況卡雖然
          已經寫著「未儲存草稿：無」，那是**另一張卡**的一列，讀者不會自己
          把兩件事連起來。所以在按鈕旁邊直接講。
        -->
        <div class="clear-row">
          <div>
            <strong>清除設定草稿</strong>
            <p>
              {{
                summary.hasSetupDraft
                  ? "只刪除還沒建立提醒的設定進度。"
                  : "目前沒有草稿可以清除。"
              }}
            </p>
          </div>
          <ConfirmAction
            :confirming="confirming === 'drafts'"
            :pending="busy"
            :trigger-disabled="!summary.hasSetupDraft"
            trigger-label="清除草稿"
            confirm-label="清除設定草稿"
            @trigger="confirming = 'drafts'"
            @confirm="runClear('drafts')"
            @cancel="confirming = null"
          />
        </div>

        <!-- 清除裝備與歷史 -->
        <div class="clear-row">
          <div>
            <strong>清除裝備與歷史</strong>
            <p>
              刪除所有防曬裝備與已結束的提醒紀錄。
              <template v-if="summary.hasActiveSession">
                進行中的提醒<strong>不會</strong>被刪除；要結束它請到提醒頁明確結束，或使用下方的清除全部。
              </template>
            </p>
          </div>
          <ConfirmAction
            :confirming="confirming === 'history'"
            :pending="busy"
            trigger-label="清除裝備與歷史"
            confirm-label="清除裝備與歷史"
            @trigger="confirming = 'history'"
            @confirm="runClear('history')"
            @cancel="confirming = null"
          >
            <template #warning>
              裝備清單與已結束的提醒都會消失，之後建立提醒需要重新填寫包裝標示。確定嗎？
            </template>
          </ConfirmAction>
        </div>

        <!-- 清除全部 -->
        <div class="clear-row clear-row--danger">
          <div>
            <strong>清除全部本機資料</strong>
            <p>清除本機資料，重置為初始狀態。</p>
          </div>
          <ConfirmAction
            :confirming="confirming === 'all'"
            :pending="busy"
            trigger-label="清除全部"
            confirm-label="清除全部本機資料"
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
              <p>
                已安裝的 PWA 不會被移除，但重新開啟時會是全新狀態。
                <template v-if="!localData.hasExportedThisVisit.value">
                  你這次還沒有匯出，清除後無法復原。
                </template>
              </p>
            </template>
          </ConfirmAction>
        </div>
      </section>
    </template>

    <!--
      次要區塊：跨裝置同步。

      DESIGN.md 第六節要求每頁只有一個最主要任務。這裡的主任務是本機
      備份（概況／匯出／清除三張 app-card），同步是次要的，所以層級差
      異做在「外框」而不是「字級」——第一層是有底色與內距的卡片，同步
      群組沒有卡片外框，只有一條 hairline 起手，內容直接落在頁面背景
      上。字級不縮小是刻意的：這裡有登入與上傳雲端的決策資訊，縮字會
      變成看不清楚，而不是變次要。
    -->
    <section class="sync-group" aria-labelledby="sync-group-title">
      <h2 id="sync-group-title" data-typography-role="card-title">
        跨裝置同步
      </h2>
      <p class="sync-group__lead">
        登入 Google 帳號可跨裝置同步提醒、裝備與設定。
      </p>

      <div v-if="!signedIn" class="sync-block">
        <h3 class="sync-block__title" data-typography-role="card-title">
          目前使用免登入模式
        </h3>
        <p>本機倒數與資料不會因為沒有登入而受影響。</p>
        <button class="button button--quiet" type="button" @click="signIn">
          使用 Google 登入同步
        </button>
        <AppNotice v-if="auth.state.value.status === 'error'" kind="error">
          登入未完成，請稍後再試（{{
            auth.state.value.errorCode
          }}）。本機資料沒有變動。
        </AppNotice>
      </div>

      <div v-else-if="syncDisabled" class="sync-block">
        <h3 class="sync-block__title" data-typography-role="card-title">
          同步已停止
        </h3>
        <p>雲端資料仍保留；重新開啟同步前，不會再讀取或上傳雲端資料。</p>
        <button class="button button--quiet" type="button" @click="enableSync">
          重新開啟同步
        </button>
      </div>

      <div v-else class="sync-block">
        <h3 class="sync-block__title" data-typography-role="card-title">
          先看同步內容
        </h3>
        <p>確認後才會上傳或下載；遇到版本不同時，系統不會自動覆蓋任何一邊。</p>
        <button
          v-if="preview === null"
          class="button button--quiet"
          type="button"
          :disabled="syncBusy"
          @click="prepare"
        >
          {{ syncBusy ? "讀取中…" : "查看同步預覽" }}
        </button>

        <template v-else>
          <ul class="sync-list" aria-label="同步項目">
            <li
              v-for="item in preview.items"
              :key="`${item.key.recordKind}:${item.key.recordId}`"
            >
              <strong>{{ labelFor(item.key.recordKind) }}</strong>
              <span>{{ statusLabelFor(item.status) }}</span>
            </li>
          </ul>
          <div class="button-row">
            <button
              class="button button--primary"
              type="button"
              :disabled="syncBusy"
              @click="confirmSync"
            >
              {{ syncBusy ? "同步中…" : "同步這些資料" }}
            </button>
            <button
              class="button button--quiet"
              type="button"
              :disabled="syncBusy"
              @click="cancelSync"
            >
              取消
            </button>
          </div>
        </template>

        <AppNotice v-if="sync.state.value.status === 'synced'" kind="ok"
          >同步完成。</AppNotice
        >
        <AppNotice v-if="sync.state.value.error" kind="error">
          {{ sync.state.value.error.message }} 本機資料沒有因雲端錯誤被刪除。
        </AppNotice>
      </div>

      <!--
        2026-09-01：改用 ChevronLink 並靠右（使用者要求：加箭頭、有底線、
        靠右）。

        它是這一段的**出口**——往更深一層的帳號與雲端資料頁。靠右、帶箭頭
        之後跟五日預報那顆是同一種東西：「這裡還有別的可以看」。底線來自
        `<a>` 的瀏覽器預設，ChevronLink 刻意不碰 text-decoration
        （2026-08-31 的裁決）。
      -->
      <ChevronLink class="sync-group__more" to="/settings/account-data">
        管理登入與雲端資料
      </ChevronLink>
    </section>

    <!--
      2026-09-02：補上返回（使用者裁決）。

      這一頁原本**完全沒有返回機制**——沒有右上圖示鈕、沒有頁尾連結、也沒有
      router.back。兩個兄弟頁都給了明確出口（AccountDataPage 有頁尾連結、
      NotificationSettingsPage 有右上圖示鈕），只有它沒有，使用者只能靠底部
      導覽或瀏覽器上一頁。

      **刻意選頁尾連結而不是右上圖示鈕**：叉叉／箭頭要怎麼統一仍在
      `2026-09-02-ui-layout-consistency-audit.md` §1 待裁決。補一個跟
      AccountDataPage 一模一樣的頁尾連結是把缺口補起來，不會替使用者先決定
      那條還沒定的規則。
    -->
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
  gap: var(--space-4);
  padding: var(--card-padding);
  justify-items: start;
}

.app-card > h2 {
  font-size: var(--font-size-card-title);
}

/*
 * 關聯的多段說明收成一個閱讀群組：段落之間 8px，與外層卡片的 16px
 * gap（到按鈕）拉開差距，落實鄰近律。原本兩段 <p> 直屬 .app-card 的
 * grid，段落間距與「段落→按鈕」完全等寬，讀起來像互不相干的句子
 * （2026-09-02 排版稽核 §7.1）。
 */
.card-prose {
  display: grid;
  gap: var(--space-2);
  justify-items: start;
}

/*
 * 2026-08-30：數量的範圍說明。用 supporting ＋ --text-body 而不是
 * --text-secondary——它是「讀這些數字之前必須知道的前提」，不是可有可無
 * 的補充；DESIGN.md 第五節的不可隱藏清單把這類條件列為常駐。
 */
.summary-scope {
  margin: 0;
  color: var(--text-body);
  font-size: var(--font-size-supporting);
  line-height: var(--line-height-body);
}

.summary-grid {
  display: grid;
  width: 100%;
  margin: 0;
}

/*
 * 2026-08-30：改用分隔線而不是間距。六列 label／value 只靠 --space-3
 * 分開時，掃讀要靠眼睛自己配對左右兩欄；hairline 把每一列框成一個單位，
 * 配對就不用出力。gap 一併移除，改由各列自己的內距撐開，避免「間距 ＋
 * 分隔線」兩套節奏疊在一起。
 */
.summary-grid > div {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  padding-block: var(--space-3);
  border-top: 1px solid var(--border-subtle);
}

.summary-grid > div:first-child {
  border-top: 0;
}

/* 2026-08-31：標籤不得被值壓縮。這一列也是 flex + space-between，跟
   ProductDetailPage 的 .spec-row 同一個形狀——那裡的 dt 就是因為少了
   flex-shrink 被擠成一行一個字。目前的值都很短所以還沒發生，先擋住。 */
.summary-grid dt {
  flex: 0 0 auto;
  color: var(--text-secondary);
}

.caution {
  color: var(--text-body);
  line-height: var(--line-height-body);
}

.caution strong {
  color: var(--text-primary);
}

.clear-row {
  display: grid;
  gap: var(--space-3);
  justify-items: start;
  width: 100%;
  padding-top: var(--space-4);
  border-top: 1px solid var(--border-strong);
}

.clear-row div > strong {
  display: block;
  line-height: 1.4;
}

.clear-row p {
  color: var(--text-secondary);
  line-height: var(--line-height-body);
}

.clear-row--danger strong {
  color: var(--color-due);
}

/*
 * 同步群組刻意不用 .app-card：層級差異靠有沒有卡片外框，不靠縮字。
 * 見模板裡的註解。
 */
.sync-group {
  display: grid;
  gap: var(--space-3);
  justify-items: start;
  padding-top: var(--space-5);
  border-top: 1px solid var(--border-strong);
}

/*
 * 群組標題跟第一層的卡片標題同一個 role（同字級同字重）——次要性完全
 * 靠「沒有卡片外框」表達。狀態標題用 strong 而不是 h3，沿用本頁
 * .clear-row 既有的做法，避免在同一個群組裡多開一層標題階層。
 */

.sync-group__lead {
  color: var(--text-body);
  line-height: var(--line-height-body);
}

.sync-block {
  display: grid;
  gap: var(--space-3);
  justify-items: start;
  width: 100%;
}

/*
 * 2026-09-01：從 <strong> 改成 <h3>，字級跟著 card-title 對齊「跨裝置同步」
 * （使用者要求「綠色區字體大小要統一」）。
 *
 * 實測改動前是 18px vs 16px——差一階，剛好落在「看得出不一樣、但看不出
 * 為什麼」的區間。
 *
 * 換成 h3 不只是換字級：這三塊（免登入／同步已停止／先看同步內容）本來
 * 就是「跨裝置同步」底下的狀態小節，用 <strong> 當標題對螢幕閱讀器來說
 * 是沒有標題。h2 → h3 的層級也是對的。
 *
 * 階層不再靠字級表達，改靠位置與那一段 lead 文字——這是刻意的取捨。
 */
/* 出口靠右，與其他區塊「這裡還有別的可以看」的入口一致。 */
.sync-group__more {
  justify-self: end;
}

.sync-block__title {
  margin: 0;
  line-height: var(--line-height-card-title);
}

.sync-block p {
  margin: 0;
  color: var(--text-body);
  line-height: var(--line-height-body);
}

.sync-list {
  display: grid;
  gap: var(--space-2);
  width: 100%;
  margin: 0;
  padding: 0;
  list-style: none;
}

.sync-list li {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  padding-block: var(--space-2);
  border-bottom: 1px solid var(--border-strong);
}

.sync-list span {
  color: var(--text-secondary);
}

.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}
</style>
