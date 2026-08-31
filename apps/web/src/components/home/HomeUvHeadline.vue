<script setup lang="ts">
import type { UvRiskLevel } from "@sunshield/contracts";
import { computed } from "vue";
import { getUvRiskLevelLabel } from "../../features/uv/uvForecastRules";

/**
 * 首屏的 UV 標題區塊。
 *
 * **刻意不畫逐時長條圖。** wireframe 原本在這裡有一條當日 UV 曲線，但中央
 * 氣象署開放資料沒有逐時紫外線——`F-D0047-091` 與 `O-A0005-001` 都是一天
 * 一個值，逐時觀測資料集（`O-A0001-001`）完全不含紫外線欄位。畫出來的
 * 曲線只能是捏造的，違反 DESIGN.md 第九節「要顯示資料就顯示真的資料」。
 * 「一天中什麼時候最強」屬於衛教「了解今天的 UV」的教育型示意（Sitemap
 * §4.6），不放在資料畫面上。
 *
 * 同理拿掉「12:00 最強」——資料集沒有尖峰時段。
 */

const props = defineProps<{
  /** 「今日 UV」或「明日 UV 預報」。 */
  eyebrow: string;
  /** null 代表沒有可用資料（未設定地區或取不到預報）。 */
  uvi: number | null;
  riskLevel: UvRiskLevel | null;
  /** 地區顯示名稱；未設定時傳 null，會顯示「臺灣」。 */
  regionName: string | null;
  /** 日間平均溫度。資料可能缺，缺時整段不顯示而不是顯示 0。 */
  temperatureCelsius: number | null;
  /** 右側註記，例如「地區預報」或「明天比今天高 1」。 */
  note: string | null;
}>();

const hasValue = computed(() => props.uvi !== null && props.riskLevel !== null);

const locationLine = computed(() => {
  const region = props.regionName ?? "臺灣";
  if (props.temperatureCelsius === null) {
    return region;
  }
  // 資料是日間平均溫度，不是即時觀測，也不是高低範圍——所以寫「約」。
  return `${region}・約 ${Math.round(props.temperatureCelsius)}°C`;
});
</script>

<template>
  <section class="uv-headline" aria-labelledby="uv-headline-title">
    <p id="uv-headline-title" class="uv-headline__eyebrow">
      {{ eyebrow }}
    </p>

    <div
      v-if="hasValue"
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

    <!--
      沒有資料時不顯示 0，也不顯示「--」。0 是一個合法的 UV 值，
      拿它當「沒資料」會讓使用者以為現在紫外線很低。
    -->
    <p v-else class="uv-headline__empty">無資料</p>

    <div class="uv-headline__meta">
      <span class="uv-headline__location">{{ locationLine }}</span>
      <span v-if="note !== null" class="uv-headline__note">{{ note }}</span>
      <span v-else class="uv-headline__note" aria-hidden="true">—</span>
    </div>
  </section>
</template>

<style scoped>
.uv-headline {
  display: grid;
  gap: var(--space-2);
}

.uv-headline__eyebrow {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
}

.uv-headline__value {
  display: flex;
  align-items: flex-end;
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
 * 原本「無資料」是整個 UV 區塊裡最大的字，比下面的地區名（16px）還大
 * ——**沒有資料的東西拿到了最大的視覺重量**。有 UV 值時那個位置放的是
 * `--display` 的大讀數，那是有內容才配得上的份量；沒有值時應該讓位給
 * 地區名，它是這個區塊裡唯一還有內容的東西。
 *
 * 用 supporting 而不是 body：這是「這裡沒有東西」的說明文字，對應
 * DESIGN.md 第五節的「次要資訊與補充文字」。
 */
.uv-headline__empty {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-supporting);
}

.uv-headline__meta {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-3);
  font-size: var(--font-size-body);
}

.uv-headline__note {
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
}
</style>
