<script setup lang="ts">
import { computed, nextTick, useTemplateRef, watch } from "vue";
import { useRoute } from "vue-router";
import { useWebAppServices } from "../../app/injection";
import BottomNavigation from "./BottomNavigation.vue";
import BrandHeader from "./BrandHeader.vue";
import GlobalStatusBanner from "./GlobalStatusBanner.vue";

const { boot, uvForecast } = useWebAppServices();
const route = useRoute();
const mainElement = useTemplateRef<HTMLElement>("mainElement");
const navigationVisible = computed(
  () => route.meta.hideNavigation !== true
);

/**
 * 頁首右上角的 UV 指數（2026-08-24 使用者裁決，取代原本的「本機提醒」）。
 *
 * 白天顯示今日、夜間顯示明日——跟首頁 HomeUvHeadline 同一條規則：夜間看
 * 「今天的 UV」沒有行動價值，今天已經過完了。
 */
const isNight = computed(() => uvForecast.isEvening.value);

const headerUvDay = computed(() => {
  const days = uvForecast.forecast.value?.days ?? [];
  if (days.length === 0) return null;
  return isNight.value ? days[1] ?? null : days[0] ?? null;
});

watch(
  () => route.fullPath,
  async () => {
    await nextTick();
    mainElement.value?.focus({ preventScroll: true });
  }
);
</script>

<template>
  <div
    class="app-shell"
    :class="{ 'app-shell--with-navigation': navigationVisible }"
  >
    <BrandHeader
      :region-name="uvForecast.region.value?.displayName ?? null"
      :uv-risk-level="headerUvDay?.riskLevel ?? null"
    />
    <GlobalStatusBanner
      :phase="boot.phase.value"
      :error-code="boot.errorCode.value"
      :connectivity="boot.connectivity.value"
    />
    <main
      ref="mainElement"
      class="app-shell__main"
      :class="{ 'app-shell__main--with-navigation': navigationVisible }"
      tabindex="-1"
    >
      <slot />
    </main>
    <BottomNavigation v-if="navigationVisible" />
  </div>
</template>

<style scoped>
.app-shell {
  display: grid;
  width: min(100%, var(--content-max));
  min-height: 100vh;
  min-height: 100svh;
  grid-template-rows: auto auto 1fr;
  margin: 0 auto;
  border-inline: 1px solid var(--border-subtle);
  background: var(--page-background);
}

/*
 * 2026-08-24：上緣留白的下限從 1.5rem 拉到 2rem。手機寬度時 6vw 算出來
 * 比下限小，等於一律吃到 24px——頁首（72px 高）與 32px 的大標題之間只有
 * 24px，標題會讀成貼在頁首上、像是頁首的一部分。
 *
 * 依 DESIGN.md 第四節，24px 是「頁面內主要區塊」的間距；App 外框與頁面
 * 內容之間是語意上更大的分界，用 32px 讓標題自己站住。左右留白與下緣
 * 不變。
 */
.app-shell__main {
  width: 100%;
  padding: clamp(2rem, 6vw, 3.5rem)
    clamp(1rem, 5vw, 2.75rem)
    var(--space-12);
}

.app-shell__main--with-navigation {
  padding-bottom: calc(
    var(--space-12) + var(--bottom-nav-height) +
      env(safe-area-inset-bottom)
  );
}

.app-shell__main:focus {
  outline: none;
}

@media (min-width: 48rem) {
  .app-shell {
    box-shadow: none;
  }
}
</style>
