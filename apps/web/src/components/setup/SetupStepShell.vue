<script setup lang="ts">
import Icon from "../icons/Icon.vue";
import type { SetupSaveStatus } from "../../features/setup/createSetupController";
import IconButton from "../common/IconButton.vue";

/**
 * 設定流程的外框：工具列（儲存狀態＋取消）、標題、內容、底部行動區。
 *
 * 2026-08-24：設定改成單一頁面（`/setup`）後，這裡移除了步驟指示器
 * （線性進度條＋「步驟 X/2」）與「返回上一步」——只有一頁就沒有步驟，
 * 也沒有上一步可回。`step`／`backTo` 兩個 prop 一併移除。
 */

interface Props {
  title: string;
  description: string;
  saveStatus: SetupSaveStatus;
  busy?: boolean;
}

withDefaults(defineProps<Props>(), {
  busy: false
});

defineEmits<{
  back: [];
}>();
</script>

<template>
  <section class="setup-shell" :aria-busy="busy">
    <!--
      2026-08-31：返回鈕與標題合併成同一列。

      原本工具列是**獨立的一列**（min-height 44px），底下再隔 --space-8
      才是標題——在窄螢幕上儲存狀態是隱藏的，所以那一列幾乎全空，等於
      標題上方憑空多出約 76px 的空白（使用者實測回報）。

      這跟 GearFormPage 的 form-heading 是同一個問題與同一個解法：標題與
      按鈕同列、說明橫跨兩欄。草稿儲存狀態改放在說明下方，它是短暫的
      回饋，不需要自己佔一列。
    -->
    <header class="setup-shell__heading">
      <h1 class="setup-shell__title" data-typography-role="page-title">
        {{ title }}
      </h1>

      <IconButton
        class="setup-shell__back"
        icon="tool-arrow-left"
        label="回上一頁"
        :disabled="busy"
        @click="$emit('back')"
      />

      <p class="setup-shell__description">{{ description }}</p>

      <!--
        2026-08-31：儲存成功不再顯示（使用者裁決）。

        使用者回報「草稿已儲存位置怪怪的」。位置確實怪——它夾在頁面說明與
        第一個操作區塊之間，是一條誰也不屬於的狀態行。但搬去哪裡都還是怪，
        因為根本問題是**它在報告一件預期會發生的事**：草稿本來就會存，
        存成功不是消息。常駐一條綠字的代價是每個使用者、每一次進這頁都要
        先讀一行與決策無關的字。

        **失敗仍然常駐。** 那是使用者需要知道、而且會改變行為的事（可能要
        重試或換網路）。不對稱是刻意的：預期內的結果安靜，意外要出聲。
      -->
      <span
        v-if="saveStatus === 'error'"
        class="setup-shell__save-status setup-shell__save-status--error"
        role="status"
      >
        <Icon name="state-offline" :size="20" />
        草稿未儲存
      </span>
    </header>

    <div class="setup-shell__content">
      <slot />
    </div>

    <footer class="setup-shell__actions">
      <slot name="actions" />
    </footer>
  </section>
</template>

<style scoped>
.setup-shell {
  display: grid;
  gap: var(--space-8);
}

.setup-shell__heading {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  /* 返回鈕的中心對齊標題那一列的中線，不是整塊的頂端。 */
  align-items: center;
  column-gap: var(--space-4);
  row-gap: var(--space-3);
}

.setup-shell__back:disabled {
  cursor: wait;
  opacity: 0.55;
}

/* 說明與儲存狀態橫跨兩欄，拿回被按鈕吃掉的那一段寬度。 */
.setup-shell__description,
.setup-shell__save-status {
  grid-column: 1 / -1;
}

.setup-shell__save-status {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-saved);
  font-size: var(--font-size-caption);
  white-space: nowrap;
}

.setup-shell__save-status--error {
  color: var(--color-due);
}

.setup-shell__title {
  /*
   * em 不是 ch——1ch 是字型裡「0」的寬度，中文是全形，兩者差 1.79 倍，
   * 所以 16ch 實際只裝得下約 9 個中文字。改用 em 之後數字寫幾就是幾個
   * 中文字。理由見 app.css 的 .page-heading__title。
   */
  max-width: 16em;
  margin: 0;
  font-size: var(--font-size-page-title);
  letter-spacing: var(--letter-spacing-page-title);
  line-height: 1;
}

.setup-shell__description {
  max-width: 38rem;
  margin: 0;
  color: var(--text-body);
  line-height: var(--line-height-body);
}

.setup-shell__content {
  display: grid;
  gap: var(--space-5);
}

.setup-shell__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  padding-bottom: env(safe-area-inset-bottom);
}

@media (max-width: 31rem) {
  .setup-shell__actions {
    display: grid;
  }
}
</style>
