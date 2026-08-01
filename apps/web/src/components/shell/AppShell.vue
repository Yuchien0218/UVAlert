<script setup lang="ts">
import { computed, nextTick, useTemplateRef, watch } from "vue";
import { useRoute } from "vue-router";
import { useWebAppServices } from "../../app/injection";
import BottomNavigation from "./BottomNavigation.vue";
import BrandHeader from "./BrandHeader.vue";
import GlobalStatusBanner from "./GlobalStatusBanner.vue";

const { boot } = useWebAppServices();
const route = useRoute();
const mainElement = useTemplateRef<HTMLElement>("mainElement");
const navigationVisible = computed(
  () => route.meta.hideNavigation !== true
);

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
    <BrandHeader />
    <GlobalStatusBanner
      :phase="boot.phase.value"
      :error-code="boot.errorCode.value"
      :connectivity="boot.connectivity.value"
    />
    <main
      ref="mainElement"
      class="app-shell__main"
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

.app-shell__main {
  width: 100%;
  padding: clamp(1.5rem, 6vw, 3.5rem)
    clamp(1rem, 5vw, 2.75rem)
    var(--space-12);
}

.app-shell--with-navigation .app-shell__main {
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
    box-shadow: var(--shadow-card);
  }
}
</style>
