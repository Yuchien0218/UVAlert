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
    class="app-card assignment-section"
    aria-labelledby="assignment-title"
  >
    <h2 id="assignment-title" data-typography-role="card-title">
      用了哪瓶防曬乳？
    </h2>

    <!--
      2026-09-03：拿掉「這次確認的包裝標示會寫入紀錄」。那是實作細節，
      而且使用者在這一步做不了任何事去影響它。
    -->
    <p class="question-card__helper">
      {{ selectedZones.length }} 個部位都記錄成同一瓶。
    </p>
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

/*
 * 標題→說明收成 stack 系統的 8px（2026-09-03）。
 *
 * 這張卡的 grid gap 是 16px，給的是「區塊與區塊之間」；標題與它自己的說明
 * 之間 DESIGN.md 訂的是 `--space-stack-title-body`。同一頁的另外兩張卡走
 * `.question-card`，那邊本來就是 8px——實測這裡是 16px，讀起來像說明不屬於
 * 上面那個標題。
 *
 * 用負 margin 抵掉 gap 的差額，與 app.css 的 `.control-rule-note` 同一種做法
 * （grid gap 沒辦法只針對第一對子代給不同值）。
 */
.assignment-section h2 + .question-card__helper {
  margin-top: calc(var(--space-stack-title-body) - var(--space-4));
}

/*
 * 說明文字改用共用的 `.question-card__helper`（2026-09-03）。原本這裡自己
 * 定了一份，同一頁上就有三種寫法（`question-card__helper`、`section-help`、
 * 這一個），值一樣但標題與說明之間的間距各不相同。
 */


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
