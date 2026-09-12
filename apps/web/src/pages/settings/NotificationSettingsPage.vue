<script setup lang="ts">
import type { BackgroundPushState } from "@sunshield/platform";
import { computed, onMounted, shallowRef } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useWebAppServices } from "../../app/injection";
import IconButton from "../../components/common/IconButton.vue";
import AppNotice from "../../components/common/AppNotice.vue";
import InlineLoader from "../../components/feedback/InlineLoader.vue";
import Icon from "../../components/icons/Icon.vue";

const { notifications, lineNotification } = useWebAppServices();
const route = useRoute();
const router = useRouter();
const permission = computed(() => notifications.permission.value);
const isSupported = computed(() => notifications.isSupported);
const isGranted = computed(() => permission.value === "granted");
const isDenied = computed(() => permission.value === "denied");
const backgroundPushState = computed(
  () => notifications.backgroundPushState.value
);
const showDeniedSteps = shallowRef(false);
const isBackgroundActionPending = shallowRef(false);

const isLineBound = computed(() => lineNotification.isBound.value);
const isLineLoading = computed(() => lineNotification.isLoading.value);
const lineError = computed(() => lineNotification.error.value);
const lineActionMessage = computed(() => lineNotification.actionMessage.value);

onMounted(async () => {
  const code = route.query.code;
  if (typeof code === "string" && code.trim()) {
    await lineNotification.handleCallback(code);
    void router.replace({
      query: { ...route.query, code: undefined, state: undefined }
    });
  } else {
    await lineNotification.fetchStatus();
  }
});

function bindLine(): void {
  lineNotification.startBinding();
}

async function sendLineTest(): Promise<void> {
  await lineNotification.sendTest();
}

async function unbindLine(): Promise<void> {
  await lineNotification.unbind();
}

type BackgroundPushDescriptor = {
  title: string;
  body: string;
  canEnable: boolean;
  canDisable: boolean;
  canRetry: boolean;
};

const BACKGROUND_PUSH_DESCRIPTORS: Record<
  BackgroundPushState,
  BackgroundPushDescriptor
> = {
  unsupported: {
    title: "無法使用背景推播",
    body: "此瀏覽器或環境無法使用背景推播，但分頁開啟時，提醒仍可正常使用。",
    canEnable: false,
    canDisable: false,
    canRetry: false
  },
  "permission-required": {
    title: "開啟背景推播",
    body: "背景推播尚未啟用。這是選用的輔助送達方式。",
    canEnable: true,
    canDisable: false,
    canRetry: false
  },
  subscribing: {
    title: "設定中",
    body: "背景推播設定中，請稍候。",
    canEnable: false,
    canDisable: false,
    canRetry: false
  },
  enabled: {
    title: "已啟用背景推播",
    body: "已啟用背景推播，但目前沒有已確認同步的下一個提醒。",
    canEnable: false,
    canDisable: true,
    canRetry: false
  },
  scheduled: {
    title: "已同步下一個補擦提醒",
    body: "已同步下一個補擦提醒，可嘗試在背景送達。",
    canEnable: false,
    canDisable: true,
    canRetry: false
  },
  "pending-sync": {
    title: "等待同步",
    body: "最新變更正在等待同步，恢復連線後會再傳送。",
    canEnable: false,
    canDisable: true,
    canRetry: true
  },
  "schedule-error": {
    title: "無法依賴背景推播",
    body: "背景推播設定失效，或舊版關閉紀錄無法安全確認，本機倒數仍是依據。若要維持關閉，請按下「完成關閉背景推播」，系統會以目前裝置設定重新完成關閉。完成後若想再次使用，可再重新開啟。",
    canEnable: false,
    canDisable: true,
    canRetry: false
  }
};

const statusLabel = computed(() => {
  if (!isSupported.value) return "這個瀏覽器不支援通知";
  if (isGranted.value) return "通知已開啟";
  if (isDenied.value) return "通知已被拒絕";
  return "未開啟";
});
const statusIcon = computed(() => {
  if (!isSupported.value || isDenied.value) return "state-notification-off";
  if (isGranted.value) return "more-notifications";
  return "state-notification-pending";
});
const backgroundPushDescriptor = computed(
  () => BACKGROUND_PUSH_DESCRIPTORS[backgroundPushState.value]
);
const backgroundPushDisableLabel = computed(() =>
  backgroundPushState.value === "schedule-error"
    ? "完成關閉背景推播"
    : "關閉背景推播"
);

