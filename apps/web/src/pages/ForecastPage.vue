<script setup lang="ts">
import { computed, onMounted } from "vue";
import FiveDayUvCard from "../components/uv/FiveDayUvCard.vue";
import TaiwanUvDistribution from "../components/uv/TaiwanUvDistribution.vue";
import { useWebAppServices } from "../app/injection";

/**
 * 五日 UV 預報。
 *
 * 2026-08-23 新增，2026-09-11 提升為全站首頁入口分頁。
 * 讓使用者先掌握當前與未來數日紫外線風險，並在下方引導開始防曬提醒。
 */

const { uvForecast, boot } = useWebAppServices();

const hasActiveSession = computed(() => boot?.currentSession?.value != null);

onMounted(() => {
  void uvForecast.ensureLoaded();
  /*
   * 地圖資料只在這一頁載入。首頁不顯示地圖，一進 App 就抓等於為多數不會
   * 看地圖的人多付一次請求——而它與五日預報共用同一次上游抓取，晚一點抓
   * 不會讓 CWA 那邊多做事。
   */
  void uvForecast.ensureNationwideLoaded();
});
</script>

<template>
  <div class="page-stack">
    <header class="page-heading">
      <h1 class="page-heading__title" data-typography-role="page-title">
        五日 UV 預報
      </h1>
    </header>

    <FiveDayUvCard
      :phase="uvForecast.phase.value"
      :error="uvForecast.error.value"
      :forecast="uvForecast.forecast.value"
      @refresh="uvForecast.refresh"
    />

    <!--
      全臺 UV 分布地圖（2026-08-31）。

      **不可點**，而且整張 aria-hidden——色塊地圖對色覺障礙與螢幕閱讀器都
      傳達不了東西。等價內容是下方那份縣市 UV 清單：同樣的資料、可讀可
      選取、可以被搜尋。刻意不做「只給輔助技術的隱藏文字」，那種東西一旦
      跟畫面脫節就沒有人會發現。

      沒有資料時整塊不渲染。地圖是附加的視覺化，五日預報才是這頁的主體，
      它的失敗不該在畫面上留下一個壞掉的空位。
    -->
    <TaiwanUvDistribution
      v-if="uvForecast.nationwide.value !== null"
      :forecast="uvForecast.nationwide.value"
      :region="uvForecast.region.value"
    />

    <!--
      這段不可省略。資料是地區預報不是即時測站觀測，而且 UV 高低不會改變
      補擦間隔——那是由產品標示決定的。使用者很容易把「今天 UV 低」推論成
      「可以晚一點補」，這裡先擋住那個誤解（copy-audit.md 的既有寫法）。

      2026-08-31 補上「每一格是當日最高值」與那個例外。查證 cwa.ts：對同一
      日的多個時段取 max（candidate.uvi > existing.uvi），所以確實是最高值；
      但它同時跳過已經結束的時段（validTo <= now 就 continue），**所以今天
      那一格是「剩餘時段的最高」，下午打開時可能比上午實際發生過的值低**。
      不寫出這個例外，這句話對今天那一格就是錯的。

      同一段先前在 FiveDayUvCard 裡還有一份幾乎一樣的，已經移除——使用者
      回饋「重複性文字太多」。
    -->
    <p class="safety-note">
      今日數值為當前至日落最高預測，UV 高低不影響補擦倒數。
    </p>

    <div class="forecast-action">
      <RouterLink
        v-if="hasActiveSession"
        to="/reminder"
        class="button button--primary page-primary-action"
      >
        查看防曬提醒
      </RouterLink>
      <RouterLink
        v-else
        to="/setup"
        class="button button--primary page-primary-action"
      >
        開始防曬提醒
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.forecast-action {
  display: grid;
  justify-items: center;
  margin-top: var(--space-2);
}
</style>
