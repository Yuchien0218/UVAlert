<script setup lang="ts">
import { computed, shallowRef } from "vue";
import { useRouter } from "vue-router";
import { useWebAppServices } from "../../app/injection";
import Icon from "../../components/icons/Icon.vue";
import IconButton from "../../components/common/IconButton.vue";
import InlineLoader from "../../components/feedback/InlineLoader.vue";

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
  return "未開啟";
});

/**
 * 「如何開啟」只展開步驟說明，不嘗試直接開啟瀏覽器設定——網頁做不到
 * 這件事（2026-08-23 使用者確認的裁決）。
 */
/**
 * 狀態卡的圖示。
 *
 * **這一顆刻意跟著狀態變**，不是固定的裝飾。加圖示的判準是「這張卡要不要
 * 被掃讀」（DESIGN.md 第八節 32 檔位），而這張卡回答的就是「現在是哪一
 * 種狀態」——三種狀態各有自己的圖示，才真的幫得上掃讀；固定一顆鈴鐺只是
 * 在標題前面多一個裝飾。
 *
 * 不支援與被拒絕合用 `state-notification-off`：對使用者來說結果一樣（現在
 * 收不到通知），差別在下面的說明段落，那裡本來就分開講。
 */
const statusIcon = computed(() => {
  if (!isSupported.value || isDenied.value) return "state-notification-off";
  if (isGranted.value) return "more-notifications";
  return "state-notification-pending";
});

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
    <!--
      2026-08-24：返回改成右上角只有圖示的按鈕，跟其他頁一致。

      **2026-09-02：圖示由叉叉改成箭頭（使用者裁決）。** 當時寫「跟其他頁
      一致」時，全站只有一種右上圖示鈕；後來出口分化成兩族，而這一頁站錯
      邊了。現行規則見
      `docs/decisions/2026-09-02-secondary-page-exit-rule.md`：

        可放棄的流程 → 叉叉（tool-close）
        階層下鑽     → 箭頭（tool-arrow-left）

      通知設定是從「更多」下鑽進來的一頁設定，不是一段做到一半可以放棄的
      流程——叉叉會讓人以為按下去等於「不儲存就離開」，但這頁的每個開關
      都是即時生效的。

      **位置維持右上、維持 .flow-heading，只換圖示。** 箭頭要放左上還是
      右上仍在 `2026-08-30-pending-decisions §2／§12.2` 待裁決，這次不動它。

      2026-08-31：叉叉原本自己佔一個 <header>，下面才是標題——實測標題
      上方憑空多出 60px（44px 的按鈕列 ＋ 16px 間距），而那一列左邊什麼
      都沒有。使用者回報「右上角叉叉還是會跑版」，這是其中一種。

      解法不是新發明的：直接用 .flow-heading，記錄補擦／記錄狀況／更正
      紀錄三頁早就是這個版型（app.css，2026-08-26 收斂）。不另立第四套。
    -->
    <header class="flow-heading">
      <div>
        <h1 class="page-heading__title" data-typography-role="page-title">
          通知設定
        </h1>
      </div>
      <IconButton icon="tool-arrow-left" label="返回更多" @click="goBack" />
      <!-- 說明橫跨兩欄，不必為圖示鈕讓出寬度（2026-09-03）。 -->
      <p>通知皆於本機發出，不經外部伺服器。</p>
    </header>

    <!-- 裝置支援與權限狀態卡片 -->
    <section class="app-card" aria-labelledby="permission-heading">
      <!--
        文字包在 <span> 裡：`.section-heading` 是 flex，不包的話「目前狀態：」
        與 `<strong>` 會變成兩個 flex item，中間被 gap 撐開 12px——一句話被
        切成兩半。這與 DataSettingsPage 三張卡的寫法一致。
      -->
      <h2
        id="permission-heading"
        class="section-heading"
        data-typography-role="card-title"
      >
        <Icon :name="statusIcon" :size="32" />
        <span>目前狀態：<strong>{{ statusLabel }}</strong></span>
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
        class="section-heading"
        data-typography-role="card-title"
      >
        <Icon name="more-about" :size="32" />
        <span>通知傳送說明</span>
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
        <p class="delivery-emphasis__title">通知限制</p>
        <p>
          需保持瀏覽器分頁開啟；若關閉或遭系統清理將無法送達，請適時確認補擦狀態。
        </p>
      </div>

      <!--
        2026-09-02：「裝置測試」原本是一張只有標題與一顆靠左按鈕的獨立
        app-card，卡片約 75% 是空白（排版稽核 §6.1）。測試通知本來就是
        「確認送達行為」的一部分，併進這張卡的頁尾當操作列，不再單獨
        撐出一張空卡。
      -->
      <div v-if="isGranted" class="delivery-test">
        <button
          class="button button--quiet"
          type="button"
          :disabled="testResult === 'sending'"
          @click="runTest"
        >
          <InlineLoader v-if="testResult === 'sending'" />
          {{ testResult === "sending" ? "傳送中…" : "送出測試通知" }}
        </button>
        <p v-if="testResult === 'sent'" class="delivery-note" role="status">
          已送出，請查看系統通知。
        </p>
        <p v-if="testResult === 'failed'" class="form-error" role="alert">
          測試通知傳送失敗，請確認瀏覽器通知權限。
        </p>
      </div>
    </section>

    <section v-if="isGranted" class="app-card" aria-labelledby="repeat-heading">
      <h2
        id="repeat-heading"
        class="section-heading"
        data-typography-role="card-title"
      >
        <Icon name="tool-refresh" :size="32" />
        <span>再次提醒頻率</span>
      </h2>
      <!--
        2026-09-02：改用共用的 `.choice-grid`（排版稽核 §3）。

        這一組原本是全站唯一沒有套任何選項樣式的原生 radio——**無障礙上
        本來就完全合格**，問題純粹是它跟其他所有選一個的地方長得不一樣。

        2026-09-03：原生 radio 改成**視覺上藏起來**（不是刪掉，也不是自刻
        一個圓點），選了哪一項由選項卡片本身呈現。控制項仍在 DOM 裡，所以
        鍵盤操作、方向鍵在群組內移動、上面那個 radiogroup 語意全部不變；
        焦點框改畫在卡片上，見 app.css 的 `:has(> input:focus-visible)`。

        選取色來自 `.choice-grid label:has(input:checked)`，不自刻——那組
        顏色 2026-08-24 才從 5 個各自實作的地方收斂成一份。
      -->
      <div
        class="choice-grid"
        role="radiogroup"
        aria-labelledby="repeat-heading"
      >
        <label>
          <input
            type="radio"
            name="reminder-frequency"
            :checked="reminderFrequencyMinutes === null"
            @change="setFrequency(null)"
          />
          提醒一次
        </label>
        <label>
          <input
            type="radio"
            name="reminder-frequency"
            :checked="reminderFrequencyMinutes === 5"
            @change="setFrequency(5)"
          />
          每 5 分鐘
        </label>
        <label>
          <input
            type="radio"
            name="reminder-frequency"
            :checked="reminderFrequencyMinutes === 15"
            @change="setFrequency(15)"
          />
          每 15 分鐘
        </label>
      </div>
    </section>
  </div>
