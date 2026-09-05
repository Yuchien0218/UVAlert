<script setup lang="ts">
import { computed } from "vue";
import type { IconName } from "../../generated/icons.generated";
import IconLead from "./IconLead.vue";

/**
 * 空白狀態卡片。`titleTag`／`role` 可覆寫是因為三個呼叫端語意不同：
 * ProductDetailPage 的「找不到這件裝備」是那個畫面唯一的 h1（且是錯誤
 * 狀態，role="alert"），ProductsPage／HelpIndexPage 則是次要區塊的 h2。
 *
 * ---
 *
 * **2026-09-05：接上 56px 檔位。**
 *
 * DESIGN.md 第八節把 56 定義成「**空狀態裡唯一的視覺主體**」，但這個元件
 * ——全站真正的空狀態卡——原本完全沒有圖示，而 `IconLead size="hero"` 只用
 * 在 `HomeNightNotice` 一個地方。**檔位說它是給空狀態的，空狀態卻沒有用
 * 它。** 這跟 `.section-heading` 被鎖在單一頁面的 scoped style 是同一類
 * 問題：規則存在、工具存在，只是沒接上。
 *
 * **`icon` 刻意是選填的，而且只給「本來就沒有東西」的空狀態用。**
 *
 * 判準是 56 檔位自己的定義（「旁邊沒有別的內容」時的唯一視覺主體）：
 *
 * - **有圖示**：這裡本來就是空的，而且是預期中的（還沒有任何裝備、內容
 *   還在審查中）。畫面上除了一句話沒有別的東西，圖示才是「唯一的視覺
 *   主體」
 * - **沒有圖示**：`role="alert"` 的讀取失敗。那是暫時性的狀況，不是一個
 *   章節；配一顆 56px 的圖示會把「等一下再試」放大成「這裡就是這樣」
 *
 * 選圖示時**避開四狀態計量表**（`state-tracking`／`soon`／`due`／
 * `untimed`）：那一族的幾何是為 20px 行內位置收斂的橫向膠囊，放到 56px
 * 會讀成刪除記號——DESIGN.md 第八節記著這是實際試過並否決的。
 */
interface Props {
  title: string;
  body: string;
  /**
   * 只在「本來就沒有東西」的空狀態傳；錯誤狀態不傳（理由見上）。
   *
   * 明寫 `| undefined` 是因為 `exactOptionalPropertyTypes: true`——少了它，
   * `withDefaults` 給的 `icon: undefined` 會被判成型別不合（既有的 `role`
   * 也是同一個寫法）。
   */
  icon?: IconName | undefined;
  titleTag?: "h1" | "h2";
  role?: "alert" | "status" | undefined;
}

const props = withDefaults(defineProps<Props>(), {
  icon: undefined,
  titleTag: "h2",
  role: undefined
});

const titleTypographyRole = computed(() =>
  props.titleTag === "h1" ? "page-title" : "section-title"
);
</script>

<template>
  <section class="app-card empty-state" :role="role">
    <!--
      標題重複寫兩次是刻意的：`title` 是 prop 不是 slot，Vue 沒有乾淨的
      「條件式包裝」語法。把 `v-if` 放在 IconLead 上、標題留在外面也不行
      ——hero 的排法是「圖示在上、文字在下」，標題必須在 IconLead 裡面才
      會被那個 column 佈局管到。
    -->
    <IconLead v-if="props.icon" :icon="props.icon" size="hero">
      <component :is="titleTag" :data-typography-role="titleTypographyRole">
        {{ title }}
      </component>
    </IconLead>
    <component
      v-else
      :is="titleTag"
      :data-typography-role="titleTypographyRole"
    >
      {{ title }}
    </component>
    <p>{{ body }}</p>
    <slot name="actions" />
  </section>
</template>

<style scoped>
.empty-state {
  display: grid;
  justify-items: start;
  gap: var(--space-4);
  padding: var(--card-padding);
}

.empty-state p {
  margin: 0;
  color: var(--text-body);
  line-height: var(--line-height-body);
}
</style>
