<script setup lang="ts">
import { useRouter } from "vue-router";
import IconButton from "../components/common/IconButton.vue";
import { computed, onMounted, onUnmounted, shallowRef } from "vue";

/**
 * S-20 安裝到手機。
 *
 * 依實際平台能力顯示安裝方式，**不把安裝當成使用 P0 的條件**。
 * P0 不做帳號後，本頁與 S-19 共同承擔「不要弄丟資料」的需求。
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const deferredPrompt = shallowRef<BeforeInstallPromptEvent | null>(null);
const promptResult = shallowRef<string | null>(null);

const isStandalone = computed(
  () =>
    globalThis.matchMedia?.("(display-mode: standalone)").matches === true ||
    (globalThis.navigator as { standalone?: boolean }).standalone === true
);

const userAgent = globalThis.navigator.userAgent;
const isIos = computed(() => /iPad|iPhone|iPod/.test(userAgent));

function capturePrompt(event: Event): void {
  event.preventDefault();
  deferredPrompt.value = event as BeforeInstallPromptEvent;
}

onMounted(() => {
  globalThis.addEventListener("beforeinstallprompt", capturePrompt);
});

onUnmounted(() => {
  globalThis.removeEventListener("beforeinstallprompt", capturePrompt);
});

async function install(): Promise<void> {
  const prompt = deferredPrompt.value;
  if (prompt === null) return;
  await prompt.prompt();
  const choice = await prompt.userChoice;
  deferredPrompt.value = null;
  promptResult.value =
    choice.outcome === "accepted"
      ? "已開始安裝。完成後可從主畫面開啟。"
      : "已取消安裝。你仍然可以用瀏覽器繼續使用。";
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
        安裝到手機
      </h1>
      <p class="page-heading__body">
        本站採用 PWA 技術，可建立手機主畫面捷徑隨開即用。
      </p>
      <IconButton icon="tool-arrow-left" label="返回更多" @click="goBack" />
    </header>

    <!--
      2026-09-04：狀態與限制併成同一張卡（使用者要求）。

      這一頁只有兩張卡，而且講的是同一件事的兩面——「這台裝置現在能不能
      裝、怎麼裝」與「裝或不裝各有什麼限制」。分成兩張時它們一樣寬、一樣
      的底色、一樣的標題層級，讀起來像兩個不相干的區塊，中間那道 16px 的
      縫是唯一的差別。

      併成一張之後用一條 hairline 分隔內部的兩段：層級由分隔線承擔，不再
      由「是不是另一張卡」承擔。
    -->
    <section class="install-card app-card">
      <div v-if="isStandalone" role="status">
        <h2 data-typography-role="card-title">已安裝</h2>
        <p>你已經可以從主畫面開啟防曬晴報員。</p>
      </div>

      <div v-else-if="deferredPrompt">
        <h2 data-typography-role="card-title">可以安裝到這台裝置</h2>
        <p>
          安裝後會在主畫面出現圖示、開啟更快，本機紀錄也比較不會因為清除瀏覽器資料而消失。
        </p>
        <button class="button button--primary" type="button" @click="install">
          安裝到手機
        </button>
      </div>

      <div v-else-if="isIos">
        <h2 data-typography-role="card-title">用 Safari 加入主畫面</h2>
        <ol>
          <li>點下方的分享按鈕。</li>
          <li>選擇「加入主畫面」。</li>
          <li>點「新增」。</li>
        </ol>
        <p class="install-card__note">選單名稱可能因裝置與瀏覽器版本不同。</p>
      </div>

      <div v-else>
        <h2 data-typography-role="card-title">從瀏覽器選單安裝</h2>
        <p>
          開啟瀏覽器選單，尋找「安裝應用程式」或「加入主畫面」。
          找不到時，用一般瀏覽器仍然可以完整使用。
        </p>
        <p class="install-card__note">選單名稱可能因裝置與瀏覽器版本不同。</p>
      </div>

      <p v-if="promptResult" class="install-result" role="status">
        {{ promptResult }}
      </p>

      <hr class="install-card__rule" />

      <div class="limits">
        <h2 data-typography-role="card-title">需要知道的限制</h2>
        <ul>
          <li>不安裝仍可使用核心功能。</li>
          <li>關閉頁面後仍受系統通知限制。</li>
          <li>清除快取或解除安裝，可能一併移除本機紀錄。</li>
        </ul>
      </div>
    </section>
  </div>
</template>

<style scoped>
/*
 * 卡片本身只負責內距與段落之間的節奏；`.limits` 與狀態區都是它的內部
 * 分段，各自再用同一個 gap 排自己的內容（2026-09-04 併卡）。
 */
.install-card {
  display: grid;
  justify-items: start;
  gap: var(--space-4);
  padding: clamp(1.25rem, 5vw, 2rem);
}

.install-card > div {
  display: grid;
  justify-items: start;
  gap: var(--space-3);
  width: 100%;
}

/*
 * 卡片內部的分隔線。層級由這條線承擔，不再由「是不是另一張卡」承擔——
 * 沿用衛教分類頁 `.education-heading__rule` 的做法，不另立第二種分隔。
 */
.install-card__rule {
  width: 100%;
  height: 0;
  margin: 0;
  border: 0;
  border-top: 1px solid var(--border-subtle);
}

/* 字級／字體由 `data-typography-role="card-title"` 供應，這裡只收邊界。 */
.install-card h2,
.limits h2 {
  margin: 0;
}

.install-card p,
.limits p {
  margin: 0;
  color: var(--text-body);
  line-height: var(--line-height-body);
}

.install-card ol,
.limits ul {
  margin: 0;
  padding-inline-start: var(--space-5);
  color: var(--text-body);
  line-height: var(--line-height-body);
}

.install-card__note {
  font-size: var(--font-size-body);
}

.install-result {
  width: 100%;
  margin: 0;
  padding: var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--surface-soft);
  color: var(--text-body);
  line-height: var(--line-height-body);
}
</style>
