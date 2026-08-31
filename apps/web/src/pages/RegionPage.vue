<script setup lang="ts">
import { onMounted, shallowRef } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useWebAppServices } from "../app/injection";
import RegionLocationPanel from "../components/region/RegionLocationPanel.vue";
import RegionManualSelector from "../components/region/RegionManualSelector.vue";
import RegionPreferenceSummary from "../components/region/RegionPreferenceSummary.vue";

/**
 * 手動選擇預設收起來（2026-08-31 使用者裁決）。
 *
 * 「使用目前位置」是主要路徑；手動選擇是它失敗或被拒絕時的備援，不需要
 * 一開始就把兩個下拉攤在畫面上（那一段實測 377px）。
 */
const showManualSelector = shallowRef(false);

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
      <h1 class="page-heading__title" data-typography-role="page-title">
        地區設定
      </h1>
      <p class="page-heading__body">
        地區設定只用來顯示 UV 資訊；不會延長或縮短你的本機補擦提醒。
      </p>
    </header>

    <RegionPreferenceSummary :preference="region.preference.value" />

    <RegionLocationPanel
      :phase="region.phase.value"
      :error="region.error.value"
      :candidate="region.candidate.value"
      :approximate-accuracy-meters="region.approximateAccuracyMeters.value"
      @locate="region.useCurrentPosition"
      @confirm="confirmCandidate"
    />

    <!--
      2026-08-31 收斂（使用者裁決）。這一頁原本把三條**互斥**的路平鋪成
      三張等重的區塊——實測 1428px，而多數人只會走其中一條，卻要先讀完
      三張才知道要走哪條。

      「使用目前位置」常駐（主要路徑），另外兩條收成文字連結。

      **「暫不提供地區」那句說明不能一起收掉**：它告訴使用者略過之後補擦
      提醒仍然正常，那正是讓略過變成安全選擇的理由，也是 Sitemap §一
      「定位不足時仍不得阻擋本機倒數與手動操作」在畫面上的體現。原本是
      標題＋整段說明，這裡壓成一行留在連結下方。
    -->
    <div class="region-alternatives">
      <button
        v-if="!showManualSelector"
        class="text-link"
        type="button"
        @click="showManualSelector = true"
      >
        改為手動選擇地區
      </button>

      <button
        data-testid="skip-region"
        class="text-link"
        type="button"
        :disabled="region.phase.value === 'saving'"
        @click="skipRegion"
      >
        暫不提供地區
      </button>
    </div>

    <p class="region-alternatives__note">
      略過後提醒頁暫不顯示紫外線指數，但補擦提醒仍可正常使用；之後可以隨時回來設定。
    </p>

    <RegionManualSelector
      v-if="showManualSelector"
      :directory="region.directory"
      :phase="region.phase.value"
      @save="saveManualRegion"
    />
  </div>
</template>

<style scoped>
.region-page {
  padding-bottom: var(--space-6);
}

.page-heading__eyebrow,
/*
 * 兩條備援路徑並排成文字連結。它們是「主要路徑走不通時的出口」，不是
 * 三選一的等重選項——所以不做成卡片，只用一條 hairline 跟上面分開。
 */
.region-alternatives {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  padding-top: var(--space-5);
  border-top: 1px solid var(--border-subtle);
}

.region-alternatives .text-link {
  min-height: var(--tap-target);
  padding-inline: var(--space-2);
  text-decoration: underline;
  text-underline-offset: 0.2rem;
}

.region-alternatives__note {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-supporting);
  line-height: var(--line-height-body);
}
</style>
