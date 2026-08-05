<script setup lang="ts">
import { MapPin, Wind } from "@lucide/vue";

interface Props {
  regionName: string | null;
}

defineProps<Props>();
</script>

<template>
  <section id="outdoor-context" class="context-card" aria-labelledby="context-title">
    <div class="context-card__heading">
      <div>
        <h2 id="context-title" class="context-card__title">
          戶外資訊
        </h2>
      </div>
      <Wind :size="25" :stroke-width="1.5" aria-hidden="true" />
    </div>
    <div class="context-card__row">
      <MapPin :size="18" :stroke-width="1.7" aria-hidden="true" />
      <span>
        <strong>
          {{
            regionName === null
              ? "目前未設定地區"
              : `目前地區・${regionName}`
          }}
        </strong>
        <small>
          {{
            regionName === null
              ? "不影響已保存的本機提醒"
              : "五日 UV 採用此地區的區域預報"
          }}
        </small>
      </span>
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
  padding-block: var(--space-5);
  border-block: 1px solid var(--border-subtle);
}

.context-card__heading {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: var(--space-4);
}

.context-card__title {
  margin: 0;
  font-size: var(--font-size-page-title);
  font-weight: 500;
}

.context-card__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
}

.context-card__cta {
  margin-left: auto;
  min-height: 2.25rem;
  padding: var(--space-2) var(--space-4);
  white-space: nowrap;
}

.context-card__row span,
.context-card__row small {
  display: block;
}

.context-card__row strong {
  font-weight: 500;
}

.context-card__row small {
  margin-top: var(--space-1);
  color: var(--text-secondary);
}
</style>
