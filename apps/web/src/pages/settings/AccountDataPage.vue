<script setup lang="ts">
import { useRouter } from "vue-router";
import Icon from "../../components/icons/Icon.vue";
import IconButton from "../../components/common/IconButton.vue";
import { computed, onMounted, shallowRef } from "vue";
import { useWebAppServices } from "../../app/injection";
import AppNotice from "../../components/common/AppNotice.vue";
import ConfirmAction from "../../components/common/ConfirmAction.vue";
import InlineLoader from "../../components/feedback/InlineLoader.vue";

const { auth, cloudSync, sync } = useWebAppServices();
const confirmingDelete = shallowRef(false);
const busy = shallowRef(false);
const notice = shallowRef<string | null>(null);
const error = shallowRef<string | null>(null);
const signedIn = computed(() => auth.state.value.auth.kind === "signed_in");
const syncDisabled = shallowRef(
  globalThis.localStorage?.getItem("uvalert.sync.disabled") === "true"
);

const syncBusy = computed(
  () =>
    sync?.state?.value?.status === "preparing" ||
    sync?.state?.value?.status === "syncing"
);
const preview = computed(() => sync?.state?.value?.preview ?? null);

onMounted(() => {
  void auth.refresh();
});

function stopSync(): void {
  globalThis.localStorage?.setItem("uvalert.sync.disabled", "true");
  syncDisabled.value = true;
  notice.value = "同步已停止，雲端資料仍保留。";
}

function enableSync(): void {
  globalThis.localStorage?.removeItem("uvalert.sync.disabled");
  syncDisabled.value = false;
  notice.value = "同步已重新開啟。";
}

async function signIn(): Promise<void> {
  await auth.signInWithGoogle();
}

async function prepare(): Promise<void> {
  if (!syncDisabled.value && sync) await sync.preparePreview();
}

async function confirmSync(): Promise<void> {
  if (sync) await sync.confirm();
}

function cancelSync(): void {
  if (sync) sync.cancelPreview();
}

async function signOut(): Promise<void> {
  busy.value = true;
  error.value = null;
  const ok = await auth.signOut();
  busy.value = false;
  if (ok) notice.value = "已登出。本機提醒與資料仍保留。";
  else error.value = "登出沒有完成，本機資料沒有變動。";
}

async function deleteCloudData(): Promise<void> {
  if (!confirmingDelete.value) {
    confirmingDelete.value = true;
    return;
  }
  busy.value = true;
  error.value = null;
  try {
    await cloudSync.deleteAccount();
    await auth.signOut();
    notice.value = "防曬晴報員的雲端資料與登入資訊已清除，本機提醒與資料仍保留。";
    confirmingDelete.value = false;
  } catch (caught) {
    error.value =
      typeof caught === "object" &&
      caught !== null &&
      "message" in caught &&
      typeof caught.message === "string"
        ? caught.message
        : "雲端資料尚未清除，本機資料沒有變動。";
  } finally {
    busy.value = false;
  }
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
      return "本機與雲端一致";
    case "conflict":
      return "版本不同（需選擇）";
    case "local_only":
      return "僅儲存於本機裝置";
    case "remote_only":
      return "僅存在於 Google 雲端";
    case "local_deleted":
      return "本機已刪除";
    case "remote_deleted":
      return "雲端已刪除";
    default:
      return "尚未同步";
  }
}

const router = useRouter();

function goBack(): void {
  void router.push({ name: "more" });
}
</script>

