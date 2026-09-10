<script setup lang="ts">
import { useRouter } from "vue-router";
import IconButton from "../components/common/IconButton.vue";

const router = useRouter();

function goBack(): void {
  void router.push({ name: "more" });
}
</script>

<template>
  <div class="page-stack">
    <header class="page-heading page-heading--with-exit">
      <h1 class="page-heading__title" data-typography-role="page-title">
        隱私權政策
      </h1>
      <p class="page-heading__body">
        說明防曬晴報員如何處理提醒、登入、同步與聯絡資料。
      </p>
      <IconButton icon="tool-arrow-left" label="返回更多" @click="goBack" />
    </header>

    <section class="app-card legal-card">
      <h2 data-typography-role="card-title">本機提醒與資料</h2>
      <p>
        未登入時，你的提醒與設定會保留在這台裝置。你可在本機資料與隱私設定中查看、匯出或清除本機資料。
      </p>
    </section>

    <section class="app-card legal-card">
      <h2 data-typography-role="card-title">Google 登入與跨裝置同步</h2>
      <p>
        Google登入僅用於建立登入工作階段與跨裝置同步。防曬晴報員不會讀取Gmail、Google Drive、聯絡人或其他Google服務資料。
      </p>
      <p>
        同步功能為選用，可隨時停止同步，或在登入與雲端資料設定中清除防曬晴報員的雲端資料。
      </p>
    </section>

    <section class="app-card legal-card">
      <h2 data-typography-role="card-title">通知與位置</h2>
      <p>
        若同意接收推播通知，瀏覽器會保存推播訂閱資料，以傳送補擦提醒。可隨時在通知設定中關閉通知。
      </p>
      <p>
        位置只會在你允許時，用於判斷目前地區的UV與天氣資訊，防曬晴報員不會保存精確座標。
      </p>
    </section>

    <section class="app-card legal-card">
      <h2 data-typography-role="card-title">隱私請求與條款</h2>
      <p>
        如需提出隱私或帳號資料請求，請使用站內回饋表單。表單不會自動執行資料匯出、刪除或帳號操作。
      </p>
      <div class="legal-card__links">
        <RouterLink class="button button--quiet" to="/terms"
          >查看服務條款</RouterLink
        >
        <RouterLink class="button button--quiet" to="/feedback"
          >問題回報與意見回饋</RouterLink
        >
      </div>
    </section>
  </div>
</template>

<style scoped>
.legal-card {
  display: grid;
  gap: var(--space-3);
  justify-items: start;
  padding: var(--card-padding);
}

.legal-card h2,
.legal-card p {
  margin: 0;
}

.legal-card p {
  color: var(--text-body);
  line-height: var(--line-height-body);
}

.legal-card__links {
  display: grid;
  gap: var(--space-2);
  width: 100%;
}
</style>
