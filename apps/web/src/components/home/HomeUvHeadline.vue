<script setup lang="ts">
import type { UvRiskLevel } from "@sunshield/contracts";
import { computed } from "vue";
import {
  getUvRiskLevelAdvice,
  getUvRiskLevelLabel
} from "../../features/uv/uvForecastRules";

/**
 * 首屏的 UV 標題區塊。
 */

const props = withDefaults(defineProps<{
  /** 「今日 UV」或「明日 UV 預報」。 */
  eyebrow: string;
  /** null 代表沒有可用資料（未設定地區或取不到預報）。 */
  uvi: number | null;
  riskLevel: UvRiskLevel | null;
  /** 目前預報地區；有值時提供前往地區設定的入口。 */
  regionName?: string | null;
  /** 目前預報地區代碼；用於推算代表性經緯度。 */
  regionCode?: string | null;
  /** 無地區時是否提供精簡設定入口；提醒進行中使用，避免插入大型提示卡。 */
  showRegionSetup?: boolean;
  /**
   * 註記，例如夜間的「明天比今天高 1」。白天是 null。
   *
   * 2026-08-31：白天原本固定送「地區預報」，已在 HomePage 拿掉——那四個字
   * 沒有資訊量，這個 App 的 UV 本來就只有地區預報一種來源。
   */
  note: string | null;
}>(), {
  regionName: null,
  regionCode: null,
  showRegionSetup: false
});

const hasValue = computed(() => props.uvi !== null && props.riskLevel !== null);
</script>

<template>
  <!--
    2026-08-31：沒有 UV 值時整塊縮成一行。

    有值時是「eyebrow ／ 大讀數＋等級＋入口 ／ 註記」三段，值得上下兩條
    分隔線圍出來的一個帶狀區。**沒有值時它只剩「今日 UV / 無資料」，卻
    照樣佔著同一塊空間**——首頁實測 89px，而那 89px 沒有告訴使用者任何
    可以行動的事。

    **縮成一行而不是整塊隱藏**：取不到預報有兩種原因，沒設定地區（另有
    提示卡負責）與抓取失敗。整塊藏起來的話，第二種情況畫面上不會有任何
    痕跡，使用者會以為這個 App 沒有 UV 功能。留一行是誠實的下限。
  -->
  <section
    class="uv-headline"
    :class="{ 'uv-headline--empty': !hasValue }"
    aria-labelledby="uv-headline-title"
  >
    <div class="uv-headline__header">
      <p id="uv-headline-title" class="uv-headline__eyebrow">
        {{ eyebrow }}
      </p>
      <div
        v-if="regionName !== null || showRegionSetup || note !== null"
        class="uv-headline__meta"
      >
        <RouterLink
          v-if="regionName !== null"
          class="uv-headline__region"
          to="/region"
        >
          {{ regionName }}
        </RouterLink>
        <RouterLink
          v-else-if="showRegionSetup"
          class="uv-headline__region"
          to="/region"
        >
          設定地區
        </RouterLink>
        <p v-if="note !== null" class="uv-headline__note">{{ note }}</p>
      </div>
    </div>

    <div v-if="hasValue" class="uv-headline__main">
      <div
        class="uv-headline__value"
        :class="`uv-headline__value--${riskLevel}`"
      >
        <span class="stat-figure stat-figure--display uv-headline__figure">{{
          uvi
        }}</span>
        <span class="uv-headline__level">
          {{ getUvRiskLevelLabel(riskLevel!) }}
        </span>
      </div>
    </div>

    <p v-if="hasValue" class="uv-headline__advice">
      {{ getUvRiskLevelAdvice(riskLevel!) }}
    </p>

    <!--
      沒有資料時不顯示 0，也不顯示「--」。0 是一個合法的 UV 值，
      拿它當「沒資料」會讓使用者以為現在紫外線很低。
    -->
    <p v-else class="uv-headline__empty">無資料</p>
  </section>
</template>

