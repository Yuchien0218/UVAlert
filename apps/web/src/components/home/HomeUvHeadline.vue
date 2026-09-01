<script setup lang="ts">
import type { UvRiskLevel } from "@sunshield/contracts";
import { computed } from "vue";
import ChevronLink from "../common/ChevronLink.vue";
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
  /**
   * 註記，例如夜間的「明天比今天高 1」。白天是 null。
   *
   * 2026-08-31：白天原本固定送「地區預報」，已在 HomePage 拿掉——那四個字
   * 沒有資訊量，這個 App 的 UV 本來就只有地區預報一種來源。
   */
  note: string | null;
}>();

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
    <p id="uv-headline-title" class="uv-headline__eyebrow">
      {{ eyebrow }}
    </p>

    <!--
      2026-08-31：讀數右側補上前往五日預報的入口（使用者要求）。

      **這推翻了 2026-08-24 的一句註解**（「五日 UV 預報入口移到頁首右上角
      的 UV 指數，這裡不再重複一個入口」）。當時的顧慮是重複，但頁首那個
      入口是「臺中市西區 中量級」，看起來像狀態顯示而不是連結——沒有箭頭、
      沒有底線、也不在使用者正在讀的位置。實際可點卻沒人知道可點，等於
      沒有入口。

      放在讀數同一列的右端：它描述的正是這個數字「還有沒有別的可以看」。
    -->
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
      <ChevronLink class="uv-headline__more" to="/forecast">
        五日預報
      </ChevronLink>
    </div>

    <!--
      沒有資料時不顯示 0，也不顯示「--」。0 是一個合法的 UV 值，
      拿它當「沒資料」會讓使用者以為現在紫外線很低。
    -->
    <p v-else class="uv-headline__empty">無資料</p>

    <!--
      2026-08-31：拿掉「臺中市西區・約 28°C」那一行（使用者要求）。

      地區已經常駐在頁首右上角（「臺中市西區 中量級」），同一頁重複兩次；
      溫度不是這個 App 的主題，它跟著地區一起被帶進來，但沒有任何一個
      決策會用到它。

      note 只在真的有話說時才佔位——白天沒有註記，就不留一列空的。原本
      用一個 aria-hidden 的「—」佔位，那是為了讓地區與註記兩端對齊；地區
      拿掉之後沒有東西要對齊了。
    -->
    <p v-if="note !== null" class="uv-headline__note">{{ note }}</p>
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

/* 推到最右端。大小與間距由 ChevronLink 決定，這裡只管位置。 */
.uv-headline__more {
  margin-inline-start: auto;
  white-space: nowrap;
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
 * （2026-08-31 更新：當時「應該讓位給地區名」，而地區那一行已經拿掉了；
 * 降字級的理由本身不變。）
 *
 * 用 supporting 而不是 body：這是「這裡沒有東西」的說明文字，對應
 * DESIGN.md 第五節的「次要資訊與補充文字」。
 */
.uv-headline__empty {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-supporting);
}

.uv-headline__note {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
}
</style>
