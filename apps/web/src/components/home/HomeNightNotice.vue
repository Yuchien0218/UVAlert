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
 * 用 `nav-reminder`（沙漏）而不是月亮：要說的不是「現在是晚上」，是
 * 「還沒有倒數在跑」。它同時是這個分頁自己的圖示——放大版出現在該分頁的
 * 空狀態裡是連貫的，不是另一件事。
 *
 * **先試過 `state-untimed`（未計時），畫出來看之後否決。** 語意其實更準，
 * 但那顆是四狀態剩餘量計量表的一員，造型是橫向的膠囊加斜線——為 20px
 * 的行內位置收斂的幾何，放到 56px 變成一塊寬扁的刪除記號，讀起來像
 * 「功能被停用」而不是「現在沒事做」。任何數值斷言對這件事都是綠的
 * （見 CLAUDE.md「有些問題只有畫出來看才找得到」）。
 */

defineEmits<{ start: [] }>();
</script>

<template>
  <div class="night-notice">
    <IconLead class="night-notice__lead" icon="nav-reminder" size="hero">
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
.night-notice {
  display: grid;
  gap: var(--space-5);
  justify-items: center;
  padding: var(--space-6) 0;
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
  justify-self: center;
  padding: var(--space-2) 0;
  border: 0;
  background: none;
  font: inherit;
  cursor: pointer;
}
</style>
