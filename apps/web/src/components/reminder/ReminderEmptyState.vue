<script setup lang="ts">
import { ArrowRight, Clock3 } from "@lucide/vue";
</script>

<template>
  <section class="empty-state app-card" data-testid="reminder-empty">
    <div class="empty-state__icon" aria-hidden="true">
      <Clock3 :size="30" :stroke-width="1.6" />
    </div>
    <div>
      <h2 class="empty-state__title">
        目前沒有進行中的防曬提醒
      </h2>
      <p class="empty-state__body">
        建立提醒後，可以查看各部位狀態並回報洗手、游泳、流汗或擦拭等情況。
      </p>
    </div>
    <RouterLink class="button button--primary" to="/setup">
      開始防曬提醒
      <ArrowRight :size="18" aria-hidden="true" />
    </RouterLink>
  </section>
</template>

<style scoped>
.empty-state {
  display: grid;
  justify-items: start;
  gap: var(--space-6);
  padding: clamp(1.5rem, 6vw, 2.5rem);
}

.empty-state__icon {
  display: grid;
  width: 4rem;
  height: 4rem;
  place-content: center;
  border: 1px solid var(--border-subtle);
  border-radius: 50%;
}

.empty-state__title {
  max-width: 16ch;
  margin: 0;
  font-size: clamp(1.75rem, 7vw, 2.75rem);
  font-weight: 500;
  line-height: 1.12;
  letter-spacing: -0.04em;
}

.empty-state__body {
  max-width: 36rem;
  margin: var(--space-4) 0 0;
  color: var(--text-secondary);
  line-height: 1.7;
}
</style>
