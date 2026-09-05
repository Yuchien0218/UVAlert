<script setup lang="ts">
import { computed } from "vue";
import type { NationwideUvForecast } from "@sunshield/contracts";
import outlines from "../../generated/county-outlines.generated.json";

/**
 * 全臺 UV 分布地圖。
 *
 * **不可點**（2026-08-31 使用者裁決）。它是資訊圖，不是地區選擇器——同時
 * 兼兩個角色會讓「看一眼今天哪裡曬」變成一個需要小心不要誤觸的介面。
 *
 * **無障礙**：整張圖 `aria-hidden`，因為色塊地圖對色覺障礙與螢幕閱讀器都
 * 傳達不了東西。等價內容是旁邊既有的縣市 UV 數字清單（同樣的資料、可讀
 * 可選取），不是另外做一份只給輔助技術的隱藏文字——那種東西一旦跟畫面
 * 脫節就沒人會發現。
 *
 * 幾何來自 `pnpm county-outlines:build`（內政部國土測繪中心官方界線降精度，
 * 22 縣市約 70KB）。
 *
 * ## 三個只有畫出來才看得到的問題（2026-08-31 實測修正）
 *
 * **一、描邊不能是別的顏色。** 資料是「同縣市所有鄉鎮的環」，看得見的描邊
 * 會把 368 條鄉鎮界全部畫出來，每個縣市變成一塊馬賽克而不是一塊色。第一版
 * 用畫布色描邊，就是這個結果。
 *
 * **二、但也不能完全不描邊。** 相鄰鄉鎮是各自獨立簡化的，共用邊被推到不同
 * 位置，縣市內部因此出現白色細縫。解法是**用與填色相同的顏色描邊**：形狀
 * 往外撐一點點把縫補起來，而因為同色所以不會產生任何看得見的線。
 *
 * 這兩點合起來才是完整的規則，缺一邊都會壞。單元測試兩個都測不出來。
 *
 * **三、金門要放進 inset。** 金門在東經 118.3，本島最西的澎湖是 119.5——
 * 照實際經度畫，本島只佔畫布右邊約六成，手機上小到看不出分布。把金門單獨
 * 平移到左下角的 inset，是紙本地圖的通用作法；它的經緯度**沒有被竄改**，
 * 只是換一個投影原點畫。
 */

const props = defineProps<{
  forecast: NationwideUvForecast;
  /** 使用者目前設定的縣市，會多一個定位標記。null 代表沒設定地區。 */
  highlightCountyCode: string | null;
}>();

/** 金門：離本島太遠，單獨畫成 inset。 */
const INSET_COUNTY_CODES = new Set(["09020"]);

/**
 * 經度乘 cos(緯度) 修正橫向壓縮，否則台灣會顯得比實際胖（24 度附近約 9%）。
 * 緯度要上下翻轉——SVG 的 y 往下增加，緯度往上增加。
 */
const LATITUDE_SCALE = Math.cos((24 * Math.PI) / 180);

type Outline = (typeof outlines.counties)[number];

