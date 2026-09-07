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
        服務條款
      </h1>
      <p class="page-heading__body">
        使用 UVAlert 前，請先了解服務的用途與限制。
      </p>
      <IconButton icon="tool-arrow-left" label="返回更多" @click="goBack" />
    </header>

    <section class="app-card legal-card">
      <h2 data-typography-role="card-title">服務用途</h2>
      <p>
        UVAlert 提供 UV、天氣、防曬裝備與補擦提醒資訊，協助你規劃日常防曬行動。
      </p>
      <p>UV、天氣與補擦提醒僅供輔助參考，不構成醫療建議或防曬效果保證。</p>
    </section>

    <section class="app-card legal-card">
      <h2 data-typography-role="card-title">使用者責任</h2>
      <p>
        請依自身膚況、活動情境與專業醫療建議判斷是否曝曬、補擦或尋求協助。UVAlert
        不提供疾病診斷或個人化醫療建議。
      </p>
    </section>

    <section class="app-card legal-card">
      <h2 data-typography-role="card-title">帳號、資料與聯絡方式</h2>
      <p>
        Google
        登入與跨裝置同步皆為選用功能。你可在設定中管理同步、通知與雲端資料。
      </p>
      <p>
        如需提出隱私或帳號資料請求，請使用站內回饋表單；送出回饋不會自動執行資料匯出、刪除或帳號操作。
      </p>
      <div class="legal-card__links">
        <RouterLink class="button button--quiet" to="/privacy"
          >查看隱私權政策</RouterLink
        >
        <RouterLink class="button button--quiet" to="/feedback"
          >提出隱私請求</RouterLink
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
