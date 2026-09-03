<script setup lang="ts">
import type { ZoneProjection } from "@sunshield/contracts";
import { getZoneLabel } from "../../features/reminder/reminderPresentation";

defineProps<{
  zones: ZoneProjection[];
  selectedZoneIds: string[];
  suggestedZoneIds: string[];
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
      部位清單包一層：`.question-card > * + *` 是給「區塊之間」的 16px，
      13 個 label 各自當直接子代的話，每一列都會多 16px，整張卡會膨脹成
      現在的兩倍高。包起來之後那 16px 只出現在清單與上方按鈕之間。
    -->
    <div class="zone-list">
      <label
        v-for="zone in zones"
        :key="zone.zoneInstanceId"
        class="zone-choice"
      >
        <input
          type="checkbox"
          :checked="selectedZoneIds.includes(zone.zoneInstanceId)"
          @change="emit('toggle', zone.zoneInstanceId)"
        />
        <span>{{ getZoneLabel(zone) }}</span>
        <small v-if="suggestedZoneIds.includes(zone.zoneInstanceId)">建議</small>
      </label>
    </div>
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
.zone-list {
  display: grid;
}

.zone-choice {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  min-height: var(--tap-target);
  gap: var(--space-3);
  border-top: 1px solid var(--border-subtle);
}
.zone-choice input {
  inline-size: 1.35rem;
  block-size: 1.35rem;
}
/*
 * 這個 `<small>` 是 badge（「建議」），不是說明文字，所以覆寫掉 app.css 給
 * `small` 的 supporting 預設，改用 DESIGN.md 第五節指定給 badge 的 caption。
 */
.zone-choice small {
  color: var(--color-tracking);
  font-size: var(--font-size-caption);
}
</style>