<style scoped>
/*
 * 2026-08-31：上下各一條分隔線（使用者要求，位置由截圖指定）。
 *
 * 這跟同一天把提醒頁的分隔線全部拿掉**不衝突**：那時拿掉的是「區塊各自
 * 在自己上緣畫一條」，線在畫面上是零散的；這裡是把 UV 這一段**框成一個
 * 帶狀區**——它是首頁唯一一段「不是你的倒數、是環境資料」的內容，值得
 * 跟前後分開。
 *
 * 用 border-block 一次寫上下兩條，值沿用其他頁面的 border-subtle。
 */
.uv-headline {
  display: grid;
  gap: var(--space-2);
  padding-block: var(--space-5);
  border-block: 1px solid var(--border-subtle);
}

/* 沒有值時排成一行：eyebrow 與「無資料」並排，內距也收掉一半。 */
.uv-headline--empty {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  padding-block: var(--space-3);
}

.uv-headline--empty .uv-headline__header {
  display: contents;
}

.uv-headline--empty .uv-headline__meta {
  order: 2;
  margin-inline-start: auto;
}

.uv-headline__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-2);
}

.uv-headline__main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.uv-headline__meta {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}

.uv-headline__region {
  display: inline-flex;
  min-height: var(--tap-target);
  align-items: center;
  margin-block: calc(-1 * var(--space-3));
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
  font-weight: 500;
  text-decoration: none;
}

.uv-headline__eyebrow {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
}

/*
 * 2026-09-04：`flex-end` → `baseline`（使用者畫線指出這一列底部沒對齊）。
 *
 * `flex-end` 對齊的是**盒子**的下緣，三個盒子確實都收在同一條線上（實測
 * 都是 196.4）。但「五日預報 ›」是 `ChevronLink`，它有 44px 的觸控高度而
 * 文字在裡面垂直置中——盒子貼齊底部時，那行字反而被抬高約 8px。畫面上就
 * 是使用者圈的那個落差。
 *
 * `baseline` 對齊的是**文字**，44px 的空高不再參與；讀數、等級與連結三段
 * 字坐在同一條基線上。
 */
.uv-headline__value {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}

/*
 * 2026-08-31：UV 讀數與等級套上風險色（使用者要求）。
 *
 * 讀數是 48–60px 的大字（WCAG 大字門檻 3:1），等級標籤是 20px 的一般
 * 字級（門檻 4.5:1）——**兩者都直接上色**。
 *
 * 這一版標籤原本是「淡色底＋深咖文字」的藥丸，為的是繞過對比度：當時
 * UV 五色在暖象牙底上有三個過不了 4.5:1。色票在同一天壓暗之後五級全部
 * 及格（見 DESIGN.md 第二節與 packages/ui/src/uvRiskContrast.test.ts），
 * 繞道就沒必要了，讀數與標籤回到同一種表現方式。
 */
.uv-headline__level {
  font-size: var(--font-size-section-title);
  font-weight: 500;
}

.uv-headline__value--low .uv-headline__figure,
.uv-headline__value--low .uv-headline__level {
  color: var(--color-uvi-low);
}

.uv-headline__value--moderate .uv-headline__figure,
.uv-headline__value--moderate .uv-headline__level {
  color: var(--color-uvi-moderate);
}

.uv-headline__value--high .uv-headline__figure,
.uv-headline__value--high .uv-headline__level {
  color: var(--color-uvi-high);
}

.uv-headline__value--very_high .uv-headline__figure,
.uv-headline__value--very_high .uv-headline__level {
  color: var(--color-uvi-very-high);
}

.uv-headline__value--extreme .uv-headline__figure,
.uv-headline__value--extreme .uv-headline__level {
  color: var(--color-uvi-extreme);
}

/*
 * 2026-08-30：從 section-title(20px) 降到 supporting(14px)。
 *
 * 原本「無資料」是整個 UV 區塊裡最大的字——**沒有資料的東西拿到了最大的
 * 視覺重量**。有 UV 值時那個位置放的是 `--display` 的大讀數，那是有內容
 * 才配得上的份量。
 *
 * （2026-09-13 更新：地區已移到標題列右側；降字級的理由本身不變。）
 *
 * 用 supporting 而不是 body：這是「這裡沒有東西」的說明文字，對應
 * DESIGN.md 第五節的「次要資訊與補充文字」。
 */
.uv-headline__empty {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-supporting);
}

.uv-headline__advice {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
  line-height: var(--line-height-caption);
}

.uv-headline__note {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
}
</style>
