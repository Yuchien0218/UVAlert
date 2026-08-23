<script setup lang="ts">
import { computed } from "vue";
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

const statusLabel = computed(() => {
  if (!isSupported.value) return "此裝置不支援";
  if (isGranted.value) return "已開啟";
  if (isDenied.value) return "已被封鎖";
  return "未開啟";
});

async function requestPermission(): Promise<void> {
  await notifications.requestPermission();
}

function goBack(): void {
  void router.push({ name: "more" });
}
</script>

<template>
  <div class="page-stack notification-settings-page">
    <header class="detail-header">
      <button class="back-link" type="button" @click="goBack">
        <Icon name="tool-arrow-left" :size="20" />
        返回更多
      </button>
    </header>

    <header class="page-heading">
      <h1>通知設定</h1>
      <p>
        在防曬即將失效或該補擦時接收提醒。提醒由這台裝置本機發出，不經由外部伺服器。
      </p>
    </header>

    <!-- 裝置支援與權限狀態卡片 -->
    <section class="app-card" aria-labelledby="permission-heading">
      <h2 id="permission-heading">補擦提醒狀態</h2>
      <p class="status-summary">
        目前狀態：<strong>{{ statusLabel }}</strong>
      </p>

      <div v-if="!isSupported" class="note-box" role="status">
        <p>目前使用的瀏覽器或環境不支援本機通知功能。</p>
      </div>

      <div v-else-if="isDenied" class="note-box" role="alert">
        <p>
          通知權限已被瀏覽器封鎖。若想接收補擦提醒，請至瀏覽器或系統設定中解除封鎖。
        </p>
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
    -->
    <section class="app-card" aria-labelledby="delivery-heading">
      <h2 id="delivery-heading">通知傳送說明</h2>
      <ul class="info-list">
        <li>
          <strong>單一提醒原則</strong>：系統每次只會排定下一個最近的補擦到期提醒，避免過多通知干擾。
        </li>
        <li v-if="canDeliverInBackground">
          <strong>送達範圍</strong>：支援關閉分頁後送達。
        </li>
        <li v-else>
          <strong>送達範圍</strong>：只在分頁還活著時送達——切到其他分頁或
          App 仍會收到，但關掉瀏覽器或分頁被系統回收後就不會送達。你仍需
          自己回來查看目前的補擦狀態。
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.notification-settings-page {
  display: grid;
  gap: var(--space-4);
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-primary);
  font-size: var(--font-size-caption);
  cursor: pointer;
}

.app-card {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-5);
}

.status-summary {
  margin: 0;
  font-size: var(--font-size-body);
}

.note-box {
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--surface-raised);
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
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

.info-list {
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding-left: var(--space-4);
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
  line-height: 1.6;
}
</style>
