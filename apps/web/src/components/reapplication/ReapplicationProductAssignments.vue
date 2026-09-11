<script setup lang="ts">
import type { ZoneProjection } from "@sunshield/contracts";
import { computed } from "vue";
import type { ReapplicationProductChoice } from "../../features/reapplication/createReapplicationController";

/**
 * 補擦時用了哪瓶防曬乳。
 *
 * **2026-09-03（使用者裁決）：整條「不同部位用不同防曬乳」拿掉。**
 *
 * 2026-08-08 那次已經把「每個部位一個下拉」收成預設一個共用下拉、需要時
 * 再展開。使用者現在決定連展開那條路也不要：「不用去紀錄不同防曬擦不同
 * 部位」。真實情境是全身重擦或補了臉，不是逐部位配產品。
 *
 * 命令的形狀沒有變——`ReapplyCommandV1` 本來就吃「一組 application」，
 * 只是這個介面現在永遠只產生一組。
 */
const props = defineProps<{
  zones: ZoneProjection[];
  selectedZoneIds: string[];
  choices: ReapplicationProductChoice[];
  assignments: Record<string, string>;
  errors: Record<string, string[]>;
}>();

const emit = defineEmits<{ assign: [zoneId: string, choiceId: string] }>();

const selectedZones = computed(() =>
  props.zones.filter((zone) =>
    props.selectedZoneIds.includes(zone.zoneInstanceId)
  )
);

/**
 * 目前選到的產品。
 *
 * 各部位指派不一致時回空字串——那時下拉顯示「請選擇產品」，使用者挑一瓶
 * 就會套用到全部。舊資料如果本來分開指派過，這一步會要求重新選一次，
 * 那是刻意的：介面已經沒有辦法表達「分開」，顯示其中一瓶會是騙人的。
 */
const sharedChoiceId = computed(() => {
  const ids = new Set(
    selectedZones.value.map((zone) => props.assignments[zone.zoneInstanceId] ?? "")
  );
  return ids.size === 1 ? ([...ids][0] ?? "") : "";
});

const sharedRestriction = computed(
  () =>
    props.choices.find((choice) => choice.choiceId === sharedChoiceId.value)
      ?.restriction ?? null
);

/** 收合模式下把任一部位的產品錯誤合併成一則。 */
const sharedError = computed(() => {
  for (const zone of selectedZones.value) {
    const message = props.errors[`product.${zone.zoneInstanceId}`]?.[0];
    if (message !== undefined) return message;
  }
  return null;
});

function assignAll(choiceId: string): void {
  for (const zone of selectedZones.value) {
    emit("assign", zone.zoneInstanceId, choiceId);
  }
}

function optionLabel(choice: ReapplicationProductChoice): string {
  if (choice.restriction) return `${choice.displayName}（不建立倒數）`;
  return choice.selectable
    ? choice.displayName
    : `${choice.displayName}（不可使用）`;
}
</script>

<template>
  <section
    id="reapply-product-field"
    class="app-card assignment-section"
    aria-labelledby="assignment-title"
  >
    <h2 id="assignment-title" data-typography-role="card-title">
      用了哪瓶防曬乳？
    </h2>

    <label class="visually-hidden" for="product-shared"
      >全部部位使用的防曬乳</label
    >
    <select
      id="product-shared"
      :value="sharedChoiceId"
      :aria-describedby="sharedError ? 'product-shared-error' : undefined"
      @change="assignAll(($event.target as HTMLSelectElement).value)"
    >
      <option value="" disabled>請選擇產品</option>
      <option
        v-for="choice in choices"
        :key="choice.choiceId"
        :value="choice.choiceId"
        :disabled="!choice.selectable"
      >
        {{ optionLabel(choice) }}
      </option>
    </select>
    <p
      v-if="sharedError"
      id="product-shared-error"
      class="form-error"
      role="alert"
    >
      {{ sharedError }}
    </p>
    <p v-else-if="sharedRestriction" class="restriction-note">
      {{ sharedRestriction }}
    </p>
  </section>
</template>

<style scoped>
.assignment-section {
  display: grid;
  gap: var(--space-4);
  padding: var(--card-padding);
  justify-items: start;
}

h2,
p {
  margin: 0;
}

.assignment-section h2 {
  font-size: var(--font-size-card-title);
}

/* 只留寬度，其餘欄位外觀用 app.css 的共用宣告。 */
select {
  width: 100%;
}

.restriction-note {
  margin: 0;
  color: var(--color-untimed);
  line-height: var(--line-height-body);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
