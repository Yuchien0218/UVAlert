<script setup lang="ts">
import { computed, shallowRef } from "vue";
import { useRouter } from "vue-router";
import Icon from "../../components/icons/Icon.vue";
import { useWebAppServices } from "../../app/injection";

/**
 * 通知設定頁（Wireframe 10–11 / Sitemap §2.4）。
 *
 * 提供補擦提醒權限管理與送達限制說明。
 *
 * **2026-08-23 校正**：原稿的送達限制文案寫「若將瀏覽器完全關閉……通知
 * 可能會延遲或無法發出」，把「一定不會送達」講成「可能」，跟 Sitemap
 * §4.3 訂的規則衝突——「任何提到通知的畫面都必須讓使用者知道自己仍需
 * 回來查看」「不使用『背景通知』一詞」。canDeliverInBackground 目前恆為
 * false（web 平台做不到，見 `2026-08-23-notification-decision.md`），
 * 這裡改成明確告知關閉分頁後就收不到，而不是模糊地說「可能」。
 */
const { notifications } = useWebAppServices();
const router = useRouter();

const permission = computed(() => notifications.permission.value);
const isSupported = computed(() => notifications.isSupported);
const canDeliverInBackground = computed(
  () => notifications.canDeliverInBackground
);

const isGranted = computed(() => permission.value === "granted");
const isDenied = computed(() => permission.value === "denied");

/** 依高保真的確切措辭對齊四種狀態（2026-08-23 交接紀錄）。 */
const statusLabel = computed(() => {
  if (!isSupported.value) return "這個瀏覽器不支援通知";
  if (isGranted.value) return "通知已開啟";
  if (isDenied.value) return "通知已被拒絕";
  return "還沒開啟通知";
});

/**
 * 「如何開啟」只展開步驟說明，不嘗試直接開啟瀏覽器設定——網頁做不到
 * 這件事（2026-08-23 使用者確認的裁決）。
 */
const showDeniedSteps = shallowRef(false);

async function requestPermission(): Promise<void> {
  await notifications.requestPermission();
}

function goBack(): void {
  void router.push({ name: "more" });
}

/**
 * 再次提醒頻率與裝置測試（2026-08-23 下一輪：交接文件第三節列的兩個
 * 待補項目，依賴 NotificationController 的重複排程與 sendTest，這輪
 * 已補上）。兩者都只在分頁還活著時有效，跟單次提醒同一個平台限制，
 * 不是新的送達承諾。
 */
const reminderFrequencyMinutes = computed(
  () => notifications.reminderFrequencyMinutes.value
);

async function setFrequency(minutes: number | null): Promise<void> {
  await notifications.setReminderFrequencyMinutes(minutes);
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
    <!-- 2026-08-24：返回改成右上角只有圖示的叉叉，跟其他頁一致。 -->
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
        在防曬即將失效或該補擦時接收提醒。提醒由這台裝置本機發出，不經由外部伺服器。
      </p>
    </header>

    <!-- 裝置支援與權限狀態卡片 -->
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
        <p>已開啟補擦提醒。當有活動中的防曬提醒時，系統會在到期前發出通知。</p>
      </div>
    </section>

    <!--
      送達限制。這段不可省略——canDeliverInBackground 恆為 false，關掉
      瀏覽器或分頁被系統回收就收不到，這是 web 平台的限制，不是「可能」
      發生的邊緣狀況。省略這句或講得含糊，會讓產品退回「規格承諾、實作
      交付不了」的老問題。
      2026-08-23：改成有邊框的強調區塊（粗體標題＋說明），對齊高保真的
      視覺層級，不是純段落文字。
    -->
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

      <div v-if="canDeliverInBackground" class="delivery-emphasis">
        <p class="delivery-emphasis__title">送達範圍</p>
        <p>支援關閉分頁後送達。</p>
      </div>
      <div v-else class="delivery-emphasis delivery-emphasis--limited">
        <p class="delivery-emphasis__title">送達範圍有限制</p>
        <p>
          只在分頁還活著時送達——切到其他分頁或 App 仍會收到，但關掉瀏覽器
          或分頁被系統回收後就不會送達。你仍需自己回來查看目前的補擦狀態。
        </p>
      </div>
    </section>

    <section v-if="isGranted" class="app-card" aria-labelledby="repeat-heading">
      <h2
        id="repeat-heading"
        class="settings-card-heading"
        data-typography-role="card-title"
      >
        再次提醒頻率
      </h2>
      <div
        class="repeat-options"
        role="radiogroup"
        aria-labelledby="repeat-heading"
      >
        <label class="repeat-option">
          <input
            type="radio"
            name="reminder-frequency"
            :checked="reminderFrequencyMinutes === null"
            @change="setFrequency(null)"
          />
          只提醒一次
        </label>
        <label class="repeat-option">
          <input
            type="radio"
            name="reminder-frequency"
            :checked="reminderFrequencyMinutes === 5"
            @change="setFrequency(5)"
          />
          每 5 分鐘再提醒一次
        </label>
        <label class="repeat-option">
          <input
            type="radio"
            name="reminder-frequency"
            :checked="reminderFrequencyMinutes === 15"
            @change="setFrequency(15)"
          />
          每 15 分鐘再提醒一次
        </label>
      </div>
      <p class="delivery-note">
        重複提醒跟單次提醒受同一個限制：只在分頁還活著時有效，不是新的送達保證。
      </p>
    </section>

    <section v-if="isGranted" class="app-card" aria-labelledby="test-heading">
      <h2
        id="test-heading"
        class="settings-card-heading"
        data-typography-role="card-title"
      >
        裝置測試
      </h2>
      <!--
        沒有說明文字是刻意的：原本的「送一則測試通知，確認這台裝置目前
        收得到。」幾乎重述按鈕文字「送出測試通知」，沒有帶進新資訊
        （B9 第二輪分類，2026-08-29 裁決）。
      -->
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
  gap: var(--space-4);
}

/* 右上角的返回鈕靠右。 */
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
  line-height: 1.6;
}

.note-box p,
.action-box p {
  margin: 0;
}

.action-box {
  display: grid;
  gap: var(--space-3);
}

.delivery-note {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-supporting);
  line-height: 1.6;
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
  line-height: 1.6;
}

.repeat-options {
  display: grid;
  gap: var(--space-2);
}

.repeat-option {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--tap-target);
}
</style>
