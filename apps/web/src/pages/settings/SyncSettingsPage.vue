<script setup lang="ts">
import { computed, onMounted, shallowRef } from "vue";
import { useWebAppServices } from "../../app/injection";

const { auth, sync } = useWebAppServices();
const syncDisabled = shallowRef(readSyncDisabled());
const busy = computed(() =>
  sync.state.value.status === "preparing" || sync.state.value.status === "syncing"
);
const signedIn = computed(() => auth.state.value.auth.kind === "signed_in");
const preview = computed(() => sync.state.value.preview);

onMounted(() => {
  void auth.refresh();
});

async function signIn(): Promise<void> {
  await auth.signInWithGoogle();
}

async function prepare(): Promise<void> {
  if (!syncDisabled.value) await sync.preparePreview();
}

async function confirm(): Promise<void> {
  await sync.confirm();
}

function cancel(): void {
  sync.cancelPreview();
}

function enableSync(): void {
  writeSyncDisabled(false);
  syncDisabled.value = false;
}

function labelFor(kind: string): string {
  switch (kind) {
    case "active_session": return "進行中的提醒";
    case "product_catalog": return "防曬裝備";
    case "region_preference": return "地區設定";
    case "user_preferences": return "提醒與顯示偏好";
    default: return kind;
  }
}

function statusLabelFor(status: string): string {
  switch (status) {
    case "unchanged": return "兩邊相同";
    case "conflict": return "需要選擇版本";
    case "local_only": return "只有本機資料";
    case "remote_only": return "只有雲端資料";
    case "local_deleted": return "本機已刪除";
    case "remote_deleted": return "雲端已刪除";
    default: return "尚未同步";
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
  <div class="page-stack">
    <header class="page-heading">
      <h1 class="page-heading__title">跨裝置同步</h1>
      <p class="page-heading__body">
        使用防曬提醒不需要帳號。只有你選擇同步時才需要登入，用來同步進行中的提醒、裝備、地區與偏好。
      </p>
    </header>

    <section v-if="!signedIn" class="app-card sync-card">
      <h2>目前使用免登入模式</h2>
      <p>本機倒數與資料不會因為沒有登入而受影響。</p>
      <button class="button button--primary" type="button" @click="signIn">
        使用 Google 登入同步
      </button>
      <p v-if="auth.state.value.status === 'error'" class="notice notice--error" role="alert">
        登入未完成，請稍後再試（{{ auth.state.value.errorCode }}）。本機資料沒有變動。
      </p>
    </section>

    <section v-else-if="syncDisabled" class="app-card sync-card">
      <h2>同步已停止</h2>
      <p>雲端資料仍保留；重新開啟同步前，不會再讀取或上傳雲端資料。</p>
      <button class="button button--primary" type="button" @click="enableSync">重新開啟同步</button>
    </section>

    <section v-else class="app-card sync-card">
      <h2>先看同步內容</h2>
      <p>確認後才會上傳或下載；遇到版本不同時，系統不會自動覆蓋任何一邊。</p>
      <button v-if="preview === null" class="button button--primary" type="button" :disabled="busy" @click="prepare">
        {{ busy ? "讀取中…" : "查看同步預覽" }}
      </button>

      <template v-else>
        <ul class="sync-list" aria-label="同步項目">
          <li v-for="item in preview.items" :key="`${item.key.recordKind}:${item.key.recordId}`">
            <strong>{{ labelFor(item.key.recordKind) }}</strong>
            <span>{{ statusLabelFor(item.status) }}</span>
          </li>
        </ul>
        <div class="button-row">
          <button class="button button--primary" type="button" :disabled="busy" @click="confirm">
            {{ busy ? "同步中…" : "同步這些資料" }}
          </button>
          <button class="button button--quiet" type="button" :disabled="busy" @click="cancel">取消</button>
        </div>
      </template>

      <p v-if="sync.state.value.status === 'synced'" class="notice notice--ok" role="status">同步完成。</p>
      <p v-if="sync.state.value.error" class="notice notice--error" role="alert">
        {{ sync.state.value.error.message }} 本機資料沒有因雲端錯誤被刪除。
      </p>
    </section>

    <RouterLink class="text-link" to="/settings/account-data">管理登入與雲端資料</RouterLink>
    <RouterLink class="text-link" to="/more">返回更多</RouterLink>
  </div>
</template>

<style scoped>
.sync-card {
  display: grid;
  gap: var(--space-3);
  justify-items: start;
  padding: var(--space-5);
}
.sync-card h2,
.sync-card p { margin: 0; }
.sync-card p { color: var(--text-secondary); line-height: 1.7; }
.sync-list { display: grid; gap: var(--space-2); width: 100%; margin: 0; padding: 0; list-style: none; }
.sync-list li { display: flex; justify-content: space-between; gap: var(--space-3); padding-block: var(--space-2); border-bottom: 1px solid var(--border-strong); }
.sync-list span { color: var(--text-secondary); }
.button-row { display: flex; flex-wrap: wrap; gap: var(--space-3); }
.notice { margin: 0; line-height: 1.7; }
.notice--error { color: var(--color-due); }
.notice--ok { color: var(--text-secondary); }
.text-link { color: var(--text-secondary); }
</style>
