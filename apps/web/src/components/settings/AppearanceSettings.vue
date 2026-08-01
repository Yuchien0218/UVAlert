<script setup lang="ts">
import { Monitor, Moon, Sun } from "@lucide/vue";
import type {
  AppearancePreference,
  ResolvedAppearance
} from "../../app/createAppearanceController";

withDefaults(defineProps<{
  resolvedAppearance: ResolvedAppearance;
  isSamsungInternetBrowser?: boolean;
}>(), {
  isSamsungInternetBrowser: false
});

const selectedPreference = defineModel<AppearancePreference>({
  required: true
});

const appearanceOptions = [
  {
    value: "light",
    label: "淺色",
    description: "固定使用明亮背景與深色文字。",
    icon: Sun
  },
  {
    value: "dark",
    label: "深色",
    description: "固定使用低亮度的深色背景。",
    icon: Moon
  },
  {
    value: "system",
    label: "跟隨系統",
    description: "依照裝置的外觀設定自動切換。",
    icon: Monitor
  }
] as const;
</script>

<template>
  <section class="appearance-settings app-card">
    <div class="appearance-settings__heading">
      <div>
        <h2 class="appearance-settings__title">外觀設定</h2>
      </div>
      <span class="appearance-settings__current">
        目前：{{ resolvedAppearance === "dark" ? "深色" : "淺色" }}
      </span>
    </div>

    <fieldset class="appearance-settings__options">
      <legend class="screen-reader-only">選擇外觀模式</legend>

      <label
        v-for="option in appearanceOptions"
        :key="option.value"
        class="appearance-option"
        :class="{
          'appearance-option--selected':
            selectedPreference === option.value
        }"
      >
        <input
          v-model="selectedPreference"
          class="appearance-option__input"
          type="radio"
          name="appearance"
          :value="option.value"
        >
        <component
          :is="option.icon"
          class="appearance-option__icon"
          :size="22"
          :stroke-width="1.6"
          aria-hidden="true"
        />
        <span class="appearance-option__content">
          <strong>{{ option.label }}</strong>
          <small>{{ option.description }}</small>
        </span>
        <span
          class="appearance-option__indicator"
          aria-hidden="true"
        />
      </label>
    </fieldset>

    <p
      v-if="isSamsungInternetBrowser && selectedPreference === 'light'"
      class="appearance-settings__browser-note"
      role="status"
    >
      Samsung Internet 可能優先套用網頁深色模式。若畫面仍是深色，請至瀏覽器「設定 → 網頁檢視與捲動 → 深色模式」改為淺色。
    </p>
  </section>
</template>

<style scoped>
.appearance-settings {
  display: grid;
  gap: var(--space-5);
  padding: clamp(1.25rem, 5vw, 2rem);
}

.appearance-settings__heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: var(--space-4);
}

.appearance-settings__title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 500;
}

.appearance-settings__current {
  color: var(--text-secondary);
  font-size: 0.875rem;
  white-space: nowrap;
}

.appearance-settings__options {
  display: grid;
  gap: var(--space-3);
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.appearance-option {
  position: relative;
  display: grid;
  min-height: 4.75rem;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--page-background);
  cursor: pointer;
  transition:
    border-color var(--duration-fast) var(--ease-out),
    background-color var(--duration-fast) var(--ease-out);
}

.appearance-option:hover {
  border-color: var(--text-secondary);
}

.appearance-option--selected {
  border-color: var(--text-primary);
  background: var(--surface-primary);
}

.appearance-option__input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.appearance-option:has(.appearance-option__input:focus-visible) {
  outline: 0.15rem solid var(--focus-ring);
  outline-offset: 0.2rem;
}

.appearance-option__icon {
  color: var(--text-secondary);
}

.appearance-option--selected .appearance-option__icon {
  color: var(--text-primary);
}

.appearance-option__content {
  display: grid;
  gap: var(--space-1);
}

.appearance-option__content strong {
  font-weight: 500;
}

.appearance-option__content small {
  color: var(--text-secondary);
  line-height: 1.7;
}

.appearance-option__indicator {
  width: 1rem;
  height: 1rem;
  border: 1px solid var(--text-secondary);
  border-radius: 50%;
}

.appearance-option--selected .appearance-option__indicator {
  border: 0.3rem solid var(--text-primary);
}

.appearance-settings__browser-note {
  margin: 0;
  padding-left: var(--space-4);
  border-left: 0.2rem solid var(--text-secondary);
  color: var(--text-secondary);
  font-size: 0.875rem;
  line-height: 1.7;
}

@media (max-width: 31rem) {
  .appearance-settings__heading {
    align-items: start;
    flex-direction: column;
  }
}
</style>
