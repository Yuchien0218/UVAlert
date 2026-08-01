<script setup lang="ts">
import { SunMedium } from "@lucide/vue";
</script>

<template>
  <header class="brand-header">
    <RouterLink class="brand-header__brand" to="/" aria-label="防曬晴報員首頁">
      <SunMedium :size="22" :stroke-width="1.6" aria-hidden="true" />
      <span class="brand-header__wordmark">UVAlert 防曬晴報員</span>
    </RouterLink>
    <div class="brand-header__context">
      <span class="brand-header__status-dot" aria-hidden="true" />
      本機提醒
    </div>
  </header>
</template>

<style scoped>
.brand-header {
  display: flex;
  min-height: 4.5rem;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: 0 clamp(1rem, 4vw, 2.25rem);
  border-bottom: 1px solid var(--border-subtle);
}

.brand-header__brand {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
  text-decoration: none;
}

.brand-header__wordmark {
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 0.24em;
}

.brand-header__context {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.08em;
}

.brand-header__status-dot {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
  background: var(--color-due);
}
</style>
