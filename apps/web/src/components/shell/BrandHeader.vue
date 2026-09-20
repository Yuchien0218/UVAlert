<script setup lang="ts">
import { computed } from "vue";

import type { UvRiskLevel } from "@sunshield/contracts";
import BrandLockup from "./BrandLockup.vue";

interface Props {
  /** 目前地區名稱。與 riskLevel 同時有值時，右上角顯示五日預報入口。 */
  regionName?: string | null;
  /** 是否已有可用 UV 預報（白天今日、夜間明日，由父層決定）。 */
  uvRiskLevel?: UvRiskLevel | null;
  /** 是否隱藏右上角預報入口（例如在預報頁本身不需要自我連結）。 */
  hideUvEntrance?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  regionName: null,
  uvRiskLevel: null,
  hideUvEntrance: false
});

/**
 * 2026-09-13 使用者裁決：地區與風險等級移到提醒頁的 UV 區塊；頁首右上角
 * 改成「五日 UV 預報」，讓它明確讀成導覽入口而非重複的狀態資訊。
 *
 * 沒有 UV 可顯示時（沒設定地區，或預報讀不到）顯示「今日全臺UV分布」，
 * 連到 /forecast。
 *
 * 2026-08-24 一併移除原本的 tone／狀態點（提醒進行中／快到補擦時間／
 * 建議現在補擦）。那組資訊現在整份都在首頁看得到（倒數、部位狀態清單），
 * 頁首再放一次只是重複，還會跟 UV 搶同一個位置。
 */
const showUv = computed(
  () => !props.hideUvEntrance && props.regionName !== null && props.uvRiskLevel !== null
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
    <template v-if="!hideUvEntrance">
      <RouterLink
        v-if="showUv"
        class="brand-header__uv"
        to="/forecast"
      >
        五日 UV 預報
      </RouterLink>

      <RouterLink v-else class="brand-header__set-region" to="/forecast">
        今日全臺UV分布
      </RouterLink>
    </template>
  </header>
</template>

<style scoped>
.brand-header {
  display: flex;
  min-height: 4.5rem;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  /*
   * 左右留白必須與內容區**逐字相同**（2026-09-04 使用者回報「Logo 太靠左，
   * 要跟底下元件對齊」）。
   *
   * 這裡原本是 `clamp(1rem, 4vw, 2.25rem)`，`AppShell` 的 `main` 是
   * `clamp(1rem, 5vw, 2.75rem)`——兩個不同的 clamp，於是在每一種寬度下都
   * 差一點：375px 實測頁首 16、內容 18.75。
   *
   * 改成同一個 clamp。**不要只改成某個固定值**——兩邊都會隨寬度變，寫死
   * 一個數字只會在某一個視窗寬度下剛好對上。
   */
  padding: 0 clamp(1rem, 5vw, 2.75rem);
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

/*
 * 2026-09-04：補上 `min-height`。
 *
 * 這是「回首頁」的連結，每一頁都有，但它的高度一直等於裡面那張 1.6rem
 * 的 lockup——**實測 26px**，遠低於 `DESIGN.md` 訂的 44px。Logo 只有 26px
 * 高不必改（那是視覺份量的裁決），但**可以按的範圍**要撐到 44。
 */
.brand-header__brand {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
  min-height: var(--tap-target);
  color: var(--text-primary);
  text-decoration: none;
  transition:
    transform var(--duration-fast) var(--ease-out),
    opacity var(--duration-fast) var(--ease-out);
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.brand-header__brand:active {
  transform: scale(0.97);
  opacity: 0.82;
}

.brand-header__logo {
  height: 1.6rem;
  width: auto;
  flex: 0 0 auto;
}

@media (prefers-reduced-motion: reduce) {
  .brand-header__brand {
    transition: none;
  }
}

/* 沒有 UV 可顯示時的出口，樣式跟 UV 一致，只是不帶風險色。 */
.brand-header__set-region {
  display: inline-flex;
  align-items: center;
  min-height: var(--tap-target);
  padding: var(--space-3) 0;
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
  font-weight: 500;
  line-height: 1.2;
  text-decoration: none;
}

/*
 * 五日 UV 預報入口。保留原本的 class，避免讓全域頁首樣式產生不必要的
 * 分支；內容已不再承擔即時風險狀態，因此使用一般次要文字色。
 *
 * **2026-09-04 更正**：這裡原本寫「觸控目標靠 padding 撐到 44px，不寫
 * min-height」——**實測只有 42px**（12＋18＋12）。那句話從一開始就不成立。
 * 改成寫 `min-height: var(--tap-target)`：它引用的正是共用 token，不是
 * 元件自己發明一個尺寸，所以與第十節那條「不要覆寫共用 token」不衝突。
 */
.brand-header__uv {
  display: inline-flex;
  align-items: center;
  min-height: var(--tap-target);
  padding: var(--space-3) 0;
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
  font-weight: 500;
  line-height: 1.2;
  text-decoration: none;
}

</style>
