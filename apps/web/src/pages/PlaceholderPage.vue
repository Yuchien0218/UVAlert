<script setup lang="ts">
import Icon from "../components/icons/Icon.vue";
import { computed } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();

const heading = computed(() =>
  typeof route.meta.heading === "string"
    ? route.meta.heading
    : "這個功能正在準備中"
);
const body = computed(() =>
  typeof route.meta.body === "string"
    ? route.meta.body
    : "目前可以使用下方導覽回到主要功能。"
);
</script>

<template>
  <div class="page-stack">
    <header class="page-heading">
      <h1 class="page-heading__title">{{ heading }}</h1>
      <p class="page-heading__body">{{ body }}</p>
    </header>

    <RouterLink class="text-link" to="/">
      <Icon name="tool-arrow-left" :size="20" />
      返回提醒
    </RouterLink>
  </div>
</template>
