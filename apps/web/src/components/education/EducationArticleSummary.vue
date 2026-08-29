<script setup lang="ts">
defineProps<{ html: string }>();
</script>

<template>
  <section class="education-summary" aria-label="文章摘要">
    <span class="education-summary__wave" aria-hidden="true" />
    <div class="education-summary__content" v-html="html" />
  </section>
</template>

<style scoped>
.education-summary {
  display: grid;
  gap: var(--space-4);
  max-width: 44rem;
  padding: var(--space-5);
  border-radius: var(--radius-md);
  background: var(--color-surface-cream-strong);
}

.education-summary__wave {
  width: 4.5rem;
  height: 0.4rem;
  background-color: var(--text-secondary);
  opacity: 0.35;
  mask-image: var(--mask-wave-divider);
  mask-position: center;
  mask-repeat: no-repeat;
  mask-size: 100% 100%;
}

.education-summary__content :deep(p) {
  margin: 0;
  color: var(--text-body);
  font-size: var(--font-size-body);
  line-height: 1.7;
}
</style>
