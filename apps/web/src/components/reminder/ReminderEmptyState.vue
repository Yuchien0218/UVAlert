<script setup lang="ts">
import { ArrowRight, CheckCircle2 } from "@lucide/vue";
</script>

<template>
  <section
    class="empty-state empty-state--tracking"
    data-testid="reminder-empty"
  >
    <div class="empty-state__icon" aria-hidden="true">
      <CheckCircle2 :size="27" :stroke-width="1.6" />
    </div>
    <div>
      <h2 class="empty-state__title empty-state__title--single-line">
        尚未建立提醒
      </h2>
      <p class="empty-state__body">
        建立提醒以追蹤各部位狀態與補擦時機。
      </p>
    </div>
    <RouterLink
      class="button button--primary empty-state__action empty-state__action--end empty-state__action--compact"
      to="/setup"
    >
      新增提醒
      <ArrowRight :size="18" aria-hidden="true" />
    </RouterLink>
  </section>
</template>

<style scoped>
.empty-state {
  display: grid;
  justify-items: start;
  gap: var(--space-5);
  padding: clamp(1.5rem, 7vw, 2.5rem) clamp(1.25rem, 5vw, 2rem);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.empty-state--tracking {
  background: var(--color-tracking-soft);
}

.empty-state__icon {
  display: grid;
  width: 3.25rem;
  height: 3.25rem;
  place-content: center;
  border-radius: 50%;
  background: var(--surface-primary);
  color: var(--color-tracking);
}

.empty-state__title {
  margin: 0;
  font-size: clamp(1.75rem, 7vw, 2.75rem);
  font-weight: 500;
  line-height: 1.12;
  letter-spacing: -0.04em;
}

.empty-state__title--single-line {
  white-space: nowrap;
}

.empty-state__body {
  max-width: 36rem;
  margin: var(--space-4) 0 0;
  color: var(--text-secondary);
  line-height: 1.7;
}

.empty-state__action--end {
  justify-self: end;
}

.empty-state__action--compact {
  width: fit-content;
  max-width: 100%;
}
</style>
