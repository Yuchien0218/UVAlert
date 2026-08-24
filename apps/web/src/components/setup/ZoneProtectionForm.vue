<script setup lang="ts">
import { Sparkles } from "@lucide/vue";
import type {
  SessionContext,
  SetupDraftV1,
  SetupDraftZoneV1
} from "@sunshield/contracts";
import { shallowRef } from "vue";
import type { ProtectionDraftInput } from "../../features/setup/createSetupController";
import {
  BODY_ZONE_GROUPS,
  SETUP_PRESET_VERSION,
  getBodyZoneGroup,
  groupForBodyZone,
  recommendedPresetFor,
  type BodyZoneGroupId
} from "../../features/setup/setupCatalog";

/**
 * 只選追蹤部位，不問防護方式。
 *
 * 2026-08-07 裁決：本 App 聚焦「擦防曬乳的補擦倒數」，逐部位詢問防護方式
 * （已擦防曬／衣物覆蓋）過於瑣碎。追蹤中的部位一律視為外露且已擦防曬，
 * 被衣物遮住的部位由使用者選擇不追蹤即可。
 *
 * Session 進行中臨時被遮住時不提供暫停：倒數照跑，誤差落在「提醒過頭」
 * 而非「該提醒沒提醒」。
 */

interface Props {
  context: SessionContext;
  initialZones: SetupDraftZoneV1[];
  initialEntryMode: SetupDraftV1["setupEntryMode"];
  initialSuggestedPresetId: string | null;
  initialSuggestedPresetVersion: string | null;
  initialPresetDecision: SetupDraftV1["presetDecision"];
  submitLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  submitLabel: "下一步"
});
const emit = defineEmits<{
  submit: [input: ProtectionDraftInput];
}>();

const preset = recommendedPresetFor(props.context);
const initialGroupIds = [
  ...new Set(
    props.initialZones
      .map((zone) => groupForBodyZone(zone.bodyZoneCode)?.id)
      .filter((value): value is BodyZoneGroupId => value !== undefined)
  )
];
const selectedGroupIds = shallowRef<BodyZoneGroupId[]>(
  initialGroupIds
);
const editing = shallowRef(props.initialZones.length > 0);
const setupEntryMode = shallowRef(props.initialEntryMode);
const suggestedPresetId = shallowRef(
  props.initialSuggestedPresetId
);
const suggestedPresetVersion = shallowRef(
  props.initialSuggestedPresetVersion
);
const presetDecision = shallowRef(props.initialPresetDecision);
const includeCustom = shallowRef(
  props.initialZones.some((zone) => zone.bodyZoneCode === "custom")
);
const customLabel = shallowRef(
  props.initialZones.find((zone) => zone.bodyZoneCode === "custom")
    ?.customLabel ?? ""
);
const formError = shallowRef<string | null>(null);

function startWithPreset(decision: "accepted" | "adjusted"): void {
  selectedGroupIds.value = [...preset.groupIds];
  editing.value = true;
  setupEntryMode.value = "quick_preset";
  suggestedPresetId.value = preset.id;
  suggestedPresetVersion.value = SETUP_PRESET_VERSION;
  presetDecision.value = decision;
  formError.value = null;
}

function startSelfSelection(): void {
  selectedGroupIds.value = [];
  editing.value = true;
  setupEntryMode.value = "self_select";
  suggestedPresetId.value = null;
  suggestedPresetVersion.value = null;
  presetDecision.value = "not_shown";
  formError.value = null;
}

function toggleGroup(
  groupId: BodyZoneGroupId,
  checked: boolean
): void {
  selectedGroupIds.value = checked
    ? [...selectedGroupIds.value, groupId]
    : selectedGroupIds.value.filter((id) => id !== groupId);
  if (setupEntryMode.value === "quick_preset") {
    presetDecision.value = "adjusted";
  }
}

function submit(): void {
  if (selectedGroupIds.value.length === 0 && !includeCustom.value) {
    formError.value = "請至少選擇一個實際要追蹤的部位。";
    return;
  }
  if (includeCustom.value && customLabel.value.trim() === "") {
    formError.value = "請填寫其他部位名稱。";
    return;
  }

  const zones = selectedGroupIds.value.flatMap((groupId) =>
    getBodyZoneGroup(groupId).zoneCodes.map((bodyZoneCode) =>
      makeDraftZone(bodyZoneCode, bodyZoneCode, null)
    )
  );
  if (includeCustom.value) {
    zones.push(
      makeDraftZone(
        "custom-primary",
        "custom",
        customLabel.value.trim()
      )
    );
  }

  formError.value = null;
  emit("submit", {
    zones,
    setupEntryMode: setupEntryMode.value,
    suggestedPresetId: suggestedPresetId.value,
    suggestedPresetVersion: suggestedPresetVersion.value,
    presetDecision: presetDecision.value
  });
}

