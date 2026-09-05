<script setup lang="ts">
import type { RegionPreferenceV1 } from "@sunshield/contracts";
import Icon from "../icons/Icon.vue";

interface Props {
  preference: RegionPreferenceV1 | null;
}

defineProps<Props>();
</script>

<template>
  <section class="region-summary" aria-labelledby="region-summary-title">
    <Icon name="feature-region" :size="24" />
    <!--
      2026-09-03（稽核 §D）：標籤與值改成**同一列、左右對齊**。

      這個 App 陳述「目前設定是什麼」有三種排法：本機資料頁是標籤左值右、
      這裡是標籤上值下、設定流程是標籤左值中連結右。三種都在講同一件事。
      裁決是統一成左右對齊——它在窄螢幕上最省高度，而且本機資料頁那份
      （六列 `dl`）已經是最完整的實作。

      字級沒有跟著降到內文：這一列是地區設定頁的主角，不是一張資料表裡的
      第 N 列。統一的是**排法**，不是層級。
    -->
    <div class="region-summary__row">
      <h2
        id="region-summary-title"
        class="region-summary__title"
        data-typography-role="card-title"
      >
        目前設定
      </h2>
      <p class="region-summary__value">
        <template v-if="preference?.mode === 'selected'">
          {{ preference.selection.displayName }}
        </template>
        <template v-else-if="preference?.mode === 'skipped'">
          先不設定地區
        </template>
        <template v-else>尚未設定地區</template>
      </p>
      <!--
        2026-08-31：刪掉這句（使用者裁決）。頁面標題下方已經寫了「僅用於
        提供 UV 資訊，不影響補擦倒數」，同一頁講兩次同一件事。
      -->
    </div>
  </section>
</template>

<style scoped>
.region-summary {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--space-3);
  padding-block: var(--space-5);
  border-block: 1px solid var(--border-subtle);
}

/*
 * `baseline` 而不是 `center`：兩者字級相同但字重不同，靠基線對齊才不會
 * 因為粗體的視覺重心而看起來錯開。窄到放不下時 `wrap` 讓值掉到下一行，
 * 那是退路不是預設。
 */
.region-summary__row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2) var(--space-4);
}

.region-summary__title,
.region-summary__value {
  margin: 0;
}

.region-summary__title {
  font-size: var(--font-size-card-title);
  color: var(--text-secondary);
}

.region-summary__value {
  font-size: var(--font-size-card-title);
  font-weight: 600;
}

</style>
