<script setup lang="ts">
import type { BackgroundPushState } from "@sunshield/platform";
import { computed, shallowRef } from "vue";
import { useRouter } from "vue-router";
import Icon from "../../components/icons/Icon.vue";
import { useWebAppServices } from "../../app/injection";

const { notifications } = useWebAppServices();
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
    body: "此瀏覽器或環境無法使用背景推播；本機倒數與分頁仍開啟時的提醒仍可使用。",
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
    body: "背景推播同步失敗，無法依賴背景推播；本機倒數仍是依據。",
    canEnable: false,
    canDisable: true,
    canRetry: true
  }
};

const statusLabel = computed(() => {
  if (!isSupported.value) return "這個瀏覽器不支援通知";
  if (isGranted.value) return "通知已開啟";
  if (isDenied.value) return "通知已被拒絕";
  return "還沒開啟通知";
});

const backgroundPushDescriptor = computed(
  () => BACKGROUND_PUSH_DESCRIPTORS[backgroundPushState.value]
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
  const sent = await notifications.sendTestNotification();
  testResult.value = sent ? "sent" : "failed";
}
</script>

<template>
  <div class="page-stack notification-settings-page">
    <header class="detail-header">
      <button
        class="icon-button"
        type="button"
        aria-label="返回更多"
        @click="goBack"
      >
        <Icon name="tool-close" :size="24" />
      </button>
    </header>

    <header class="page-heading">
      <h1 class="page-heading__title" data-typography-role="page-title">
        通知設定
      </h1>
      <p>
        在防曬即將失效或該補擦時接收提醒。本機倒數是提醒依據，背景推播僅是選用的輔助送達方式。
      </p>
    </header>

    <section class="app-card" aria-labelledby="permission-heading">
      <h2
        id="permission-heading"
        class="status-summary"
        data-typography-role="section-title"
      >
        目前狀態：<strong>{{ statusLabel }}</strong>
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
          <p>
            開啟位置依瀏覽器而異，通常在網址列左側的鎖頭或資訊圖示裡找到「網站設定」或「權限」，把通知改為允許；也可以到瀏覽器的「設定
            → 隱私權與安全性 → 網站設定 →
            通知」找到本網站調整。若系統整體關閉了通知，還需要到作業系統的通知設定裡一併打開。
          </p>
        </div>
      </div>
      <div v-else-if="!isGranted" class="action-box">
        <p>開啟通知後，App 會在下一個補擦時間點前發送提醒。</p>
        <button
          class="button button--primary"
          type="button"
          @click="requestPermission"
        >
          開啟補擦通知
        </button>
      </div>
      <div v-else class="note-box" role="status">
        <p>已開啟補擦提醒。當有活動中的防曬提醒時，系統會在到期時間提醒。</p>
      </div>
    </section>

    <section class="app-card" aria-labelledby="background-push-heading">
      <h2
        id="background-push-heading"
        class="settings-card-heading"
        data-typography-role="card-title"
      >
        背景推播
      </h2>
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
          關閉背景推播
        </button>
      </div>
      <p class="delivery-note">
        背景推播是輔助功能，可能受瀏覽器或平台能力、網路、省電模式與作業系統設定影響而延遲或無法送達，不保證準時。
      </p>
      <p class="delivery-note">
        iPhone/iPad 必須把此網站加入主畫面，從主畫面開啟 Web
        App，並允許通知後，才可使用背景推播。
      </p>
    </section>

    <section class="app-card" aria-labelledby="delivery-heading">
      <h2
        id="delivery-heading"
        class="settings-card-heading"
        data-typography-role="card-title"
      >
        通知傳送說明
      </h2>
      <p class="delivery-note">
        <strong>單一提醒原則</strong
        >：系統每次只會排定下一個最近的補擦到期提醒，避免過多通知干擾。
      </p>
      <div class="delivery-emphasis delivery-emphasis--limited">
        <p class="delivery-emphasis__title">本機提醒範圍</p>
        <p>
          分頁仍開啟時，本機提醒可作為倒數的輔助；背景送達則需另行啟用上方的背景推播。
        </p>
      </div>
    </section>

    <section v-if="isGranted" class="app-card" aria-labelledby="test-heading">
      <h2
        id="test-heading"
        class="settings-card-heading"
        data-typography-role="card-title"
      >
        裝置測試
      </h2>
      <button
        class="button button--quiet"
        type="button"
        :disabled="testResult === 'sending'"
        @click="runTest"
      >
        {{ testResult === "sending" ? "傳送中…" : "送出測試通知" }}
      </button>
      <p v-if="testResult === 'sent'" class="delivery-note" role="status">
        已送出，請查看系統通知。
      </p>
      <p v-if="testResult === 'failed'" class="form-error" role="alert">
        測試通知傳送失敗，請確認瀏覽器通知權限。
      </p>
    </section>
  </div>
</template>

<style scoped>
.notification-settings-page {
  display: grid;
  gap: var(--page-stack-gap-compact);
}
.detail-header {
  display: flex;
  justify-content: flex-end;
}
.app-card {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-5);
}
.status-summary {
  margin: 0;
  font-size: var(--font-size-section-title);
}
.settings-card-heading {
  margin: 0;
  font-size: var(--font-size-card-title);
}
.note-box {
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--surface-soft);
  color: var(--text-secondary);
  font-size: var(--font-size-supporting);
  line-height: var(--line-height-body);
}
.note-box p,
.action-box p {
  margin: 0;
}
.action-box,
.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}
.delivery-note {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-supporting);
  line-height: var(--line-height-body);
}
.delivery-emphasis {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-4);
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
