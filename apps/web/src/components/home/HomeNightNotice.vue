<script setup lang="ts">
import IconLead from "../common/IconLead.vue";

/**
 * 夜間說明（沒有進行中的提醒時）。
 *
 * 這一段存在的理由是「解釋為什麼現在沒有事情要做」。夜間頁刻意不放主要
 * CTA——UV 是 0，不需要防曬，沒有倒數可開始——但整頁沒有行動會讓使用者
 * 分不出是功能壞了還是本來就沒事做（2026-08-23 裁決，見
 * `docs/decisions/2026-08-23-wireframe-copy-fixes.md` §3.3）。
 *
 * DESIGN.md 第六節「每頁只保留一個最主要任務與一個主要 CTA」是**上限
 * 不是下限**，沒有 CTA 並不違反規範。
 *
 * **2026-08-31 加上主角圖示。** 使用者回報這一頁「太空」——確實：夜間
 * 狀態下整頁只有一句話加一條底線連結，看起來像載入失敗而不是「本來就
 * 沒事做」。這正是空狀態需要一個視覺主體的情形。
 *
 * **2026-08-31 第二次：改用月亮 `state-night`（使用者裁決）。**
 *
 * 這推翻了同一天稍早的選擇。當時選 `nav-reminder`（沙漏）的理由是「要說
 * 的不是現在是晚上，是還沒有倒數在跑」，並且試過 `state-untimed` 後畫出
 * 來否決（那顆是為 20px 收斂的幾何，放到 56px 變成一塊寬扁的刪除記號，
 * 讀起來像「功能被停用」）。
 *
 * 使用者看過畫面後指定用月亮，等於裁決**這一段要說的就是「現在是晚上」**
 * ——那是「不需要防曬」的原因，而沙漏只說得出結果。原因比結果好懂。
 *
 * 幾何與 `education-after-sun-care` 相同，但登記成獨立的 id，理由見
 * `tools/icon-system/generate-icons.mjs` 裡那顆的註解。
 */

defineEmits<{ start: [] }>();
</script>

<template>
  <div class="night-notice">
    <IconLead class="night-notice__lead" icon="state-night" size="hero">
      <p class="night-notice__body">現在不需要防曬，明早出門前再開始提醒。</p>
    </IconLead>

    <!--
      逃生出口不可省略：裝置時區或時鐘設錯、跨時區旅行、夜班戶外工作者
      都可能真的需要在夜間開始提醒。硬性阻斷會讓產品對他們完全不可用。
      做成 text link 而非按鈕，避免與「現在不需要防曬」互相矛盾。
    -->
    <button
      class="text-link night-notice__escape"
      data-typography-role="body"
      type="button"
      @click="$emit('start')"
    >
      還是要開始提醒
    </button>
  </div>
</template>

<style scoped>
/*
 * 2026-08-31：靠左、收緊（使用者回報「行距有點大，加上是置中的，跟其他頁
 * 有點不太像」）。
 *
 * 三項一起改才有效：`justify-items: center` 是全站唯一一處置中的內容區塊；
 * gap 從 space-5 降一級；上下 padding 從 space-6 降一級。原本鬆到讓這一段
 * 看起來像載入失敗的空白頁，而不是「本來就沒事做」。
 */
.night-notice {
  display: grid;
  gap: var(--space-4);
  justify-items: start;
  /* padding-block 而不是 `padding: … 0`——後者會被 cardPadding 守門判成
     卡片內距的原始值（那條守的是 `padding: var(--space-5)` 開頭的宣告）。 */
  padding-block: var(--space-5);
}

/*
 * 圖示用 --color-untimed，跟它在部位清單裡代表的狀態同色；不是灰色的
 * 「停用」，是「這一段時間本來就不計時」。
 */
.night-notice__lead {
  color: var(--color-untimed);
}

.night-notice__body {
  margin: 0;
  color: var(--text-emphasis);
  font-size: var(--font-size-body);
  line-height: var(--line-height-body);
}

.night-notice__escape {
  justify-self: start;
  padding: var(--space-2) 0;
  border: 0;
  background: none;
  font: inherit;
  cursor: pointer;
}
</style>
