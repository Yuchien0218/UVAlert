<script setup lang="ts">
import type { SessionContext } from "@sunshield/contracts";
import { shallowRef, watch } from "vue";
import Icon from "../icons/Icon.vue";

const selectedContext = defineModel<SessionContext | null>({
  required: true
});

const outdoorOptions = [
  {
    value: "outdoor_general",
    label: "一般戶外",
    description: "通勤、散步或一般外出。",
    icon: "context-outdoor"
  },
  {
    value: "outdoor_exercise",
    label: "戶外運動",
    description: "跑步、騎車或其他較大量活動。",
    icon: "context-exercise"
  }
] as const;

const indoorOptions = [
  {
    value: "indoor_window",
    label: "近直射窗邊",
    description: "主要在有直射光線的窗邊活動。"
  },
  {
    value: "indoor_away",
    label: "遠離直射光",
    description: "主要待在室內，沒有靠近直射窗邊。"
  }
] as const;

const waterOptions = [
  {
    value: "water_preparing",
    label: "準備下水",
    description: "不會提前開始耐水時間。"
  },
  {
    value: "water_active",
    label: "已在水中",
    description: "稍後需要確認實際入水時間；不確定也能繼續。"
  }
] as const;

const indoorExpanded = shallowRef(false);
const waterExpanded = shallowRef(false);

watch(
  selectedContext,
  (context) => {
    if (context === "indoor_window" || context === "indoor_away") {
      indoorExpanded.value = true;
    }
    if (context === "water_preparing" || context === "water_active") {
      waterExpanded.value = true;
    }
  },
  { immediate: true }
);
</script>

<template>
  <fieldset class="context-selector">
    <legend class="screen-reader-only">選擇目前情境</legend>

    <label
      v-for="option in outdoorOptions"
      :key="option.value"
      class="context-choice"
      :class="{ 'option-selected': selectedContext === option.value }"
    >
      <input
        v-model="selectedContext"
        class="context-choice__input"
        type="radio"
        name="setup-context"
        :value="option.value"
      >
      <Icon :name="option.icon" :size="24" />
      <span>
        <strong>{{ option.label }}</strong>
        <small>{{ option.description }}</small>
      </span>
    </label>

    <div class="context-group">
      <button
        class="context-group__toggle"
        type="button"
        :aria-expanded="indoorExpanded"
        aria-controls="indoor-context-options"
        @click="indoorExpanded = !indoorExpanded"
      >
        <Icon name="context-indoor" :size="24" />
        <div>
          <strong>室內活動</strong>
          <small>近直射窗邊／遠離直射光</small>
        </div>
        <Icon
          name="tool-chevron-down"
          class="context-group__chevron"
          :class="{ 'context-group__chevron--expanded': indoorExpanded }"
          :size="20"
        />
      </button>

      <div
        v-show="indoorExpanded"
        id="indoor-context-options"
        class="context-group__options"
      >
        <label
          v-for="option in indoorOptions"
          :key="option.value"
          class="context-group__option"
          :class="{ 'option-selected': selectedContext === option.value }"
        >
          <input
            v-model="selectedContext"
            type="radio"
            name="setup-context"
            :value="option.value"
          >
          <span>
            <strong>{{ option.label }}</strong>
            <small>{{ option.description }}</small>
          </span>
        </label>
      </div>
    </div>

    <div class="context-group">
      <button
        class="context-group__toggle"
        type="button"
        :aria-expanded="waterExpanded"
        aria-controls="water-context-options"
        @click="waterExpanded = !waterExpanded"
      >
        <Icon name="context-water" :size="24" />
        <div>
          <strong>水上活動</strong>
          <small>準備下水／已在水中</small>
        </div>
        <Icon
          name="tool-chevron-down"
          class="context-group__chevron"
          :class="{ 'context-group__chevron--expanded': waterExpanded }"
          :size="20"
        />
      </button>

      <div
        v-show="waterExpanded"
        id="water-context-options"
        class="context-group__options"
      >
        <label
          v-for="option in waterOptions"
          :key="option.value"
          class="context-group__option"
          :class="{ 'option-selected': selectedContext === option.value }"
        >
          <input
            v-model="selectedContext"
            type="radio"
            name="setup-context"
            :value="option.value"
          >
          <span>
            <strong>{{ option.label }}</strong>
            <small>{{ option.description }}</small>
          </span>
        </label>
      </div>
    </div>
  </fieldset>
</template>

<style scoped>
.context-selector {
  display: grid;
  gap: var(--space-3);
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.context-choice,
.context-group {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  background: var(--surface-primary);
}

.context-choice {
  position: relative;
  display: grid;
  min-height: 5.5rem;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-5);
  cursor: pointer;
}

.context-choice__input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.context-choice:has(.context-choice__input:focus-visible),
.context-group__option:has(input:focus-visible),
.context-group__toggle:focus-visible {
  outline: 0.15rem solid var(--focus-ring);
  outline-offset: 0.2rem;
}

.context-choice strong,
.context-choice small,
.context-group strong,
.context-group small {
  display: block;
}

.context-choice strong,
.context-group strong {
  font-weight: 500;
}

.context-choice small,
.context-group small {
  margin-top: var(--space-1);
  color: var(--text-secondary);
  line-height: 1.7;
}

.context-group {
  display: grid;
  gap: var(--space-3);
  overflow: hidden;
}

.context-group__toggle {
  display: grid;
  width: 100%;
  min-height: 5.5rem;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-5);
  border: 0;
  background: transparent;
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
}

.context-group__chevron {
  transition: transform var(--duration-fast) var(--ease-out);
}

.context-group__chevron--expanded {
  transform: rotate(180deg);
}

.context-group__options {
  display: grid;
  gap: var(--space-3);
  padding: 0 var(--space-5) var(--space-5);
}

.context-group__option {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  cursor: pointer;
}

.context-group__option input {
  margin: 0;
  accent-color: var(--text-primary);
}
</style>
