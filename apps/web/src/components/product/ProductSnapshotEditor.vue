<script setup lang="ts">
import { AlertTriangle, PackageCheck } from "@lucide/vue";
import { useId } from "vue";
import type { ProductSnapshotFormValue } from "../../features/setup/productSnapshot";

interface Props {
  waterContext: boolean;
  otherTopicalOnly?: boolean;
  eyebrow?: string;
  title?: string;
  description?: string;
}

withDefaults(defineProps<Props>(), {
  otherTopicalOnly: false,
  eyebrow: "本次使用",
  title: "這次先不保存產品",
  description:
    "這次只保存產生提醒所需的包裝標示快照，不會新增到你的產品清單。"
});

const value = defineModel<ProductSnapshotFormValue>({
  required: true
});

const groupPrefix = useId();
const groupNames = {
  claim: `${groupPrefix}-claim`,
  wait: `${groupPrefix}-wait`,
  interval: `${groupPrefix}-interval`,
  waterResistance: `${groupPrefix}-water-resistance`
};
</script>

<template>
  <div class="product-editor">
    <section class="session-product app-card">
      <PackageCheck :size="25" :stroke-width="1.6" aria-hidden="true" />
      <div>
        <p class="session-product__eyebrow">{{ eyebrow }}</p>
        <h2>{{ title }}</h2>
        <p>
          {{ description }}
        </p>
      </div>
    </section>

    <fieldset class="question-card app-card">
      <legend>
        {{
          otherTopicalOnly
            ? "這項外用產品有明確的防曬或 SPF 標示嗎？"
            : "包裝有明確的防曬或 SPF 標示嗎？"
        }}
      </legend>
      <p class="question-card__helper">
        請確認包裝上是否有 SPF、PA 等防曬標示；僅有品牌、成分或「天然」宣稱，無法確認這是防曬產品。
      </p>
      <div class="choice-grid choice-grid--row">
        <label>
          <input
            v-model="value.claimAnswer"
            type="radio"
            :name="groupNames.claim"
            value="yes"
          >
          <span>有</span>
        </label>
        <label>
          <input
            v-model="value.claimAnswer"
            type="radio"
            :name="groupNames.claim"
            value="no"
          >
          <span>沒有</span>
        </label>
        <label>
          <input
            v-model="value.claimAnswer"
            type="radio"
            :name="groupNames.claim"
            value="unknown"
          >
          <span>不確定或看不清楚</span>
        </label>
      </div>
    </fieldset>

    <aside
      v-if="value.claimAnswer !== 'yes'"
      class="identity-warning"
      role="status"
    >
      <AlertTriangle :size="21" aria-hidden="true" />
      <div>
        <strong>目前無法建立產品補擦時間</strong>
        <p>
          標示確認前，系統暫時無法建立產品補擦倒數；仍會保留這次使用紀錄。
        </p>
      </div>
    </aside>

    <template v-if="value.claimAnswer === 'yes'">
      <fieldset class="question-card app-card">
        <legend>包裝怎麼寫曝曬前等待時間？</legend>
        <p class="question-card__helper">
          只填包裝上可確認的內容；看不清楚時請選擇「不確定」。
        </p>
        <div class="choice-grid choice-grid--row">
          <label>
            <input
              v-model="value.waitAnswer"
              type="radio"
              :name="groupNames.wait"
              value="none"
            >
            <span>沒有這項說明</span>
          </label>
          <label>
            <input
              v-model="value.waitAnswer"
              type="radio"
              :name="groupNames.wait"
              value="explicit"
            >
            <span>有明確分鐘數</span>
          </label>
          <label>
            <input
              v-model="value.waitAnswer"
              type="radio"
              :name="groupNames.wait"
              value="unknown"
            >
            <span>不確定</span>
          </label>
        </div>
        <label v-if="value.waitAnswer === 'explicit'" class="number-field">
          <span>等待分鐘數</span>
          <input
            v-model.number="value.waitMinutes"
            class="stat-figure"
            type="number"
            min="1"
            max="240"
            inputmode="numeric"
          >
        </label>
      </fieldset>

      <fieldset class="question-card app-card">
        <legend>包裝有寫較短的一般補擦時間嗎？</legend>
        <p class="question-card__helper">
          若包裝有明確分鐘數，提醒會採用這項較短標示。
        </p>
        <div class="choice-grid choice-grid--row">
          <label>
            <input
              v-model="value.intervalAnswer"
              type="radio"
              :name="groupNames.interval"
              value="none"
            >
            <span>沒有明確分鐘數</span>
          </label>
          <label>
            <input
              v-model="value.intervalAnswer"
              type="radio"
              :name="groupNames.interval"
              value="explicit"
            >
            <span>有明確分鐘數</span>
          </label>
          <label>
            <input
              v-model="value.intervalAnswer"
              type="radio"
              :name="groupNames.interval"
              value="unknown"
            >
            <span>不確定</span>
          </label>
        </div>
        <label
          v-if="value.intervalAnswer === 'explicit'"
          class="number-field"
        >
          <span>補擦分鐘數</span>
          <input
            v-model.number="value.intervalMinutes"
            class="stat-figure"
            type="number"
            min="1"
            max="1440"
            inputmode="numeric"
          >
        </label>
      </fieldset>

      <fieldset v-if="waterContext" class="question-card app-card">
        <legend>包裝上的耐水標示</legend>
        <p class="question-card__helper">
          只依照包裝標示選擇，不從產品名稱或使用感推測。
        </p>
        <div class="choice-grid choice-grid--compact">
          <label>
            <input
              v-model="value.waterResistance"
              type="radio"
              :name="groupNames.waterResistance"
              value="40"
            >
            <span>
              耐水
              <span
                class="stat-figure stat-figure--inline"
                data-water-resistance="40"
              >40</span>
              分鐘
            </span>
          </label>
          <label>
            <input
              v-model="value.waterResistance"
              type="radio"
              :name="groupNames.waterResistance"
              value="80"
            >
            <span>
              耐水
              <span
                class="stat-figure stat-figure--inline"
                data-water-resistance="80"
              >80</span>
              分鐘
            </span>
          </label>
          <label>
            <input
              v-model="value.waterResistance"
              type="radio"
              :name="groupNames.waterResistance"
              value="not_water_resistant"
            >
            <span>明確標示不耐水</span>
          </label>
          <label>
            <input
              v-model="value.waterResistance"
              type="radio"
              :name="groupNames.waterResistance"
              value="no_claim"
            >
            <span>沒有耐水宣稱</span>
          </label>
          <label>
            <input
              v-model="value.waterResistance"
              type="radio"
              :name="groupNames.waterResistance"
              value="unknown"
            >
            <span>不確定或看不清楚</span>
          </label>
        </div>
      </fieldset>
    </template>
  </div>
