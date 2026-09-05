<script setup lang="ts">
import { computed, nextTick, shallowRef, useTemplateRef } from "vue";
import type { RegionPhase } from "../../features/region/createRegionController";
import type { RegionDirectoryEntry } from "../../features/region/TaiwanRegionResolver";
import InlineLoader from "../feedback/InlineLoader.vue";

interface Props {
  directory: readonly RegionDirectoryEntry[];
  phase: RegionPhase;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  save: [regionCode: string];
}>();

const selectedCountyCode = shallowRef("");
const selectedRegionCode = shallowRef("");
const fieldError = shallowRef<"county" | "town" | null>(null);
const countySelect = useTemplateRef<HTMLSelectElement>("countySelect");
const townSelect = useTemplateRef<HTMLSelectElement>("townSelect");

const counties = computed(() => {
  const values = new Map<string, string>();
  for (const entry of props.directory) {
    values.set(entry.countyCode, entry.countyName);
  }
  return [...values]
    .map(([countyCode, countyName]) => ({ countyCode, countyName }))
    .sort((left, right) =>
      left.countyName.localeCompare(right.countyName, "zh-TW")
    );
});

const towns = computed(() => {
  return props.directory.filter(
    (entry) => entry.countyCode === selectedCountyCode.value
  );
});

function handleCountyChange(): void {
  selectedRegionCode.value = "";
  fieldError.value = null;
}

function handleTownChange(): void {
  fieldError.value = null;
}

async function save(): Promise<void> {
  if (selectedCountyCode.value === "") {
    fieldError.value = "county";
    await nextTick();
    countySelect.value?.focus();
    return;
  }

  if (selectedRegionCode.value === "") {
    fieldError.value = "town";
    await nextTick();
    townSelect.value?.focus();
    return;
  }

  fieldError.value = null;
  emit("save", selectedRegionCode.value);
}
</script>

<template>
  <section class="manual-region" aria-labelledby="manual-region-title">
    <header>
      <h2 id="manual-region-title" data-typography-role="section-title">
        手動選擇地區
      </h2>
      <p>行政區清單已儲存在這台裝置，離線時也能選擇。</p>
    </header>

    <div class="manual-region__field">
      <label for="region-county">縣市</label>
      <select
        ref="countySelect"
        id="region-county"
        v-model="selectedCountyCode"
        :aria-invalid="fieldError === 'county' ? 'true' : undefined"
        :aria-describedby="
          fieldError === 'county' ? 'region-county-error' : undefined
        "
        @change="handleCountyChange"
      >
        <option value="">請選擇縣市</option>
        <option
          v-for="county in counties"
          :key="county.countyCode"
          :value="county.countyCode"
        >
          {{ county.countyName }}
        </option>
      </select>
      <p
        v-if="fieldError === 'county'"
        id="region-county-error"
        class="manual-region__error"
        role="alert"
      >
        請先選擇縣市
      </p>
    </div>

    <div class="manual-region__field">
      <label for="region-town">鄉鎮市區</label>
      <select
        ref="townSelect"
        id="region-town"
        v-model="selectedRegionCode"
        :disabled="selectedCountyCode === ''"
        :aria-invalid="fieldError === 'town' ? 'true' : undefined"
        :aria-describedby="
          fieldError === 'town' ? 'region-town-error' : undefined
        "
        @change="handleTownChange"
      >
        <option value="">
          {{ selectedCountyCode === "" ? "請先選擇縣市" : "請選擇鄉鎮市區" }}
        </option>
        <option
          v-for="town in towns"
          :key="town.regionCode"
          :value="town.regionCode"
        >
          {{ town.townName }}
        </option>
      </select>
      <p
        v-if="fieldError === 'town'"
        id="region-town-error"
        class="manual-region__error"
        role="alert"
      >
        請選擇鄉鎮市區
      </p>
    </div>

    <button
      data-testid="save-manual-region"
      class="button button--primary"
      type="button"
      :disabled="phase === 'saving'"
      @click="save"
    >
      <InlineLoader v-if="phase === 'saving'" />
      {{ phase === "saving" ? "正在儲存…" : "儲存這個地區" }}
    </button>
  </section>
</template>

<style scoped>
.manual-region {
  display: grid;
  gap: var(--space-4);
  padding-block: var(--space-5);
  border-top: 1px solid var(--border-subtle);
}

.manual-region h2,
.manual-region p {
  margin: 0;
}

.manual-region .manual-region__error {
  margin: 0;
  color: var(--color-due);
  font-size: var(--font-size-body);
}

.manual-region h2 {
  font-size: var(--font-size-section-title);
}

.manual-region p {
  margin-top: var(--space-2);
  color: var(--text-body);
  line-height: var(--line-height-body);
}

.manual-region__field {
  display: grid;
  gap: var(--space-2);
}

.manual-region__field label {
  font-weight: 500;
}

/* 只留寬度，其餘欄位外觀用 app.css 的共用宣告。 */
.manual-region__field select,
.manual-region__field input {
  width: 100%;
}

.manual-region__field select[aria-invalid="true"] {
  border: 2px solid var(--color-due);
}
</style>
