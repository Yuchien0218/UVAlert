<script setup lang="ts">
import { onMounted } from "vue";
import FiveDayUvCard from "../components/uv/FiveDayUvCard.vue";
import { useWebAppServices } from "../app/injection";

/**
 * 五日 UV 預報。
 *
 * **這一頁是 2026-08-23 新增的。** 首頁改版後把五日預報從內嵌卡片改成
 * 「五日 UV 預報 ›」連結（wireframe 01–04 都有這一列），但當時
 * `FiveDayUvCard` 沒有任何頁面承接，等於把功能弄丟了。這頁補上落點。
 *
 * 內容刻意只有預報本身與資料來源說明——不放倒數、不放 Session 狀態。
 * DESIGN.md 第十一節：「不要在提醒頁以外的頁面顯示迷你倒數或 Session
 * 狀態——那會產生第二個提醒頁」。
 */

const { uvForecast } = useWebAppServices();

onMounted(() => {
  void uvForecast.ensureLoaded();
});
</script>

<template>
  <div class="page-stack">
    <header class="page-heading">
      <h1 class="page-heading__title" data-typography-role="page-title">
        五日 UV 預報
      </h1>
      <p class="page-heading__body">依你設定的地區顯示未來五天的紫外線指數。</p>
    </header>

    <FiveDayUvCard
      :phase="uvForecast.phase.value"
      :error="uvForecast.error.value"
      :forecast="uvForecast.forecast.value"
      @refresh="uvForecast.refresh"
    />

    <section class="forecast-region">
      <p class="forecast-region__label">
        {{
          uvForecast.region.value === null
            ? "尚未設定地區"
            : `目前地區：${uvForecast.region.value.displayName}`
        }}
      </p>
      <RouterLink class="text-link" to="/region">
        {{ uvForecast.region.value === null ? "設定地區" : "變更地區" }}
      </RouterLink>
    </section>

    <!--
      這段不可省略。資料是地區預報不是即時測站觀測，而且 UV 高低不會改變
      補擦間隔——那是由產品標示決定的。使用者很容易把「今天 UV 低」推論成
      「可以晚一點補」，這裡先擋住那個誤解（copy-audit.md 的既有寫法）。
    -->
    <p class="safety-note">
      這是地區預報，不是即時測站觀測；UV 高低不會延長或縮短你的補擦計時。
    </p>
  </div>
</template>

<style scoped>
.forecast-region {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-3);
  padding-top: var(--space-4);
  border-top: 1px solid var(--border-subtle);
}

.forecast-region__label {
  margin: 0;
  font-size: var(--font-size-body);
}
</style>
