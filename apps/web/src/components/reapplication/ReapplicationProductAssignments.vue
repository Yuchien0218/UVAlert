<script setup lang="ts">
import type { ZoneProjection } from "@sunshield/contracts";
import { computed, ref, watch } from "vue";
import type { ReapplicationProductChoice } from "../../features/reapplication/createReapplicationController";
import { getZoneLabel } from "../../features/reminder/reminderPresentation";

/**
 * 補擦時的產品指派。
 *
 * 原本每個部位各一個下拉，八個部位就八個選單，整頁 3000px 以上。
 * 真實情境是「全身重擦」或「補了臉」，不是八個部位各配一支產品，
 * 所以預設收成一個「全部使用同一產品」，需要分開時再展開
 * （2026-08-08，檢討文件問題 3）。
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

/** 目前各部位指派到的產品；一種以上代表使用者確實需要分開指定。 */
const assignedChoiceIds = computed(
  () =>
    new Set(
      selectedZones.value.map(
        (zone) => props.assignments[zone.zoneInstanceId] ?? ""
      )
    )
);

const perZone = ref(false);

// 既有紀錄本來就分開指派時直接展開，否則收合會把差異藏起來。
watch(
  assignedChoiceIds,
  (ids) => {
    if (ids.size > 1) perZone.value = true;
  },
  { immediate: true }
);

const sharedChoiceId = computed(() =>
  assignedChoiceIds.value.size === 1
    ? ([...assignedChoiceIds.value][0] ?? "")
    : ""
);

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

    <template v-if="!perZone">
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
      <button class="text-link" type="button" @click="perZone = true">
        不同部位使用不同防曬乳
      </button>
    </template>

    <template v-else>
      <p class="question-card__helper">分別選擇各部位實際使用的防曬乳。</p>
      <div
        v-for="zone in selectedZones"
        :key="zone.zoneInstanceId"
        class="assignment-row"
      >
        <label :for="`product-${zone.zoneInstanceId}`">
          {{ getZoneLabel(zone) }}
        </label>
        <select
          :id="`product-${zone.zoneInstanceId}`"
          :value="assignments[zone.zoneInstanceId] ?? ''"
          :aria-describedby="
            errors[`product.${zone.zoneInstanceId}`]
              ? `product-error-${zone.zoneInstanceId}`
              : undefined
          "
          @change="
            emit(
              'assign',
              zone.zoneInstanceId,
              ($event.target as HTMLSelectElement).value
            )
          "
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
          v-if="errors[`product.${zone.zoneInstanceId}`]?.[0]"
          :id="`product-error-${zone.zoneInstanceId}`"
          class="form-error"
          role="alert"
        >
          {{ errors[`product.${zone.zoneInstanceId}`]?.[0] }}
        </p>
        <p
          v-else-if="
            choices.find(
              (choice) => choice.choiceId === assignments[zone.zoneInstanceId]
            )?.restriction
          "
          class="restriction-note"
        >
          {{
            choices.find(
              (choice) => choice.choiceId === assignments[zone.zoneInstanceId]
            )?.restriction
          }}
        </p>
      </div>
      <button
        v-if="assignedChoiceIds.size <= 1"
        class="text-link"
        type="button"
        @click="perZone = false"
      >
        全部改用同一瓶防曬乳
      </button>
    </template>
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

.assignment-row {
  display: grid;
  gap: var(--space-2);
  width: 100%;
}

/*
 * 2026-08-30：字重 700 → 500。DESIGN.md 第三節訂「標籤與強調短語 500」，
 * 700 不在量表上，字型也只載入 400／500／600。
 */
.assignment-row label {
  font-weight: 500;
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
