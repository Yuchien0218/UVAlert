<script setup lang="ts">
import { computed } from "vue";
import { isSamsungInternet } from "../app/browserIdentification";
import AppearanceSettings from "../components/settings/AppearanceSettings.vue";
import { useAppearance } from "../composables/useAppearance";

const appearance = useAppearance();
const isSamsungInternetBrowser = isSamsungInternet(
  globalThis.navigator.userAgent
);
const selectedAppearance = computed({
  get: () => appearance.preference.value,
  set: appearance.setPreference
});
</script>

<template>
  <div class="page-stack">
    <header class="page-heading">
      <h1 class="page-heading__title">更多設定</h1>
      <p class="page-heading__body">
        調整防曬晴報員在這台裝置上的顯示方式。
      </p>
    </header>

    <AppearanceSettings
      v-model="selectedAppearance"
      :is-samsung-internet-browser="isSamsungInternetBrowser"
      :resolved-appearance="appearance.resolvedAppearance.value"
    />
  </div>
</template>