function boundsOf(list: Outline[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const county of list) {
    for (const ring of county.rings) {
      for (const point of ring) {
        const [x, y] = point as [number, number];
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  return { minX, minY, maxX, maxY };
}

const mainCounties = outlines.counties.filter(
  (county) => !INSET_COUNTY_CODES.has(county.countyCode)
);
const insetCounties = outlines.counties.filter((county) =>
  INSET_COUNTY_CODES.has(county.countyCode)
);

const mainBounds = boundsOf(mainCounties);
const width = (mainBounds.maxX - mainBounds.minX) * LATITUDE_SCALE;
const height = mainBounds.maxY - mainBounds.minY;

function pathFor(
  county: Outline,
  origin: { minX: number; maxY: number },
  scale: number,
  offset: { x: number; y: number }
): string {
  return county.rings
    .map(
      (ring) =>
        `M${ring
          .map((point) => {
            const [lon, lat] = point as [number, number];
            const x = (lon - origin.minX) * LATITUDE_SCALE * scale + offset.x;
            const y = (origin.maxY - lat) * scale + offset.y;
            return `${x.toFixed(3)} ${y.toFixed(3)}`;
          })
          .join("L")}Z`
    )
    .join("");
}

const riskByCounty = computed(
  () =>
    new Map(
      props.forecast.counties.map((county) => [
        county.countyCode,
        county.riskLevel
      ])
    )
);

function decorate(county: Outline, path: string) {
  return {
    countyCode: county.countyCode,
    countyName: county.countyName,
    path,
    risk: riskByCounty.value.get(county.countyCode) ?? null
  };
}

const mainShapes = computed(() =>
  mainCounties.map((county) =>
    decorate(county, pathFor(county, mainBounds, 1, { x: 0, y: 0 }))
  )
);

/**
 * 金門的 inset：放大 2 倍擺在左下角。放大是因為它本身很小，照原比例畫在
 * 角落只會是一個看不出形狀的點。
 */
const insetBounds = boundsOf(insetCounties);
const INSET_SCALE = 2;
const insetShapes = computed(() =>
  insetCounties.map((county) =>
    decorate(
      county,
      pathFor(county, insetBounds, INSET_SCALE, {
        x: width * 0.04,
        y: height * 0.82
      })
    )
  )
);

/** 目前所在縣市的定位標記：取它最大環的中心。 */
const marker = computed(() => {
  if (props.highlightCountyCode === null) return null;
  const county = mainCounties.find(
    (candidate) => candidate.countyCode === props.highlightCountyCode
  );
  if (county === undefined) return null;
  const largest = [...county.rings].sort(
    (left, right) => right.length - left.length
  )[0];
  if (largest === undefined) return null;
  let sumX = 0;
  let sumY = 0;
  for (const point of largest) {
    const [lon, lat] = point as [number, number];
    sumX += (lon - mainBounds.minX) * LATITUDE_SCALE;
    sumY += mainBounds.maxY - lat;
  }
  return { x: sumX / largest.length, y: sumY / largest.length };
});
</script>

<template>
  <!--
    aria-hidden 是刻意的，等價內容在旁邊的縣市 UV 清單。role="img" ＋
    aria-label 反而更糟：螢幕閱讀器會唸出一個沒有內容的「圖片」。
  -->
  <svg
    class="uv-map"
    :viewBox="`0 0 ${width.toFixed(3)} ${height.toFixed(3)}`"
    aria-hidden="true"
    focusable="false"
  >
    <path
      v-for="shape in [...mainShapes, ...insetShapes]"
      :key="shape.countyCode"
      :d="shape.path"
      :class="[
        'uv-map__county',
        shape.risk === null
          ? 'uv-map__county--unknown'
          : `uv-map__county--${shape.risk}`
      ]"
    />

    <!--
      定位標記用一個小環而不是描邊整個縣市：資料是鄉鎮環的集合，描邊會把
      該縣市內部的鄉鎮界一起畫出來。
    -->
    <circle
      v-if="marker !== null"
      class="uv-map__marker"
      :cx="marker.x"
      :cy="marker.y"
      r="0.06"
    />
  </svg>
</template>

<style scoped>
.uv-map {
  display: block;
  width: 100%;
  max-width: 15rem;
  height: auto;
  margin-inline: auto;
}

/*
 * **描邊的顏色一律與填色相同。**
 *
 * 這不是為了畫邊界——邊界要是看得見，368 條鄉鎮界就會全部跑出來，每個
 * 縣市變成一塊馬賽克（第一版就是這樣）。
 *
 * 它解決的是另一個問題：相鄰鄉鎮的多邊形是**各自獨立簡化**的，共用邊被
 * 各自推到不同位置，於是縣市內部出現一條條白色細縫（2026-08-31 畫出來才
 * 看到，單元測試完全測不出來）。用同色描邊把每個形狀往外撐一點點，縫就
 * 補起來了，而且因為同色所以不會產生任何看得見的線。
 *
 * 正解是保留拓撲的簡化（TopoJSON 那一類），但那要引進一整套工具鏈；
 * 在這個尺度下同色描邊的結果肉眼上完全等價。
 */
.uv-map__county {
  stroke-width: 0.008;
  stroke-linejoin: round;
}

/*
 * 沒有資料的縣市用中性灰，跟 --color-untimed 同一個語意（「沒有時間／沒有
 * 資訊」）。不要用最低的 UV 色——那會讓「查不到」看起來像「很安全」。
 */
.uv-map__county--unknown {
  fill: var(--color-untimed-soft, var(--surface-soft));
  stroke: var(--color-untimed-soft, var(--surface-soft));
}

.uv-map__county--low {
  fill: var(--color-uvi-low);
  stroke: var(--color-uvi-low);
}

.uv-map__county--moderate {
  fill: var(--color-uvi-moderate);
  stroke: var(--color-uvi-moderate);
}

.uv-map__county--high {
  fill: var(--color-uvi-high);
  stroke: var(--color-uvi-high);
}

.uv-map__county--very_high {
  fill: var(--color-uvi-very-high);
  stroke: var(--color-uvi-very-high);
}

.uv-map__county--extreme {
  fill: var(--color-uvi-extreme);
  stroke: var(--color-uvi-extreme);
}

.uv-map__marker {
  fill: none;
  stroke: var(--text-primary);
  stroke-width: 0.03;
}
</style>