<template>
  <div class="page-stack">
    <header class="page-heading page-heading--with-exit">
      <h1 class="page-heading__title" data-typography-role="page-title">
        帳號與跨裝置同步
      </h1>
      <p class="page-heading__body">
        管理 Google 登入帳號、同步狀態與雲端資料備份。
      </p>
      <IconButton icon="tool-arrow-left" label="返回更多" @click="goBack" />
    </header>

    <section v-if="!signedIn" class="app-card account-card">
      <h2 data-typography-role="card-title">目前使用免登入模式</h2>
      <p>
        登入 Google 帳號可跨裝置同步提醒、裝備與設定。不登入亦不影響本機倒數與資料。
      </p>
      <button class="button button--primary" type="button" @click="signIn">
        使用 Google 登入同步
      </button>
      <AppNotice v-if="auth.state.value.status === 'error'" kind="error">
        登入未完成，請稍後再試（{{ auth.state.value.errorCode }}）。本機資料沒有變動。
      </AppNotice>
    </section>

    <template v-else>
      <section class="app-card account-card">
        <h2 class="section-heading" data-typography-role="card-title">
          <Icon name="tool-refresh" :size="32" />
          <span>同步狀態</span>
        </h2>
        <p v-if="syncDisabled">同步已停止，雲端資料保留中。</p>
<<<<<<< HEAD
        <p v-else>
          同步已開啟。確認後才會上傳或下載，不會自動覆蓋本機或雲端資料。
        </p>
=======
        <p v-else>同步已開啟。確認後才會上傳或下載，不會自動覆蓋任何一邊。</p>
>>>>>>> origin/main

        <div v-if="!syncDisabled" class="sync-actions">
          <button
            v-if="preview === null"
            class="button button--primary"
            type="button"
            :disabled="syncBusy"
            @click="prepare"
          >
            <InlineLoader v-if="syncBusy" />
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
                <InlineLoader v-if="syncBusy" />
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

          <AppNotice v-if="sync?.state?.value?.status === 'synced'" kind="ok">
            同步完成。
          </AppNotice>
          <AppNotice v-if="sync?.state?.value?.error" kind="error">
            {{ sync.state.value.error.message }} 本機資料沒有因雲端錯誤被刪除。
          </AppNotice>
        </div>

        <button
          v-if="!syncDisabled"
          class="button button--quiet"
          type="button"
          @click="stopSync"
        >
          停止同步
        </button>
        <button
          v-else
          class="button button--primary"
          type="button"
          @click="enableSync"
        >
          重新開啟同步
        </button>
      </section>

      <section class="app-card account-card">
        <h2 class="section-heading" data-typography-role="card-title">
          <Icon name="tool-sign-out" :size="32" />
          <span>登出</span>
        </h2>
        <p>登出不會清除本機資料或雲端資料。</p>
        <button
          class="button button--quiet"
          type="button"
          :disabled="busy"
          @click="signOut"
        >
          登出防曬晴報員
        </button>
      </section>

      <section class="app-card account-card account-card--danger">
        <h2 class="section-heading" data-typography-role="card-title">
          <Icon name="tool-delete" :size="32" />
          <span>清除雲端資料</span>
        </h2>
        <p>
          將刪除防曬晴報員的雲端同步資料與登入狀態，不會刪除 Google
          帳號。本機提醒與資料不受影響。
        </p>
        <ConfirmAction
          :confirming="confirmingDelete"
          :pending="busy"
          trigger-label="清除雲端資料"
          confirm-label="確定清除"
          @trigger="deleteCloudData"
          @confirm="deleteCloudData"
          @cancel="confirmingDelete = false"
        >
          <template #warning>
            <strong>確定要清除雲端資料嗎？</strong>
          </template>
        </ConfirmAction>
      </section>
    </template>

    <AppNotice v-if="notice" kind="ok">{{ notice }}</AppNotice>
    <AppNotice v-if="error" kind="error">{{ error }}</AppNotice>
  </div>
</template>

<style scoped>
.account-card {
  display: grid;
  gap: var(--space-3);
  justify-items: start;
  padding: var(--card-padding);
}
.account-card h2,
.account-card p {
  margin: 0;
}
.account-card h2 {
  font-size: var(--font-size-card-title);
}
.account-card p {
  color: var(--text-body);
  line-height: var(--line-height-body);
}
.account-card--danger h2 {
  color: var(--color-due);
}
.sync-actions {
  display: grid;
  gap: var(--space-3);
  width: 100%;
}
.sync-list {
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
  width: 100%;
}
.sync-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--border-subtle);
  font-size: var(--font-size-body);
}
.button-row {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  flex-wrap: wrap;
}
</style>
