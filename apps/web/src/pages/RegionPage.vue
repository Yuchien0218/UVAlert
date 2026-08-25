<script setup lang="ts">
import { onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useWebAppServices } from "../app/injection";
import RegionLocationPanel from "../components/region/RegionLocationPanel.vue";
import RegionManualSelector from "../components/region/RegionManualSelector.vue";
import RegionPreferenceSummary from "../components/region/RegionPreferenceSummary.vue";

const { region } = useWebAppServices();
const route = useRoute();
const router = useRouter();

onMounted(() => {
  void region.ensureLoaded();
});

async function confirmCandidate(): Promise<void> {
  if (await region.confirmCandidate()) await returnToCaller();
}

async function saveManualRegion(regionCode: string): Promise<void> {
  if (await region.saveManualRegion(regionCode)) {
    await returnToCaller();
  }
}

async function skipRegion(): Promise<void> {
  if (await region.skipRegion()) await returnToCaller();
}

function returnToCaller(): Promise<unknown> {
  const destination = route.query.returnTo === "/more" ? "/more" : "/";
  return router.push(destination);
}
</script>

<template>
  <div class="page-stack region-page">
    <header class="page-heading">
      <p class="page-heading__eyebrow eyebrow--mono">地區／本機資料</p>
      <h1 class="page-heading__title">地區設定</h1>
      <p class="page-heading__body">
        地區設定只用來顯示 UV 資訊；不會延長或縮短你的本機補擦提醒。
      </p>
    </header>

    <RegionPreferenceSummary :preference="region.preference.value" />

    <RegionLocationPanel
      :phase="region.phase.value"
      :error="region.error.value"
      :candidate="region.candidate.value"
      :approximate-accuracy-meters="
        region.approximateAccuracyMeters.value
      "
      @locate="region.useCurrentPosition"
      @confirm="confirmCandidate"
    />

    <RegionManualSelector
      :directory="region.directory"
      :phase="region.phase.value"
      @save="saveManualRegion"
    />

    <section class="region-skip" aria-labelledby="region-skip-title">
      <h2 id="region-skip-title">暫時不需要地區資訊</h2>
      <p>
        略過後，提醒頁暫不顯示所在地紫外線指數，但補擦提醒仍可正常使用。之後可以隨時回來設定。
      </p>
      <button
        data-testid="skip-region"
        class="text-link region-skip__action"
        type="button"
        :disabled="region.phase.value === 'saving'"
        @click="skipRegion"
      >
        暫不提供地區
      </button>
    </section>
  </div>
</template>

<style scoped>
.region-page {
  padding-bottom: var(--space-6);
}

.page-heading__eyebrow,
.region-skip h2,
.region-skip p {
  margin: 0;
}

.region-skip {
  display: grid;
  justify-items: start;
  gap: var(--space-3);
  padding-top: var(--space-5);
  border-top: 1px solid var(--border-subtle);
}

.region-skip h2 {
  font-size: var(--font-size-title-sm);
}

.region-skip p {
  color: var(--text-body);
  line-height: 1.6;
}

.region-skip__action {
  min-height: 2.75rem;
  padding-inline: var(--space-2);
  text-decoration: underline;
  text-underline-offset: 0.2rem;
}
</style>
