<script setup lang="ts">
import { computed } from "vue";
import type { NationwideUvCounty } from "@sunshield/contracts";
import { groupNationwideCounties } from "../../features/uv/uvDistributionPresentation";
import UvCountyListItem from "./UvCountyListItem.vue";

const props = defineProps<{ counties: readonly NationwideUvCounty[] }>();
const groups = computed(() => groupNationwideCounties(props.counties));
</script>

<template>
  <ul class="uv-county-groups">
    <li v-for="group in groups" :key="group.id" class="uv-county-group">
      <h3 class="uv-county-group__title" data-typography-role="supporting">
        {{ group.label }}
      </h3>
      <ul class="uv-county-group__list">
        <UvCountyListItem
          v-for="county in group.counties"
          :key="county.countyCode"
          :county="county"
        />
      </ul>
    </li>
  </ul>
</template>

<style scoped>
.uv-county-groups,
.uv-county-group__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.uv-county-groups {
  display: grid;
  gap: var(--uv-distribution-group-gap);
}

.uv-county-group__title {
  margin: 0 0 var(--uv-distribution-row-gap);
  color: var(--color-ink);
  font-family: var(--font-family-supporting);
  font-size: var(--font-size-supporting);
  font-weight: var(--font-weight-supporting);
  line-height: var(--line-height-supporting);
  letter-spacing: var(--letter-spacing-supporting);
}

.uv-county-group__list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--uv-distribution-row-gap) var(--uv-distribution-column-gap);
}

@media (min-width: 30rem) {
  .uv-county-group__list { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
</style>
