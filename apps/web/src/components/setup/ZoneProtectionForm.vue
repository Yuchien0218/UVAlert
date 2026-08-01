<script setup lang="ts">
import { Check, ChevronDown, Sparkles } from "@lucide/vue";
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

type ProtectionMethodChoice =
  | "sunscreen"
  | "clothing"
  | "clothing_sunscreen"
  | "other_topical";

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
const methodByGroup = shallowRef<
  Partial<Record<BodyZoneGroupId, ProtectionMethodChoice | null>>
>(
  Object.fromEntries(
    initialGroupIds.map((groupId) => [
      groupId,
      methodForInitialGroup(groupId)
    ])
  )
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
const customMethod = shallowRef<ProtectionMethodChoice | null>(
  methodForZone(
    props.initialZones.find((zone) => zone.bodyZoneCode === "custom")
  )
);
const formError = shallowRef<string | null>(null);

function methodForInitialGroup(
  groupId: BodyZoneGroupId
): ProtectionMethodChoice | null {
  const group = getBodyZoneGroup(groupId);
  const choices = props.initialZones
    .filter((zone) => group.zoneCodes.includes(zone.bodyZoneCode))
    .map(methodForZone)
    .filter(
      (choice): choice is ProtectionMethodChoice => choice !== null
    );
  return new Set(choices).size === 1 ? (choices[0] ?? null) : null;
}

function methodForZone(
  zone: SetupDraftZoneV1 | undefined
): ProtectionMethodChoice | null {
  if (zone === undefined) return null;
  if (zone.skinExposureStatus === "clothing_covered") {
    return zone.methodComponents.includes("sunscreen")
      ? "clothing_sunscreen"
      : "clothing";
  }
  return zone.methodComponents.includes("sunscreen")
    ? "sunscreen"
    : zone.methodComponents.includes("other_topical")
      ? "other_topical"
      : null;
}

function startWithPreset(decision: "accepted" | "adjusted"): void {
  selectedGroupIds.value = [...preset.groupIds];
  methodByGroup.value = Object.fromEntries(
    preset.groupIds.map((groupId) => [groupId, null])
  );
  editing.value = true;
  setupEntryMode.value = "quick_preset";
  suggestedPresetId.value = preset.id;
  suggestedPresetVersion.value = SETUP_PRESET_VERSION;
  presetDecision.value = decision;
  formError.value = null;
}

function startSelfSelection(): void {
  selectedGroupIds.value = [];
  methodByGroup.value = {};
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
  if (!checked) {
    const nextMethods = { ...methodByGroup.value };
    delete nextMethods[groupId];
    methodByGroup.value = nextMethods;
  }
  if (setupEntryMode.value === "quick_preset") {
    presetDecision.value = "adjusted";
  }
}

function setMethod(
  groupId: BodyZoneGroupId,
  method: ProtectionMethodChoice
): void {
  methodByGroup.value = {
    ...methodByGroup.value,
    [groupId]: method
  };
}

function applyMethodToUnset(method: ProtectionMethodChoice): void {
  methodByGroup.value = {
    ...methodByGroup.value,
    ...Object.fromEntries(
      selectedGroupIds.value
        .filter((groupId) => methodByGroup.value[groupId] == null)
        .map((groupId) => [groupId, method])
    )
  };
}

function submit(): void {
  if (selectedGroupIds.value.length === 0 && !includeCustom.value) {
    formError.value = "請至少選擇一個實際要追蹤的部位。";
    return;
  }

  const incompleteGroup = selectedGroupIds.value.find(
    (groupId) => methodByGroup.value[groupId] == null
  );
  if (incompleteGroup !== undefined) {
    formError.value = `請確認「${getBodyZoneGroup(incompleteGroup).label}」目前採用的方式。`;
    return;
  }
  if (
    includeCustom.value &&
    (customLabel.value.trim() === "" || customMethod.value === null)
  ) {
    formError.value = "請填寫其他部位名稱並確認目前採用的方式。";
    return;
  }

  const zones = selectedGroupIds.value.flatMap((groupId) => {
    const group = getBodyZoneGroup(groupId);
    const method = methodByGroup.value[groupId]!;
    return group.zoneCodes.map((bodyZoneCode) =>
      makeDraftZone(bodyZoneCode, bodyZoneCode, null, method)
    );
  });
  if (includeCustom.value) {
    zones.push(
      makeDraftZone(
        "custom-primary",
        "custom",
        customLabel.value.trim(),
        customMethod.value!
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

function makeDraftZone(
  draftZoneKey: string,
  bodyZoneCode: SetupDraftZoneV1["bodyZoneCode"],
  customLabelValue: string | null,
  method: ProtectionMethodChoice
): SetupDraftZoneV1 {
  return {
    draftZoneKey,
    bodyZoneCode,
    customLabel: customLabelValue,
    skinExposureStatus:
      method === "clothing" || method === "clothing_sunscreen"
        ? "clothing_covered"
        : "exposed",
    methodComponents:
      method === "clothing"
        ? ["clothing"]
        : method === "clothing_sunscreen"
          ? ["clothing", "sunscreen"]
          : method === "other_topical"
            ? ["other_topical"]
            : ["sunscreen"]
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
      <details
        class="zone-groups app-card"
        :open="setupEntryMode === 'self_select'"
      >
        <summary>
          <span>
            <strong>調整追蹤部位</strong>
            <small>目前選擇 {{ selectedGroupIds.length }} 個大群組</small>
          </span>
          <ChevronDown :size="20" aria-hidden="true" />
        </summary>

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
              <small>自訂文字只保存在本機 Session。</small>
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
      </details>

      <section class="batch-method app-card">
        <div>
          <p class="batch-method__eyebrow">批次設定</p>
          <h2>先套用目前實際方式</h2>
          <p>
            只會填入尚未設定的部位，不會覆蓋你之後做的個別調整。
          </p>
        </div>
        <div class="button-group">
          <button
            class="button button--quiet"
            type="button"
            @click="applyMethodToUnset('sunscreen')"
          >
            全部已擦防曬
          </button>
          <button
            class="button button--quiet"
            type="button"
            @click="applyMethodToUnset('clothing')"
          >
            全部衣物覆蓋
          </button>
        </div>
      </section>

      <section class="method-list" aria-labelledby="method-heading">
        <div class="method-list__heading">
          <p>目前防護方式</p>
          <h2 id="method-heading">逐群組確認</h2>
        </div>

        <article
          v-for="groupId in selectedGroupIds"
          :key="groupId"
          class="method-card app-card"
        >
          <div class="method-card__title">
            <span
              v-if="methodByGroup[groupId]"
              class="method-card__complete"
            >
              <Check :size="16" aria-hidden="true" />
            </span>
            <div>
              <h3>{{ getBodyZoneGroup(groupId).label }}</h3>
              <p>{{ getBodyZoneGroup(groupId).description }}</p>
            </div>
          </div>
          <div class="method-card__options">
            <label>
              <input
                type="radio"
                :name="`method-${groupId}`"
                value="sunscreen"
                :checked="methodByGroup[groupId] === 'sunscreen'"
                @change="setMethod(groupId, 'sunscreen')"
              >
              已擦防曬產品
            </label>
            <label>
              <input
                type="radio"
                :name="`method-${groupId}`"
                value="clothing"
                :checked="methodByGroup[groupId] === 'clothing'"
                @change="setMethod(groupId, 'clothing')"
              >
              被衣物完整遮住
            </label>
            <label>
              <input
                type="radio"
                :name="`method-${groupId}`"
                value="clothing_sunscreen"
                :checked="
                  methodByGroup[groupId] === 'clothing_sunscreen'
                "
                @change="setMethod(groupId, 'clothing_sunscreen')"
              >
              衣物下方也有擦防曬
            </label>
            <label class="method-card__secondary">
              <input
                type="radio"
                :name="`method-${groupId}`"
                value="other_topical"
                :checked="
                  methodByGroup[groupId] === 'other_topical'
                "
                @change="setMethod(groupId, 'other_topical')"
              >
              其他外用產品
            </label>
          </div>
        </article>

        <article v-if="includeCustom" class="method-card app-card">
          <div class="method-card__title">
            <div>
              <h3>{{ customLabel || "其他部位" }}</h3>
              <p>自訂部位</p>
            </div>
          </div>
          <div class="method-card__options">
            <label>
              <input
                v-model="customMethod"
                type="radio"
                name="method-custom"
                value="sunscreen"
              >
              已擦防曬產品
            </label>
            <label>
              <input
                v-model="customMethod"
                type="radio"
                name="method-custom"
                value="clothing"
              >
              被衣物完整遮住
            </label>
            <label>
              <input
                v-model="customMethod"
                type="radio"
                name="method-custom"
                value="other_topical"
              >
              其他外用產品
            </label>
          </div>
        </article>
      </section>

      <p class="safety-note">
        請只在這個部位被衣物、帽子或其他穿戴物完整遮住時選擇。雨傘、建築物或樹蔭不算衣物遮蔽。
      </p>

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
.zone-form,
.method-list {
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

.preset-card__eyebrow,
.batch-method__eyebrow,
.method-list__heading p {
  margin: 0 0 var(--space-2);
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 500;
}

.preset-card__title,
.batch-method h2,
.method-list__heading h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 500;
}

.preset-card__body,
.preset-card__note,
.batch-method p {
  margin: var(--space-3) 0 0;
  color: var(--text-secondary);
  line-height: 1.7;
}

.preset-card__note {
  font-size: 0.875rem;
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
  overflow: hidden;
}

.zone-groups summary {
  display: flex;
  min-height: 4.75rem;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-5);
  cursor: pointer;
  list-style: none;
}

.zone-groups summary::-webkit-details-marker {
  display: none;
}

.zone-groups summary strong,
.zone-groups summary small {
  display: block;
}

.zone-groups summary strong {
  font-weight: 500;
}

.zone-groups summary small {
  margin-top: var(--space-1);
  color: var(--text-secondary);
}

.zone-groups[open] summary {
  border-bottom: 1px solid var(--border-subtle);
}

.zone-groups__list {
  display: grid;
  padding: var(--space-3) var(--space-5) var(--space-5);
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
  font-size: 0.75rem;
}

.field {
  display: grid;
  gap: var(--space-2);
  padding-top: var(--space-4);
}

.field span {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.field input {
  min-height: var(--tap-target);
  padding: var(--space-3);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: var(--page-background);
  color: var(--text-primary);
}

.batch-method {
  display: grid;
  gap: var(--space-5);
  padding: var(--space-5);
}

.method-card {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-5);
}

.method-card__title {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: start;
  gap: var(--space-3);
}

.method-card__complete {
  display: grid;
  width: 1.5rem;
  height: 1.5rem;
  place-content: center;
  border-radius: 50%;
  background: var(--color-success-soft);
  color: var(--color-success);
}

.method-card h3,
.method-card p {
  margin: 0;
}

.method-card h3 {
  font-size: 1.1rem;
  font-weight: 500;
}

.method-card p {
  margin-top: var(--space-1);
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.method-card__options {
  display: grid;
  gap: var(--space-2);
}

.method-card__options label {
  display: grid;
  min-height: var(--tap-target);
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.method-card__options label:has(input:checked) {
  border-color: var(--text-primary);
  background: var(--page-background);
}

.method-card__options input {
  accent-color: var(--text-primary);
}

.method-card__secondary {
  margin-top: var(--space-2);
}

.form-error {
  margin: 0;
  color: var(--color-due);
  line-height: 1.7;
}

@media (max-width: 31rem) {
  .preset-card {
    grid-template-columns: 1fr;
  }
}
</style>
