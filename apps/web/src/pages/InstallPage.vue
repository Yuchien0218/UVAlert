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

    <section v-if="isStandalone" class="install-card app-card" role="status">
      <h2 data-typography-role="card-title">已安裝</h2>
      <p>你已經可以從主畫面開啟防曬晴報員。</p>
    </section>

    <section v-else-if="deferredPrompt" class="install-card app-card">
      <h2 data-typography-role="card-title">可以安裝到這台裝置</h2>
      <p>
        安裝後會在主畫面出現圖示，開啟速度較快；本機資料也較不容易因清除瀏覽器資料而遺失。
      </p>
      <button class="button button--primary" type="button" @click="install">
        安裝到手機
      </button>
    </section>

    <section v-else-if="isIos" class="install-card app-card">
      <h2 data-typography-role="card-title">用 Safari 加入主畫面</h2>
      <ol>
        <li>點下方的分享按鈕。</li>
        <li>選擇「加入主畫面」。</li>
        <li>點「新增」。</li>
      </ol>
      <p class="install-card__note">選單名稱可能因裝置與瀏覽器版本不同。</p>
    </section>

    <section v-else class="install-card app-card">
      <h2 data-typography-role="card-title">從瀏覽器選單安裝</h2>
      <p>
        開啟瀏覽器選單，尋找「安裝應用程式」或「加入主畫面」。
        找不到時，用一般瀏覽器仍然可以完整使用。
      </p>
      <p class="install-card__note">選單名稱可能因裝置與瀏覽器版本不同。</p>
    </section>

    <p v-if="promptResult" class="install-result" role="status">
      {{ promptResult }}
    </p>

    <section class="limits app-card">
      <h2 data-typography-role="card-title">需要知道的限制</h2>
      <ul>
        <li>不安裝仍可使用核心功能。</li>
        <li>關閉頁面後仍受系統通知限制。</li>
        <li>清除快取或解除安裝，可能一併移除本機紀錄。</li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.install-card,
.limits {
  display: grid;
  justify-items: start;
  gap: var(--space-3);
  padding: clamp(1.25rem, 5vw, 2rem);
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
  margin: 0;
  padding: var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--surface-soft);
  color: var(--text-body);
  line-height: var(--line-height-body);
}
</style>
