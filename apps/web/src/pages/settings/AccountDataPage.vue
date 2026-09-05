<script setup lang="ts">
import { useRouter } from "vue-router";
import Icon from "../../components/icons/Icon.vue";
import IconButton from "../../components/common/IconButton.vue";
import { computed, onMounted, shallowRef } from "vue";
import { useWebAppServices } from "../../app/injection";
import AppNotice from "../../components/common/AppNotice.vue";
import ConfirmAction from "../../components/common/ConfirmAction.vue";

const { auth, cloudSync } = useWebAppServices();
const confirmingDelete = shallowRef(false);
const busy = shallowRef(false);
const notice = shallowRef<string | null>(null);
const error = shallowRef<string | null>(null);
const signedIn = computed(() => auth.state.value.auth.kind === "signed_in");
const syncDisabled = shallowRef(
  globalThis.localStorage?.getItem("uvalert.sync.disabled") === "true"
);

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
    notice.value = "UVAlert 的雲端資料與登入資訊已清除；本機提醒與資料仍保留。";
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
const router = useRouter();

/*
 * 頂端的返回出口（2026-09-03，稽核 §G：下鑽頁一律有頂端箭頭）。
 * 直接回「更多」，不用 history.back——這一頁也可能是從網址列直接打開的。
 */
function goBack(): void {
  void router.push({ name: "more" });
}
</script>

<template>
  <div class="page-stack">
    <header class="page-heading page-heading--with-exit">
      <h1 class="page-heading__title" data-typography-role="page-title">
        登入與雲端資料
      </h1>
      <p class="page-heading__body">
        此處僅管理雲端同步資料，清除不會影響 Google 帳號與本機現有提醒。
      </p>
      <IconButton icon="tool-arrow-left" label="返回更多" @click="goBack" />
    </header>

    <section v-if="!signedIn" class="app-card account-card">
      <h2 data-typography-role="card-title">目前沒有登入</h2>
      <p>你仍可直接使用本機防曬提醒。</p>
      <RouterLink class="button button--primary" to="/settings/data"
        >前往同步設定</RouterLink
      >
    </section>

    <template v-else>
      <section class="app-card account-card">
        <h2 class="section-heading" data-typography-role="card-title">
          <Icon name="tool-refresh" :size="32" />
          <span>同步狀態</span>
        </h2>
        <p v-if="syncDisabled">同步已停止；雲端資料保留中。</p>
        <p v-else>同步已開啟；每次同步前會先顯示預覽。</p>
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
          登出 UVAlert
        </button>
      </section>

      <section class="app-card account-card account-card--danger">
        <h2 class="section-heading" data-typography-role="card-title">
          <Icon name="tool-delete" :size="32" />
          <span>清除 UVAlert 雲端資料</span>
        </h2>
        <p>
          會刪除 UVAlert 雲端同步資料與 UVAlert 登入；不會刪除 Google
          帳號。本機提醒與本機資料不受影響。
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
</style>
