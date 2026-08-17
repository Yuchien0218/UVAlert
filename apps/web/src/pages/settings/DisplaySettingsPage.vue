<script setup lang="ts">
import { computed } from "vue";
import { isSamsungInternet } from "../../app/browserIdentification";
import AppearanceSettings from "../../components/settings/AppearanceSettings.vue";
import { useAppearance } from "../../composables/useAppearance";

/**
 * S-18 顯示設定。
 *
 * 2026-08-06 sitemap 指出功能已做但「內嵌在 /more，沒有獨立路由」，
 * 位置不符規格。本頁把它移到規格指定的 `/settings/display`。
 */

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
      <h1 class="page-heading__title">顯示設定</h1>
      <p class="page-heading__body">
         調整防曬晴報員在這台裝置上的顯示方式。設定只儲存在本機。
      </p>
    </header>

    <AppearanceSettings
      v-model="selectedAppearance"
      :is-samsung-internet-browser="isSamsungInternetBrowser"
      :resolved-appearance="appearance.resolvedAppearance.value"
    />

    <RouterLink class="text-link" to="/more">返回更多</RouterLink>
  </div>
</template>

<style scoped>
.text-link {
  color: var(--text-secondary);
}
</style>