</template>

<style scoped>
.product-editor {
  display: grid;
  gap: var(--space-5);
}

.session-product {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--space-4);
  padding: var(--space-5);
}

.session-product__eyebrow {
  margin: 0 0 var(--space-2);
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 500;
}

.session-product h2,
.session-product p {
  margin: 0;
}

.session-product h2 {
  font-size: 1.15rem;
  font-weight: 500;
}

.session-product p:not(.session-product__eyebrow) {
  margin-top: var(--space-2);
  color: var(--text-secondary);
  line-height: 1.7;
}

.question-card {
  display: grid;
  gap: var(--space-4);
  min-width: 0;
  margin: 0;
  padding: var(--space-5);
  border: 1px solid var(--border-subtle);
}

.question-card legend {
  float: left;
  width: 100%;
  max-width: 100%;
  margin: 0;
  padding: 0;
  font-size: 1.08rem;
  font-weight: 500;
  overflow-wrap: anywhere;
}

.question-card legend + * {
  clear: both;
}

.question-card__helper {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.875rem;
  line-height: 1.7;
}

.choice-grid {
  display: grid;
  gap: var(--space-2);
}

.choice-grid--row,
.choice-grid--compact {
  grid-template-columns: minmax(0, 1fr);
}

.choice-grid label {
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

.choice-grid label:has(input:checked) {
  border-color: var(--text-primary);
  background: var(--page-background);
  box-shadow: inset 0 0 0 1px var(--text-primary);
}

.choice-grid input {
  accent-color: var(--text-primary);
}

@media (min-width: 42rem) {
  .choice-grid--row {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .choice-grid--compact {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.number-field {
  display: grid;
  gap: var(--space-2);
}

.number-field span {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.number-field input {
  min-height: var(--tap-target);
  max-width: 12rem;
  padding: var(--space-3);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: var(--page-background);
  color: var(--text-primary);
}

.identity-warning {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--color-soon);
  border-radius: var(--radius-md);
  background: var(--color-soon-soft);
  color: var(--text-primary);
}

.identity-warning p {
  margin: var(--space-1) 0 0;
  color: var(--text-secondary);
  font-size: 0.875rem;
  line-height: 1.7;
}
</style>