async function requestPermission(): Promise<void> {
  await notifications.requestPermission();
}
async function enableBackgroundPush(): Promise<void> {
  isBackgroundActionPending.value = true;
  try {
    await notifications.enableBackgroundPush();
  } finally {
    isBackgroundActionPending.value = false;
  }
}
async function disableBackgroundPush(): Promise<void> {
  isBackgroundActionPending.value = true;
  try {
    await notifications.disableBackgroundPush();
  } finally {
    isBackgroundActionPending.value = false;
  }
}
async function retryBackgroundSync(): Promise<void> {
  isBackgroundActionPending.value = true;
  try {
    await notifications.retryBackgroundSync();
  } finally {
    isBackgroundActionPending.value = false;
  }
}
function goBack(): void {
  void router.push({ name: "more" });
}

type TestResult = "idle" | "sending" | "sent" | "failed";
const testResult = shallowRef<TestResult>("idle");
async function runTest(): Promise<void> {
  testResult.value = "sending";
  testResult.value = (await notifications.sendTestNotification())
    ? "sent"
    : "failed";
}
</script>

<template>
  <div class="page-stack notification-settings-page">
    <header class="flow-heading">
      <div>
        <h1 class="page-heading__title" data-typography-role="page-title">
          通知設定
        </h1>
      </div>
      <IconButton icon="tool-arrow-left" label="返回更多" @click="goBack" />
      <p>
        本機倒數是提醒依據，背景推播僅是選用的輔助送達方式。
      </p>
    </header>

    <section class="app-card" aria-labelledby="permission-heading">
      <h2
        id="permission-heading"
        class="section-heading"
        data-typography-role="card-title"
      >
        <Icon :name="statusIcon" :size="32" />
        <span
          >瀏覽器通知：<strong>{{ statusLabel }}</strong></span
        >
      </h2>

      <div v-if="!isSupported" class="note-box" role="status">
        <p>目前使用的瀏覽器或環境不支援本機通知功能。</p>
      </div>
      <div v-else-if="isDenied" class="note-box" role="alert">
        <p>
          通知權限已被瀏覽器封鎖。若想接收補擦提醒，請至瀏覽器或系統設定中解除封鎖。
        </p>
        <button
          class="button button--quiet"
          type="button"
          :aria-expanded="showDeniedSteps"
          aria-controls="denied-steps"
          @click="showDeniedSteps = !showDeniedSteps"
        >
          如何開啟
        </button>
        <div v-if="showDeniedSteps" id="denied-steps" class="note-box">
          <ol class="steps-list">
            <li>點擊網址列左側的「鎖頭」或「資訊」圖示。</li>
            <li>找到「權限」，將「通知」改為「允許」。</li>
            <li>若仍無法接收，請檢查手機或電腦作業系統的通知設定。</li>
          </ol>
        </div>
      </div>
      <div v-else-if="!isGranted" class="action-box">
        <p>開啟後將於下次補擦前發送提醒。</p>
        <button
          class="button button--primary"
          type="button"
          @click="requestPermission"
        >
          開啟瀏覽器通知
        </button>
      </div>
      <div v-else class="permission-granted-group">
        <p class="delivery-note" role="status">
          已開啟補擦提醒。當有防曬提醒時，系統會在到期時發送通知。
        </p>
        <div class="delivery-test">
          <button
            class="button button--quiet"
            type="button"
            :disabled="testResult === 'sending'"
            @click="runTest"
          >
            <InlineLoader v-if="testResult === 'sending'" />
            {{ testResult === "sending" ? "傳送中" : "測試瀏覽器通知" }}
          </button>
          <p v-if="testResult === 'sent'" class="delivery-note" role="status">
            已送出，請查看系統通知。
          </p>
          <p v-if="testResult === 'failed'" class="form-error" role="alert">
            測試通知傳送失敗，請確認瀏覽器通知權限。
          </p>
        </div>
      </div>

      <div class="card-subdivision">
        <h3
          id="background-push-heading"
          class="section-subheading"
          data-typography-role="card-title"
        >
          <Icon name="more-notifications" :size="24" />
          <span>背景推播（選用）</span>
        </h3>
        <div
          class="delivery-emphasis"
          :class="{
            'delivery-emphasis--limited':
              backgroundPushState === 'pending-sync' ||
              backgroundPushState === 'schedule-error'
          }"
          role="status"
        >
          <p class="delivery-emphasis__title">
            {{ backgroundPushDescriptor.title }}
          </p>
          <p>{{ backgroundPushDescriptor.body }}</p>
        </div>
        <div
          v-if="
            backgroundPushDescriptor.canEnable ||
            backgroundPushDescriptor.canDisable ||
            backgroundPushDescriptor.canRetry
          "
          class="action-row"
        >
          <button
            v-if="backgroundPushDescriptor.canEnable"
            data-testid="enable-background-push"
            class="button button--primary"
            type="button"
            :disabled="isBackgroundActionPending"
            @click="enableBackgroundPush"
          >
            開啟背景推播
          </button>
          <button
            v-if="backgroundPushDescriptor.canRetry"
            data-testid="retry-background-push"
            class="button button--quiet"
            type="button"
            :disabled="isBackgroundActionPending"
            @click="retryBackgroundSync"
          >
            重試同步
          </button>
          <button
            v-if="backgroundPushDescriptor.canDisable"
            data-testid="disable-background-push"
            class="button button--quiet"
            type="button"
            :disabled="isBackgroundActionPending"
            @click="disableBackgroundPush"
          >
            {{ backgroundPushDisableLabel }}
          </button>
        </div>
      </div>

      <div class="card-subdivision">
        <p class="delivery-note">
          <strong>單一提醒原則</strong
          >：系統每次只會排定下一個最近的補擦到期提醒，避免過多通知干擾。
        </p>
        <p class="delivery-note">
          分頁開啟時由瀏覽器直接提醒；若分頁關閉，背景推播可能受網路、省電模式與系統設定影響而延遲或無法送達，不保證準時。
        </p>
        <p class="delivery-note">
          iPhone/iPad 必須把此網站加入主畫面，從主畫面開啟 Web
          App，並允許通知後，才可使用背景推播。
        </p>
      </div>
    </section>

    <section class="app-card" aria-labelledby="line-push-heading">
      <h2
        id="line-push-heading"
        class="section-heading"
        data-typography-role="card-title"
      >
        <Icon name="more-notifications" :size="32" /><span>LINE 補擦提醒</span>
      </h2>
      <div
        class="delivery-emphasis"
        role="status"
      >
        <p class="delivery-emphasis__title">
          {{ isLineBound ? "已啟用 LINE 補擦提醒" : "透過 LINE 接收補擦通知" }}
        </p>
        <p>
          {{
            isLineBound
              ? "已成功連結您的 LINE 帳號。補擦時間到期時，系統將由「防曬晴報員」官方帳號即時傳送推播訊息。"
              : "將補擦提醒直接傳送到您的 LINE 聊天室，即使螢幕關閉或未常駐瀏覽器，也能即時收到提醒。"
          }}
        </p>
      </div>

      <AppNotice v-if="lineActionMessage" kind="ok">
        {{ lineActionMessage }}
      </AppNotice>

      <AppNotice v-if="lineError" kind="error">
        {{ lineError }}
      </AppNotice>

      <div class="action-row">
        <button
          v-if="!isLineBound"
          data-testid="bind-line-button"
          class="button button--primary"
          type="button"
          :disabled="isLineLoading"
          @click="bindLine"
        >
          <InlineLoader v-if="isLineLoading" />
          {{ isLineLoading ? "連線中" : "綁定 LINE 接收提醒" }}
        </button>
        <template v-else>
          <button
            data-testid="send-line-test-button"
            class="button button--quiet"
            type="button"
            :disabled="isLineLoading"
            @click="sendLineTest"
          >
            <InlineLoader v-if="isLineLoading" />
            {{ isLineLoading ? "傳送中" : "發送測試提醒" }}
          </button>
          <button
            data-testid="unbind-line-button"
            class="button button--quiet"
            type="button"
            :disabled="isLineLoading"
            @click="unbindLine"
          >
            解除綁定
          </button>
        </template>
      </div>

      <p class="delivery-note">
        提醒：本功能需加入「防曬晴報員」LINE 官方帳號好友，並請確認未將官方帳號設為「關閉提醒（靜音）」。
      </p>
    </section>
  </div>
