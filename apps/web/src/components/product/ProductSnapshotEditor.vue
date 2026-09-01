<script setup lang="ts">
import Icon from "../icons/Icon.vue";
import IconLead from "../common/IconLead.vue";
import { computed, shallowRef, useId } from "vue";
import type { ProductSnapshotFormValue } from "../../features/setup/productSnapshot";

interface Props {
  waterContext: boolean;
  otherTopicalOnly?: boolean;
  /**
   * 曝曬前等待、較短補擦間隔與耐水標示只對 sunscreen 有意義（S-12）。
   * 記錄衣物時必須收起，否則會讓人以為填了就會影響倒數。
   */
  sunscreenFields?: boolean;
  /**
   * 預設收合成摘要，展開才顯示四個問答（2026-08-24）。
   *
   * 這四題**全部可以跳過**——預設值就是保守值（有防曬標示／沒有等待
   * 說明／沒有明確間隔→120 分鐘／耐水不確定），所以收合不會讓使用者
   * 漏填任何必要資料。攤開時它們佔掉 1690px（整頁的 55%），收合後
   * 約 210px。`/setup` 流程的即時記錄不套用，維持攤開。
   */
  collapsible?: boolean;
  eyebrow?: string;
  title?: string;
  description?: string;
}

const props = withDefaults(defineProps<Props>(), {
  otherTopicalOnly: false,
  sunscreenFields: true,
  collapsible: false,
  eyebrow: "本次使用",
  title: "只用在這次提醒",
  description: "只會記錄這次提醒需要的包裝標示，不會新增到你的防曬乳清單。"
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

const expanded = shallowRef(false);
const showQuestions = computed(() => !props.collapsible || expanded.value);

/**
 * 收合時的摘要，只講真正會進倒數的兩件事：間隔與耐水。
 * 不寫 SPF／PA——那兩個不影響倒數，寫在這裡會誤導。
 */
const summary = computed(() => {
  const parts: string[] = [];

  if (
    value.value.intervalAnswer === "explicit" &&
    value.value.intervalMinutes !== null
  ) {
    parts.push(`包裝間隔 ${value.value.intervalMinutes} 分鐘`);
  } else {
    parts.push("一般間隔 120 分鐘");
  }

  if (props.sunscreenFields) {
    const water = value.value.waterResistance;
    parts.push(
      water === "40" || water === "80"
        ? `耐水 ${water} 分鐘`
        : water === "not_water_resistant"
          ? "標示不耐水"
          : water === "no_claim"
            ? "沒有耐水標示"
            : "耐水未確認"
    );
  }

  return parts.join("・");
});
</script>

<template>
  <div class="product-editor">
    <!--
      2026-09-01：改成衛教頁那種「圖示與標題並排」的排法（使用者要求
      「現在左側很空」）。

      原本是 `grid-template-columns: auto 1fr` ＋ 24px 圖示：圖示只有 24px
      高，但它撐開的那一欄跟著整張卡一樣高——實測**圖示下方有 168px 的空
      白直欄**，而右欄的文字被壓窄了一整個欄寬。這跟 2026-08-31 衛教分類卡
      那個 122px 空欄是同一個病。

      `IconLead`（40px，圖示與標題同一列）是這個問題既有的答案：圖示與
      標題平起平坐，說明、摘要與按鈕回到整張卡的寬度。
    -->
    <section class="session-product app-card">
      <IconLead icon="feature-session-product">
        <span>
          <span class="session-product__eyebrow">{{ eyebrow }}</span>
          <h2 data-typography-role="section-title">{{ title }}</h2>
        </span>
      </IconLead>
      <div>
        <p>
          {{ description }}
        </p>

        <template v-if="collapsible">
          <p class="session-product__summary">{{ summary }}</p>
          <button
            class="button button--quiet session-product__toggle"
            type="button"
            :aria-expanded="expanded"
            :aria-controls="`${groupPrefix}-questions`"
            @click="expanded = !expanded"
          >
            <Icon
              :name="expanded ? 'tool-chevron-down' : 'tool-chevron-right'"
              :size="20"
            />
            {{ expanded ? "收合包裝標示" : "填寫包裝標示（選填）" }}
          </button>
        </template>
      </div>
    </section>

    <fieldset
      v-if="showQuestions"
      :id="`${groupPrefix}-questions`"
      class="question-card app-card"
    >
      <legend>
        {{
          otherTopicalOnly
            ? "這瓶防曬乳有明確的防曬或 SPF 標示嗎？"
            : "包裝有明確的防曬或 SPF 標示嗎？"
        }}
      </legend>
      <p class="question-card__helper">
        請確認包裝上是否有 SPF、PA
        等防曬標示；僅有品牌、成分或「天然」宣稱，無法確認這是防曬乳。
      </p>
      <div class="choice-grid choice-grid--row">
        <label>
          <input
            v-model="value.claimAnswer"
            type="radio"
            :name="groupNames.claim"
            value="yes"
          />
          <span>有</span>
        </label>
        <label>
          <input
            v-model="value.claimAnswer"
            type="radio"
            :name="groupNames.claim"
            value="no"
          />
          <span>沒有</span>
        </label>
        <label>
          <input
            v-model="value.claimAnswer"
            type="radio"
            :name="groupNames.claim"
            value="unknown"
          />
          <span>不確定或看不清楚</span>
        </label>
      </div>
    </fieldset>

    <aside
      v-if="sunscreenFields && value.claimAnswer !== 'yes'"
      class="identity-warning"
      role="status"
    >
      <!--
        這則警示不受收合影響：使用者選了「沒有／不確定」防曬標示時，
        該部位不會建立倒數，這個後果必須一直看得到，不能藏進收合裡。
      -->
      <Icon name="state-warning" :size="24" />
      <div>
        <strong>目前無法建立防曬乳補擦時間</strong>
        <p>
          標示確認前，系統暫時無法建立防曬乳補擦倒數；仍會保留這次使用紀錄。
        </p>
      </div>
    </aside>

    <template
      v-if="showQuestions && sunscreenFields && value.claimAnswer === 'yes'"
    >
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
            />
            <span>沒有這項說明</span>
          </label>
          <label>
            <input
              v-model="value.waitAnswer"
              type="radio"
              :name="groupNames.wait"
              value="explicit"
            />
            <span>有明確分鐘數</span>
          </label>
          <label>
            <input
              v-model="value.waitAnswer"
              type="radio"
              :name="groupNames.wait"
              value="unknown"
            />
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
          />
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
            />
            <span>沒有明確分鐘數</span>
          </label>
          <label>
            <input
              v-model="value.intervalAnswer"
              type="radio"
              :name="groupNames.interval"
              value="explicit"
            />
            <span>有明確分鐘數</span>
          </label>
          <label>
            <input
              v-model="value.intervalAnswer"
              type="radio"
              :name="groupNames.interval"
              value="unknown"
            />
            <span>不確定</span>
          </label>
        </div>
        <label v-if="value.intervalAnswer === 'explicit'" class="number-field">
          <span>補擦分鐘數</span>
          <input
            v-model.number="value.intervalMinutes"
            class="stat-figure"
            type="number"
            min="1"
            max="1440"
            inputmode="numeric"
          />
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
            />
            <span>
              耐水
              <span
                class="stat-figure"
                data-water-resistance="40"
                >40</span
              >
              分鐘
            </span>
          </label>
          <label>
            <input
              v-model="value.waterResistance"
              type="radio"
              :name="groupNames.waterResistance"
              value="80"
            />
            <span>
              耐水
              <span
                class="stat-figure"
                data-water-resistance="80"
                >80</span
              >
              分鐘
            </span>
          </label>
          <label>
            <input
              v-model="value.waterResistance"
              type="radio"
              :name="groupNames.waterResistance"
              value="not_water_resistant"
            />
            <span>明確標示不耐水</span>
          </label>
          <label>
            <input
              v-model="value.waterResistance"
              type="radio"
              :name="groupNames.waterResistance"
              value="no_claim"
            />
            <span>沒有耐水標示</span>
          </label>
          <label>
            <input
              v-model="value.waterResistance"
              type="radio"
              :name="groupNames.waterResistance"
              value="unknown"
            />
            <span>不確定或看不清楚</span>
          </label>
        </div>
      </fieldset>
    </template>

    <!--
      2026-08-31（選項丙）：純辨識用的欄位（SPF／PA 數值）由呼叫端塞進來。
      它們跟著這張卡一起收合，但**不是**「會影響倒數」的那一組——所以放
      在所有問題之後，由呼叫端自己標明不影響倒數。收在這裡的理由是：
      SPF 這個字原本在兩張卡各出現一次（這裡問「有沒有標示」、暱稱卡填
      「數字是多少」），畫面上看不出差別。
    -->
    <slot v-if="showQuestions" name="identity" />
  </div>
</template>

<style scoped>
.product-editor {
  display: grid;
  gap: var(--space-5);
}

/*
 * 2026-09-01：從「圖示一欄、內容一欄」改成單欄。
 *
 * 兩欄的版面只有第一列需要——圖示與標題那一列。剩下的說明、摘要與按鈕
 * 沒有理由被壓在右欄裡（圖示下方那條 168px 的空白就是這樣來的）。改成
 * 單欄之後，圖示與標題的並排交給 IconLead，其餘拿回整張卡的寬度。
 */
.session-product {
  display: grid;
  gap: var(--space-3);
  padding: var(--card-padding);
}

/* eyebrow 與標題疊在 IconLead 的文字側，所以 eyebrow 要自己成一行。 */
.session-product__eyebrow {
  display: block;
  margin: 0 0 var(--space-1);
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
  font-weight: 500;
}

.session-product h2,
.session-product p {
  margin: 0;
}

.session-product h2 {
  font-size: var(--font-size-section-title);
}

.session-product p:not(.session-product__eyebrow) {
  margin-top: var(--space-2);
  color: var(--text-body);
  line-height: var(--line-height-body);
}

/* 特異性要壓過上面的 `.session-product p:not(.session-product__eyebrow)`，
   否則摘要會被套成次要文字色。 */
.session-product p.session-product__summary {
  margin-top: var(--space-3);
  color: var(--text-primary);
  font-weight: 500;
}

.session-product__toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

/*
 * .question-card／.question-card__helper／.choice-grid 已抽到
 * app.css（2026-08-24），跟 GearForm.vue、
 * 設定流程的同構卡片共用，這裡不再重複定義。（原本一起共用的
 * SunscreenClaimQuickQuestion.vue 已於 2026-08-30 移除。）
 */

.number-field {
  display: grid;
  gap: var(--space-2);
}

.number-field span {
  color: var(--text-secondary);
  font-size: var(--font-size-supporting);
}

/* 只留寬度上限，其餘欄位外觀用 app.css 的共用宣告。 */
.number-field input {
  max-width: 12rem;
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

.identity-warning strong {
  display: block;
  line-height: 1.4;
}

.identity-warning p {
  margin: var(--space-1) 0 0;
  color: var(--text-body);
  font-size: var(--font-size-body);
  line-height: var(--line-height-body);
}
</style>
