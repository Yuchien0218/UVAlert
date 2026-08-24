<script setup lang="ts">
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

const isStandalone = computed(() =>
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
</script>

<template>
  <div class="page-stack">
    <header class="page-heading">
      <h1 class="page-heading__title">安裝到手機</h1>
      <p class="page-heading__body">
        安裝後資料較不容易因關閉瀏覽器分頁而遺失。<strong>不安裝也可以正常使用</strong>。
      </p>
    </header>

    <section v-if="isStandalone" class="install-card app-card" role="status">
      <h2>已安裝</h2>
      <p>你已經可以從主畫面開啟防曬晴報員。</p>
    </section>

    <section v-else-if="deferredPrompt" class="install-card app-card">
      <h2>可以安裝到這台裝置</h2>
      <p>安裝後會在主畫面出現圖示，開啟速度較快；本機資料也較不容易因清除瀏覽器資料而遺失。</p>
      <button class="button button--primary" type="button" @click="install">
        安裝到手機
      </button>
    </section>

    <section v-else-if="isIos" class="install-card app-card">
      <h2>用 Safari 加入主畫面</h2>
      <ol>
        <li>點下方的分享按鈕。</li>
        <li>選擇「加入主畫面」。</li>
        <li>點「新增」。</li>
      </ol>
      <p class="install-card__note">選單名稱可能因裝置與瀏覽器版本不同。</p>
    </section>

    <section v-else class="install-card app-card">
      <h2>從瀏覽器選單安裝</h2>
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
      <h2>需要知道的限制</h2>
      <ul>
        <li>不安裝仍可使用全部核心功能。</li>
        <li>安裝不會讓系統在關閉頁面後保證送出通知。</li>
        <li>清除網站資料或解除安裝，可能一併移除這台裝置上的本機資料。</li>
      </ul>
    </section>

    <RouterLink class="text-link" to="/more">返回更多</RouterLink>
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

.install-card h2,
.limits h2 {
  margin: 0;
  font-size: var(--font-size-section-title);
}

.install-card p,
.limits p {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.7;
}

.install-card ol,
.limits ul {
  margin: 0;
  padding-inline-start: 1.3rem;
  color: var(--text-secondary);
  line-height: 1.8;
}

.install-card__note {
  font-size: var(--font-size-body);
}

.install-result {
  margin: 0;
  padding: var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--surface-soft);
  color: var(--text-secondary);
  line-height: 1.7;
}

.text-link {
  color: var(--text-secondary);
}
</style>
