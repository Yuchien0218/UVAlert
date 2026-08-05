<script setup lang="ts">
import { MapPin, Wind } from "@lucide/vue";

interface Props {
  regionName: string | null;
}

defineProps<Props>();
</script>

<template>
  <section id="outdoor-context" class="context-card app-card" aria-labelledby="context-title">
    <div class="context-card__heading">
      <div>
        <h2 id="context-title" class="context-card__title">
          戶外資訊
        </h2>
      </div>
      <Wind :size="25" :stroke-width="1.5" aria-hidden="true" />
    </div>
    <div class="context-card__row">
      <MapPin :size="20" :stroke-width="1.6" aria-hidden="true" class="context-card__icon" />
      <div class="context-card__content">
        <strong class="context-card__label">
          {{
            regionName === null
              ? "目前未設定地區"
              : `目前地區・${regionName}`
          }}
        </strong>
        <p class="context-card__description">
          {{
            regionName === null
              ? "不影響已保存的本機提醒"
              : "五日 UV 採用此地區的區域預報"
          }}
        </p>
      </div>
      <RouterLink
        class="button button--quiet context-card__cta"
        to="/region"
      >
        {{ regionName === null ? "設定地區" : "變更地區" }}
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
.context-card {
  display: grid;
  gap: var(--space-5);
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-subtle);
  background: var(--surface-primary);
  transition: all var(--duration-fast) var(--ease-out);
}

.context-card:hover {
  border-color: var(--text-secondary);
}

.context-card__heading {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: var(--space-4);
}

.context-card__title {
  margin: 0;
  font-size: var(--font-size-section-title);
  font-weight: 600;
}

.context-card__row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
}

.context-card__icon {
  flex-shrink: 0;
  margin-top: 0.125rem;
  color: var(--text-secondary);
}

.context-card__content {
  flex: 1;
  min-width: 0;
}

.context-card__label {
  display: block;
  margin: 0;
  font-weight: 500;
  font-size: var(--font-size-body);
}

.context-card__description {
  display: block;
  margin: var(--space-2) 0 0;
  color: var(--text-secondary);
  font-size: var(--font-size-body);
  line-height: 1.6;
}

.context-card__cta {
  flex-shrink: 0;
  min-height: 2.5rem;
  padding: var(--space-2) var(--space-4);
  white-space: nowrap;
}
</style>
