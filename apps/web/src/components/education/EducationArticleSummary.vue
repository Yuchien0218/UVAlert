<script setup lang="ts">
defineProps<{ html: string }>();
</script>

<template>
  <section class="education-summary" aria-label="文章摘要">
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

.education-summary__content :deep(p) {
  margin: 0;
  color: var(--text-body);
  font-size: var(--font-size-body);
  line-height: 1.7;
}
</style>