</template>

<style scoped>
.notification-settings-page {
  display: grid;
  gap: var(--page-stack-gap-compact);
}
.app-card {
  display: grid;
  gap: var(--space-3);
  padding: var(--card-padding);
}
.card-subdivision {
  display: grid;
  gap: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--border-subtle);
}
.section-subheading {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
}
.note-box {
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--color-surface-card);
  color: var(--text-secondary);
  font-size: var(--font-size-supporting);
  line-height: var(--line-height-body);
}
.note-box p,
.action-box p {
  margin: 0;
}
.steps-list {
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding-left: var(--space-4);
}
.action-box {
  display: grid;
  gap: var(--space-3);
}
.permission-granted-group {
  display: grid;
  gap: var(--space-2);
}
.action-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
}
[data-testid="bind-line-button"] {
  min-width: 13.5rem;
}
[data-testid="send-line-test-button"],
.delivery-test .button {
  min-width: 9.5rem;
}
.delivery-note {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-supporting);
  line-height: var(--line-height-body);
}
.delivery-test {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
}
.delivery-emphasis {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-3);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
}
.delivery-emphasis--limited {
  border-color: var(--color-due);
}
.delivery-emphasis__title {
  margin: 0;
  font-weight: 600;
}
.delivery-emphasis p:not(.delivery-emphasis__title) {
  margin: 0;
  color: var(--text-body);
  line-height: var(--line-height-body);
}
</style>
