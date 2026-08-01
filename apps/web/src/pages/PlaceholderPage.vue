<script setup lang="ts">
import { ArrowLeft } from "@lucide/vue";
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
      <ArrowLeft :size="18" aria-hidden="true" />
      返回首頁
    </RouterLink>
  </div>
</template>