</template>

<style scoped>
/*
 * 密集檔：區塊多、每塊短，用預設 24px 會讓整頁被拉得很長。
 * 數值與改動前相同（16px），只是改用具名 token。
 */
.notification-settings-page {
  display: grid;
  gap: var(--page-stack-gap-compact);
}

.app-card {
  display: grid;
  gap: var(--space-3);
  padding: var(--card-padding);
}

/*
 * 2026-09-05：`.status-summary` 與 `.settings-card-heading` 整組刪掉，
 * 三個 h2 改用共用的 `.section-heading`。
 *
 * 那兩個類別**全部是死宣告**：`margin: 0` 由 styles.css 的 `h1,h2,h3`
 * 提供；`font-size` 由 `[data-typography-role]` 提供，而角色選擇器
 * （`body [data-typography-role][data-typography-role]`，特異度 0-2-1）
 * 勝過 scoped 類別（0-2-0）。
 *
 * 危險的是 `.status-summary` 宣告的是 `--font-size-section-title`（20px）
 * 而不是卡片標題的 18px——**讀檔案的人會以為這一張的標題比另外兩張大**，
 * 實測三個都是 18px。宣告與畫面不一致的死碼比單純的死碼更糟。
 */
/*
 * 2026-09-04：底色從 `--surface-soft` 換成 `--color-surface-card`
 * （使用者：「這頁排版怪怪的，是不是沒套 token」）。
 *
 * 根因量出來是**看不見的框**：`--surface-soft` 正是卡片自己的底色，所以
 * 這個框只做了一件事——把文字往內縮 12px。實測卡片標題起於 41px、框裡的
 * 文字起於 53px，中間沒有任何可見的理由。
 *
 * 換成深一階的表面之後，內縮有底色支撐；跟 `GearForm` 的 `.category-effect`
 * 是同一天、同一個判斷。
 */
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
  margin: 0;
  padding-left: var(--space-4);
  display: grid;
  gap: var(--space-2);
}

.action-box {
  display: grid;
  gap: var(--space-3);
}

.delivery-note {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-supporting);
  line-height: var(--line-height-body);
}

/* 併進「通知傳送說明」卡頁尾的測試操作列。 */
.delivery-test {
  display: grid;
  justify-items: start;
  gap: var(--space-2);
}

/*
 * 內距與 `.note-box` 對齊（2026-09-04）。
 *
 * 原本一個 16px、一個 12px，於是同一頁上有三種左緣：卡片標題 41、
 * note-box 的文字 53、這個框的文字 58。三種內縮沒有任何一種是刻意的
 * 層級，只是各寫各的。
 */
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
