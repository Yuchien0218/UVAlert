<script setup lang="ts">
import { computed } from "vue";
/**
 * 空白狀態卡片。`titleTag`／`role` 可覆寫是因為三個呼叫端語意不同：
 * ProductDetailPage 的「找不到這件裝備」是那個畫面唯一的 h1（且是錯誤
 * 狀態，role="alert"），ProductsPage／HelpIndexPage 則是次要區塊的 h2。
 */
interface Props {
  title: string;
  body: string;
  titleTag?: "h1" | "h2";
  role?: "alert" | "status" | undefined;
}

const props = withDefaults(defineProps<Props>(), {
  titleTag: "h2",
  role: undefined
});

const titleTypographyRole = computed(() =>
  props.titleTag === "h1" ? "page-title" : "section-title"
);
</script>

<template>
  <section class="app-card empty-state" :role="role">
    <component :is="titleTag" :data-typography-role="titleTypographyRole">
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
  padding: var(--space-5);
}

.empty-state p {
  margin: 0;
  color: var(--text-body);
  line-height: var(--line-height-body);
}
</style>