/** 追蹤中的部位一律為外露且已擦防曬。 */
function makeDraftZone(
  draftZoneKey: string,
  bodyZoneCode: SetupDraftZoneV1["bodyZoneCode"],
  customLabelValue: string | null
): SetupDraftZoneV1 {
  return {
    draftZoneKey,
    bodyZoneCode,
    customLabel: customLabelValue,
    skinExposureStatus: "exposed",
    methodComponents: ["sunscreen"]
  };
}
</script>

<template>
  <div class="zone-form">
    <section v-if="!editing" class="preset-card app-card">
      <div class="preset-card__mark">
        <Sparkles :size="24" aria-hidden="true" />
      </div>
      <div>
        <p class="preset-card__eyebrow">快速提醒（推薦）</p>
        <h2 class="preset-card__title">{{ preset.label }}</h2>
        <p class="preset-card__body">{{ preset.summary }}</p>
        <p class="preset-card__note">
          這只是建議組合；確認前不會建立任何提醒資料。
        </p>
      </div>
      <div class="button-group preset-card__actions">
        <button
          class="button button--primary"
          type="button"
          @click="startWithPreset('accepted')"
        >
          使用這組
        </button>
        <button
          class="button button--quiet"
          type="button"
          @click="startWithPreset('adjusted')"
        >
          調整部位
        </button>
      </div>
      <button
        class="text-link preset-card__self-select"
        type="button"
        @click="startSelfSelection"
      >
        自己選擇部位
      </button>
    </section>

    <template v-else>
      <section class="zone-groups app-card">
        <div class="zone-groups__heading">
          <h2>追蹤哪些部位？</h2>
          <p>
            選中的部位會開始補擦倒數。被衣物遮住、不需要提醒的部位不用選。
          </p>
        </div>

        <div class="zone-groups__list">
          <label
            v-for="group in BODY_ZONE_GROUPS"
            :key="group.id"
            class="zone-group-choice"
          >
            <input
              type="checkbox"
              :checked="selectedGroupIds.includes(group.id)"
              @change="
                toggleGroup(
                  group.id,
                  ($event.target as HTMLInputElement).checked
                )
              "
            >
            <span>
              <strong>{{ group.label }}</strong>
              <small>{{ group.description }}</small>
            </span>
          </label>

          <label class="zone-group-choice">
            <input v-model="includeCustom" type="checkbox">
            <span>
              <strong>其他部位</strong>
              <small>自訂文字只儲存在這次提醒中。</small>
            </span>
          </label>
          <label v-if="includeCustom" class="field">
            <span>其他部位名稱</span>
            <input
              v-model.trim="customLabel"
              type="text"
              maxlength="80"
              autocomplete="off"
            >
          </label>
        </div>
      </section>

      <p v-if="formError" class="form-error" role="alert">
        {{ formError }}
      </p>

      <button
        class="button button--primary"
        type="button"
        @click="submit"
      >
        {{ submitLabel }}
      </button>
    </template>
  </div>
</template>

<style scoped>
.zone-form {
  display: grid;
  gap: var(--space-5);
}

.preset-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--space-5);
  padding: clamp(1.25rem, 5vw, 2rem);
}

.preset-card__mark {
  display: grid;
  width: 3.25rem;
  height: 3.25rem;
  place-content: center;
  border-radius: 50%;
  background: var(--color-soon-soft);
  color: var(--color-soon);
}

.preset-card__eyebrow {
  margin: 0 0 var(--space-2);
  color: var(--text-secondary);
  font-size: var(--font-size-label);
  font-weight: 500;
}

.preset-card__title {
  margin: 0;
  font-size: 1.5rem;
}

.preset-card__body,
.preset-card__note {
  margin: var(--space-3) 0 0;
  color: var(--text-secondary);
  line-height: 1.7;
}

.preset-card__note {
  font-size: var(--font-size-body);
}

.preset-card__actions,
.preset-card__self-select {
  grid-column: 1 / -1;
}

button.text-link {
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  text-decoration: underline;
}

.zone-groups {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-5);
}

.zone-groups__heading h2 {
  margin: 0;
  font-size: var(--font-size-section-title);
}

.zone-groups__heading p {
  margin: var(--space-2) 0 0;
  color: var(--text-secondary);
  line-height: 1.7;
  font-size: var(--font-size-body);
}

.zone-groups__list {
  display: grid;
}

.zone-group-choice {
  display: grid;
  min-height: 4.25rem;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: var(--space-3);
  border-bottom: 1px solid var(--border-subtle);
  cursor: pointer;
}

.zone-group-choice input {
  width: 1.1rem;
  height: 1.1rem;
  accent-color: var(--text-primary);
}

.zone-group-choice strong,
.zone-group-choice small {
  display: block;
}

.zone-group-choice strong {
  font-weight: 500;
}

.zone-group-choice small {
  margin-top: var(--space-1);
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
}

.field {
  display: grid;
  gap: var(--space-2);
  padding-top: var(--space-4);
}

.field span {
  color: var(--text-secondary);
  font-size: var(--font-size-body);
}

.field input {
  min-height: var(--tap-target);
  padding: var(--space-3);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: var(--page-background);
  color: var(--text-primary);
}

.form-error {
  margin: 0;
  color: var(--color-due);
  line-height: 1.7;
}
</style>
