<script setup lang="ts">
import { RouterView } from "vue-router";
import AppShell from "./components/shell/AppShell.vue";
</script>

<template>
  <AppShell>
    <RouterView />
  </AppShell>
</template>
