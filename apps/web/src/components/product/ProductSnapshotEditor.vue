<script setup lang="ts">
import { PackageCheck } from "@lucide/vue";
import Icon from "../icons/Icon.vue";
import { useId } from "vue";
import type { ProductSnapshotFormValue } from "../../features/setup/productSnapshot";

interface Props {
  waterContext: boolean;
  otherTopicalOnly?: boolean;
  /**
   * 曝曬前等待、較短補擦間隔與耐水標示只對 sunscreen 有意義（S-12）。
   * 記錄衣物時必須收起，否則會讓人以為填了就會影響倒數。
   */
  sunscreenFields?: boolean;
  eyebrow?: string;
  title?: string;
  description?: string;
}

withDefaults(defineProps<Props>(), {
  otherTopicalOnly: false,
  sunscreenFields: true,
  eyebrow: "本次使用",
  title: "只用在這次提醒",
  description:
    "只會記錄這次提醒需要的包裝標示，不會新增到你的防曬乳清單。"
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
      <!-- 絕對定位的大太陽背景裝飾 -->
      <svg
        class="session-product__sun-decor"
        viewBox="0 0 48 48"
        aria-hidden="true"
      >
        <circle cx="24" cy="24" r="11" />
        <line
          v-for="rayIndex in 8"
          :key="rayIndex"
          x1="24"
          y1="2"
          x2="24"
          y2="7"
          :transform="`rotate(${(rayIndex - 1) * 45} 24 24)`"
        />
      </svg>
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
            ? "這瓶防曬乳有明確的防曬或 SPF 標示嗎？"
            : "包裝有明確的防曬或 SPF 標示嗎？"
        }}
      </legend>
      <p class="question-card__helper">
        請確認包裝上是否有 SPF、PA 等防曬標示；僅有品牌、成分或「天然」宣稱，無法確認這是防曬乳。
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
      v-if="sunscreenFields && value.claimAnswer !== 'yes'"
      class="identity-warning"
      role="status"
    >
      <Icon name="state-warning" :size="24" />
      <div>
        <strong>目前無法建立防曬乳補擦時間</strong>
        <p>
          標示確認前，系統暫時無法建立防曬乳補擦倒數；仍會保留這次使用紀錄。
        </p>
      </div>
    </aside>

    <template v-if="sunscreenFields && value.claimAnswer === 'yes'">
      <fieldset class="question-card app-card">
        <legend>包裝怎麼寫擦上後的等待時間？</legend>
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
        <legend>包裝有寫較短的補擦間隔嗎？</legend>
        <p class="question-card__helper">
          如果包裝有明確分鐘數，提醒會採用這個較短的間隔。
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
            <span>沒有耐水標示</span>
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
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--space-4);
  padding: var(--space-5);
  overflow: hidden;
}

.session-product__sun-decor {
  position: absolute;
  right: -1.5rem;
  bottom: -1.5rem;
  width: 8rem;
  height: 8rem;
  color: var(--color-primary);
  opacity: 0.05;
  pointer-events: none;
}

.session-product__sun-decor circle,
.session-product__sun-decor line {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
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
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out),
              border-color var(--duration-fast) var(--ease-out);
}

.choice-grid label:hover {
  background-color: var(--border-subtle);
}

.choice-grid label:active {
  filter: brightness(0.85);
}

.choice-grid label:has(input:checked) {
  border-color: var(--surface-inverse);
  background: var(--surface-inverse);
  color: var(--text-inverse);
}

.choice-grid input {
  accent-color: var(--text-primary);
}

.choice-grid label:has(input:checked) input {
  accent-color: var(--text-inverse);
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
