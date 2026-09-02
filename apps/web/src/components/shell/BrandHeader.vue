<script setup lang="ts">
import { computed } from "vue";

import type { UvRiskLevel } from "@sunshield/contracts";
import BrandLockup from "./BrandLockup.vue";
import { getUvRiskLevelLabel } from "../../features/uv/uvForecastRules";

interface Props {
  /** 目前地區名稱。與 riskLevel 同時有值時，右上角才顯示 UV。 */
  regionName?: string | null;
  /** 要顯示的 UV 風險等級（白天今日、夜間明日，由父層決定）。 */
  uvRiskLevel?: UvRiskLevel | null;
}

const props = withDefaults(defineProps<Props>(), {
  regionName: null,
  uvRiskLevel: null
});

/**
 * 2026-08-24 使用者裁決：右上角從「本機提醒」改成顯示紫外線指數，
 * 例如「臺中市 低量級」，文字顏色跟著風險等級走，點下去到 /forecast。
 *
 * 沒有 UV 可顯示時（沒設定地區，或預報讀不到）改顯示「前往地區設定」，
 * 連到 /region——那是唯一能讓使用者自己解決的動作，比留一句沒有出口的
 * 狀態文字有用。
 *
 * 2026-08-24 一併移除原本的 tone／狀態點（提醒進行中／快到補擦時間／
 * 建議現在補擦）。那組資訊現在整份都在首頁看得到（倒數、部位狀態清單），
 * 頁首再放一次只是重複，還會跟 UV 搶同一個位置。
 */
const showUv = computed(
  () => props.regionName !== null && props.uvRiskLevel !== null
);

const uvLabel = computed(() =>
  props.uvRiskLevel === null
    ? null
    : `${props.regionName} ${getUvRiskLevelLabel(props.uvRiskLevel)}`
);
</script>

<template>
  <header class="brand-header">
    <RouterLink
      class="brand-header__brand"
      to="/"
      aria-label="防曬晴報員提醒頁"
    >
      <!--
        2026-08-23 換成正式 Logo（docs/design/logo/uvalert-lockup-horizontal.svg）。
        2026-09-01 抽成 `BrandLockup.vue`——分享卡也要放同一個 lockup，複製一份
        會讓同一組 Illustrator 幾何有兩個副本。
      -->
      <BrandLockup class="brand-header__logo" />
    </RouterLink>
    <RouterLink
      v-if="showUv"
      class="brand-header__uv"
      :class="`brand-header__uv--${uvRiskLevel}`"
      to="/forecast"
    >
      {{ uvLabel }}
    </RouterLink>

    <RouterLink v-else class="brand-header__set-region" to="/region">
      前往地區設定
    </RouterLink>
  </header>
</template>

<style scoped>
.brand-header {
  display: flex;
  min-height: 4.5rem;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: 0 clamp(1rem, 4vw, 2.25rem);
  /*
   * 2026-08-31：拿掉底部的分隔線（使用者要求）。
   *
   * 頁首與內容是同一片暖象牙，沒有色差要交代；那條線唯一的作用是宣告
   * 「這裡有個邊界」，但邊界本來就靠 Logo 與 4.5rem 的留白讀得出來。
   * 少一條線之後整頁只剩底部導覽那一條分隔線，層次更乾淨。
   *
   * 這是全域頁首，所以每一頁都會少掉這條線——那是刻意的，不是只有提醒頁。
   */
}

.brand-header__brand {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
  color: var(--text-primary);
  text-decoration: none;
}

/*
 * 2026-08-23：使用者要求放大，英文副標「UVAlert」拿掉，只留 Logo。
 *
 * 2026-08-30：高度從 3.25rem(52px) 改成 2rem(32px)，因為**長寬比變了**。
 * 使用者重新匯出 lockup 時裁掉了四周留白，viewBox 從 `0 0 243 84`
 * （比例 2.89）變成 `0 0 168.44 31.61`（比例 5.33）。同樣設 52px 高，
 * 寬度會從 150px 變成 277px——實測把「前往地區設定」擠成兩行。
 *
 * 32px 高 → 171px 寬。舊版扣掉留白後的圖形實際視覺寬是 101px，所以這仍
 * 比先前大一截（符合 2026-08-23 那次「要求放大」的方向），同時在 390px
 * 視窗下留得住右側連結（171 ＋ 連結 73 ＋ gap 16 ＝ 260 < 可用的 358）。
 *
 * 2026-08-31：使用者回饋 32px 那版「太大了」，裁決 1.6rem(25.6px)
 * → 136px 寬。這比舊版 lockup 的實際渲染寬（150px）更小一些，也就是
 * 比 2026-08-30 換圖之前還收斂。
 *
 * 順帶說明一個容易誤判的地方：換圖後看起來變大，**不是有人刻意放大過**
 * ——是裁掉四周留白之後，同樣的高度換到了更多圖形。所以「調回原本大小」
 * 在數字上不等於「調回原本的 height」。
 */
.brand-header__logo {
  height: 1.6rem;
  width: auto;
  flex: 0 0 auto;
}

/* 沒有 UV 可顯示時的出口，樣式跟 UV 一致，只是不帶風險色。 */
.brand-header__set-region {
  display: inline-flex;
  align-items: center;
  padding: var(--space-3) 0;
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
  font-weight: 500;
  text-decoration: none;
}

/*
 * UV 指數入口。顏色用 DESIGN.md 第二節的 UV 五級風險色。
 *
 * 顏色不是唯一的載體——等級名稱（低量級／中量級…）本身就是文字，
 * 灰階或色覺差異下仍讀得出來，符合本檔案上方對狀態點的同一條規則。
 * 觸控目標靠 padding 撐到 44px，不寫 min-height（見 DESIGN.md 第十節
 * 2026-08-22 更正：元件覆寫尺寸會蓋掉共用 token）。
 */
.brand-header__uv {
  display: inline-flex;
  align-items: center;
  padding: var(--space-3) 0;
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
  font-weight: 500;
  text-decoration: none;
}

.brand-header__uv--low {
  color: var(--color-uvi-low);
}

.brand-header__uv--moderate {
  color: var(--color-uvi-moderate);
}

.brand-header__uv--high {
  color: var(--color-uvi-high);
}

.brand-header__uv--very_high {
  color: var(--color-uvi-very-high);
}

.brand-header__uv--extreme {
  color: var(--color-uvi-extreme);
}
</style>
