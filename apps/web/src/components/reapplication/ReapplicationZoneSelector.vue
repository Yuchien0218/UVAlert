<script setup lang="ts">
import type { ZoneProjection } from "@sunshield/contracts";
import ZoneSelectorGrid from "../reminder/ZoneSelectorGrid.vue";

defineProps<{
  zones: ZoneProjection[];
  selectedZoneIds: string[];
  error: string | undefined;
}>();
const emit = defineEmits<{
  suggested: [];
  all: [];
  toggle: [zoneId: string];
}>();
</script>

<template>
  <!--
    2026-09-03：改用共用的 `.question-card`（使用者回報這一頁跑版）。
    原本自己刻了 legend 字級與內距，量出來是 20px，而同一頁其他四個區塊
    標題都是 18px——多出來的 2px 沒有理由，只是沒有走共用類別。
  -->
  <fieldset
    class="zone-selector question-card app-card"
    :aria-describedby="error ? 'zone-selection-error' : undefined"
  >
    <legend>補擦哪些部位？</legend>
    <!-- 「確認後才會更新」移到頁首說一次就好（2026-09-03）。 -->
    <p class="question-card__helper">已預選到期或快到補擦時間的部位。</p>
    <!--
      2026-09-03：改用共用的 `.button-group`。這兩顆是短標籤的成對動作，
      跟首頁「繼續設定／重新開始」是同一種形狀；原本的 `.mode-actions`
      自己刻了 flex，所以吃不到 2026-09-03 那次「窄螢幕仍然並排」的修正，
      在手機上是上下兩顆滿寬按鈕（實測各 294px）。
    -->
    <div class="button-group mode-actions">
      <button
        class="button button--quiet"
        type="button"
        @click="emit('suggested')"
      >
        只選建議部位
      </button>
      <!--
        2026-09-03：「選擇所有提醒部位」→「選擇全部部位」。兩顆並排之後
        等寬 141px，8 個字會折成兩行、跟左邊那顆一行的高度對不齊。清單裡
        列出來的本來就只有這次提醒的部位，「提醒」兩個字不帶新資訊。
      -->
      <button class="button button--quiet" type="button" @click="emit('all')">
        選擇全部部位
      </button>
    </div>
    <!--
      2026-09-03：改用記錄狀況那頁在用的 `ZoneSelectorGrid`（chip）。
      同一個問題「哪些部位？」原本有兩種樣子：那頁是會換行的藥丸，這頁是
      13 個整列。整列量到 766px，chip 換行之後大約一半。

      「建議」badge 跟著拿掉：被建議的部位本來就已經勾起來了，badge 只是
      把同一件事再說一次；13 個 badge 在一頁裡也是噪音。說明文字已經寫著
      「已預選到期或快到補擦時間的部位」。
    -->
    <ZoneSelectorGrid
      :zones="zones"
      :selected-zone-ids="selectedZoneIds"
      @toggle="(zoneId: string) => emit('toggle', zoneId)"
    />
    <p v-if="error" id="zone-selection-error" class="form-error" role="alert">
      {{ error }}
    </p>
  </fieldset>
</template>

<style scoped>
/*
 * 內距、fieldset 重置、legend 的字級與 float 修正、以及 legend→說明的
 * 8px 間距，全部由 `.question-card` 提供（2026-09-03 起）。這裡只留這張卡
 * 特有的東西。
 *
 * 2026-08-30 那條「legend 字重 700 → 500」的修正仍然有效，只是現在由共用
 * 類別統一給值，不必在這裡覆寫。
 */
/* 版面（間距）留在這裡，排法交給 `.button-group`。 */
.mode-actions {
  margin-block: var(--space-4);
}
</style>
