<script setup lang="ts">
import { onMounted } from "vue";
import FiveDayUvCard from "../components/uv/FiveDayUvCard.vue";
import TaiwanUvMap from "../components/uv/TaiwanUvMap.vue";
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

/**
 * 色條的滿格門檻＝**危險級的起點**（UVI 11，CWA 分級）。
 *
 * 不用資料裡的最大值當滿格：那樣每天的比例尺都不同，昨天的「滿格」與今天
 * 的「滿格」不是同一件事，跨日就不能比。固定門檻讓「滿格＝已達危險級」
 * 永遠是同一個意思，11 以上（12、13…）一律滿格——它們的差異由右邊的數字
 * 承載，色條回答的是「到頂了沒」。
 */
const UVI_FULL_SCALE = 11;

/** 色條寬度。回傳百分比字串，由 inline style 餵給 `--uvi-fill`。 */
function uviFill(uvi: number): string {
  return `${Math.round(Math.min(uvi / UVI_FULL_SCALE, 1) * 100)}%`;
}

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
    <section
      v-if="uvForecast.nationwide.value !== null"
      class="uv-map-section"
      aria-labelledby="uv-map-title"
    >
      <h2 id="uv-map-title" data-typography-role="section-title">
        今日全臺分布
      </h2>

      <TaiwanUvMap
        :forecast="uvForecast.nationwide.value"
        :highlight-county-code="
          uvForecast.region.value === null
            ? null
            : uvForecast.region.value.regionCode.slice(0, 5)
        "
      />

      <ul class="uv-map-list">
        <li
          v-for="county in uvForecast.nationwide.value.counties"
          :key="county.countyCode"
          class="uv-map-list__item"
          :class="`uv-map-list__item--${county.riskLevel}`"
          :style="{ '--uvi-fill': uviFill(county.uvi) }"
        >
          <span>{{ county.displayName }}</span>
          <span class="stat-figure">{{ county.uvi }}</span>
        </li>
      </ul>
    </section>

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
  </div>
</template>

<style scoped>
.uv-map-section {
  display: grid;
  gap: var(--space-4);
}

/*
 * 清單是地圖的等價內容，不是附屬裝飾——所以它常駐、可選取，並且用一般
 * 內文字級而不是縮到最小。窄螢幕兩欄、寬一點三欄。
 */
.uv-map-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-1) var(--space-4);
  margin: 0;
  padding: 0;
  list-style: none;
}

@media (min-width: 30rem) {
  .uv-map-list {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.uv-map-list__item {
  position: relative;
  display: flex;
  justify-content: space-between;
  gap: var(--space-2);
  padding-block: var(--space-1);
  border-bottom: 1px solid var(--border-subtle);
  color: var(--text-body);
  font-size: var(--font-size-supporting);
}

/*
 * 縣市色條（2026-09-05）。
 *
 * 改動前這份清單是 22 個等重的數字——要知道「今天哪裡最曬」得逐一比大小。
 * 地圖已經在上面用顏色講了同一件事，但它 `aria-hidden`，而且色塊地圖對
 * 色覺障礙傳達不了東西；清單是它的等價內容，卻完全沒有視覺編碼。
 *
 * **長度是第一重編碼，顏色是第二重，數字仍然是第三重。**
 *
 * 顏色刻意不套在文字上：實測五個 UV 色在畫布上的對比是 low 4.12、
 * moderate **2.97**、high 3.43、very_high 4.74、extreme 5.48——三個過不了
 * 小字 AA 的 4.5，moderate 連圖形物件的 3.0 都不到。所以顏色只能當**冗餘
 * 編碼**（資訊由數字承載），做成 20% 的淡色底條。
 *
 * 那個濃度是算過的：文字疊在色條上的對比最低仍有 6.01（內文）／9.71
 * （數字），五個等級全部遠超 AA。
 */
.uv-map-list__item::before {
  content: "";
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  width: var(--uvi-fill, 0);
  border-radius: var(--radius-xs);
  background: var(--uvi-fill-tint, transparent);
}

/*
 * `position: relative` 是必要的，不是保險。
 *
 * 少了它，`::before` 這個後生成的定位元素會蓋在文字上（同一個 stacking
 * context 裡，定位元素依 DOM 順序疊放）。這與 2026-09-04 底部導覽藥丸蓋住
 * 圖示是同一個坑——那次所有數值斷言都過，只有截圖看得出來。
 *
 * 刻意不用 `z-index`：CLAUDE.md 要求 scoped style 的 z-index 一律走 token，
 * 而這裡需要的是「內容在色條之上」這種區域性疊放，開一個全站 token 反而
 * 是把區域問題升級成全域概念。靠 DOM 順序就夠了。
 */
.uv-map-list__item > span {
  position: relative;
}

.uv-map-list__item--low {
  --uvi-fill-tint: color-mix(in srgb, var(--color-uvi-low) 20%, transparent);
}

.uv-map-list__item--moderate {
  --uvi-fill-tint: color-mix(
    in srgb,
    var(--color-uvi-moderate) 20%,
    transparent
  );
}

.uv-map-list__item--high {
  --uvi-fill-tint: color-mix(in srgb, var(--color-uvi-high) 20%, transparent);
}

.uv-map-list__item--very_high {
  --uvi-fill-tint: color-mix(
    in srgb,
    var(--color-uvi-very-high) 20%,
    transparent
  );
}

.uv-map-list__item--extreme {
  --uvi-fill-tint: color-mix(
    in srgb,
    var(--color-uvi-extreme) 20%,
    transparent
  );
}

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
