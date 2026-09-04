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
   * 四題全部預設收起來（2026-09-01 之前是「整組藏在一顆按鈕後面」）。
   *
   * 這四題**全部可以跳過**——預設值就是保守值（有防曬標示／沒有等待
   * 說明／沒有明確間隔→120 分鐘／耐水不確定），所以收起來不會讓使用者
   * 漏填任何必要資料。
   *
   * `/setup` 的即時記錄傳 false：那條流程正在建立倒數，第一題（有沒有
   * 防曬標示）直接決定這次能不能建立補擦倒數，不該要多按一下才看得到。
   * 其餘三題仍然收著。
   */
  collapsible?: boolean;
  /**
   * 值是不是來自已儲存的紀錄。
   *
   * **這個元件無法自己分辨「沒填過」與「填了、剛好等於預設值」**——兩者
   * 的資料完全一樣。編輯既有裝備時每一列都有真正的答案（那份 snapshot
   * 存過），所以由呼叫端告知；新增時則是 false，沒動過的列寫「尚未填寫」。
   */
  prefilled?: boolean;
  eyebrow?: string;
  title?: string;
  description?: string;
}

const props = withDefaults(defineProps<Props>(), {
  otherTopicalOnly: false,
  sunscreenFields: true,
  collapsible: false,
  prefilled: false,
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

/**
 * 2026-09-01（使用者裁決：甲＋丙）：四題改成「一列一題，點開才作答」。
 *
 * **為什麼改。** 使用者回報「太長了要滑很久」。實測 375px 下攤開後整頁
 * 2803px，四張問題卡佔 1368px——**整頁的 49%**。而這四題全部可以跳過，
 * 多數人不會逐題回答，卻要為它們捲過半頁。
 *
 * 收合時每一列是「問題 → 目前答案 ›」，資訊沒有藏起來（答案就寫在列上），
 * 只有**選項**收起來了。這跟舊版那顆「填寫包裝標示」按鈕的差別是：舊版
 * 一次攤開全部四題，要改第四題就得捲過前三題。
 *
 * 一次只開一題（accordion）：這樣展開後的高度有上限，不會回到原本那種
 * 四題同時攤開的長度。
 */
type QuestionKey = "claim" | "wait" | "interval" | "water";

/**
 * `/setup` 的即時記錄預設開著第一題——那題直接決定這次能不能建立倒數。
 * 裝備表單（collapsible）四題全收。
 */
const openQuestion = shallowRef<QuestionKey | null>(
  props.collapsible ? null : "claim"
);

function toggleQuestion(key: QuestionKey): void {
  openQuestion.value = openQuestion.value === key ? null : key;
}

/**
 * 使用者動過哪幾題。
 *
 * 沒動過而且不是既有紀錄時，那一列寫「尚未填寫」而不是預設值的文字
 * （2026-09-01 使用者裁決）。理由是預設值雖然保守且安全，但把它寫成
 * 一個答案會讓人以為自己回答過了——「尚未填寫」才看得出還可以補。
 */
const touched = shallowRef(new Set<QuestionKey>());

function markTouched(key: QuestionKey): void {
  if (touched.value.has(key)) return;
  touched.value = new Set(touched.value).add(key);
}

function isAnswered(key: QuestionKey): boolean {
  return props.prefilled || touched.value.has(key);
}

const NUMERIC_ANSWER_LABELS = {
  none: "沒有這項說明",
  unknown: "不確定",
  explicit: "有明確分鐘數"
} as const;

/** 每一列右側顯示的目前答案；null 代表「尚未填寫」。 */
const answers = computed<Record<QuestionKey, string | null>>(() => {
  const form = value.value;

  const numeric = (
    key: "wait" | "interval",
    answer: typeof form.waitAnswer,
    minutes: number | null
  ): string | null => {
    if (!isAnswered(key)) return null;
    if (answer === "explicit") {
      return minutes === null ? "有明確分鐘數" : `${minutes} 分鐘`;
    }
    return NUMERIC_ANSWER_LABELS[answer];
  };

  return {
    claim: !isAnswered("claim")
      ? null
      : form.claimAnswer === "yes"
        ? "有"
        : form.claimAnswer === "no"
          ? "沒有"
          : "不確定或看不清楚",
    wait: numeric("wait", form.waitAnswer, form.waitMinutes),
    interval: numeric("interval", form.intervalAnswer, form.intervalMinutes),
    water: !isAnswered("water")
      ? null
      : form.waterResistance === "40" || form.waterResistance === "80"
        ? `耐水 ${form.waterResistance} 分鐘`
        : form.waterResistance === "not_water_resistant"
          ? "明確標示不耐水"
          : form.waterResistance === "no_claim"
            ? "沒有耐水標示"
            : "不確定或看不清楚"
  };
});

/**
 * 耐水改成兩層（使用者裁決：丙）。
 *
 * 原本五個選項直式堆疊，實測 423px，是四張卡裡最高的一張。其中「耐水 40
 * 分鐘」與「耐水 80 分鐘」其實是同一個答案的兩種程度——先問「有沒有耐水
 * 標示」，答有才出現 40／80。
 *
 * **另外三個沒有合併**：「沒有耐水標示」（包裝沒寫）與「明確標示不耐水」
 * （包裝寫了不耐水）在 reducer 裡走同一條路徑，但它們記錄的是不同的事實。
 * 為了幾十像素把兩者合併會弄丟「使用者看到了什麼」，不划算。
 */
const waterHasClaim = computed<string>({
  get: () => {
    const water = value.value.waterResistance;
    return water === "40" || water === "80" ? "yes" : water;
  },
  set: (next) => {
    markTouched("water");
    if (next === "yes") {
      const water = value.value.waterResistance;
      // 已經是 40／80 就不要覆寫使用者選過的分鐘數。
      if (water !== "40" && water !== "80") value.value.waterResistance = "40";
      return;
    }
    value.value.waterResistance =
      next as ProductSnapshotFormValue["waterResistance"];
  }
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
    <!--
      2026-09-03（待辦第三＋五項）：標題、四題與 SPF／PA **合成一張卡**。

      改動前這裡是三張各自獨立的 `app-card`，其中第一張**沒有任何控制項**
      ——只有圖示、eyebrow、標題與一句說明，卻佔了一張完整的卡。三塊講的
      都是同一件事（這罐的包裝標示），分成三張讀起來像三個不相干的區塊。

      卡片本身 `padding: 0`，各區自己出內距：四題那一段的分隔線要橫貫整張
      卡，卡片有內距的話線會縮排一截，看起來像沒對齊。
    -->
    <section class="label-card app-card">
      <div class="session-product">
      <IconLead icon="feature-session-product">
        <span>
          <span class="session-product__eyebrow">{{ eyebrow }}</span>
          <h2 data-typography-role="card-title">{{ title }}</h2>
        </span>
      </IconLead>
      <!--
        2026-09-04：`description` 可以是空字串，那時整段不渲染。

        呼叫端有一個分支已經沒有話要說（防曬乳那一支的「請依包裝標示
        填寫。」被刪掉了——標題「防曬乳規格確認」已經講完同一件事）。
        沒有這個 `v-if` 的話會留下一個空的 `<p>`，用空元素撐出間距正是
        2026-08-29 B9 §5 明文禁止的事。
      -->
      <div v-if="description !== ''">
        <p>
          {{ description }}
        </p>
      </div>
      </div>

    <!--
      2026-09-01（使用者裁決：甲）：四題各佔一列，點開才作答。

      收合時每一列都寫著目前的答案，所以資訊沒有被藏起來——收起來的只有
      「選項」。沒動過的列寫「尚未填寫」（使用者裁決）：預設值雖然保守
      且安全，但把它印成一個答案會讓人以為自己回答過了。

      每一列是 `aria-expanded` ＋ `aria-controls` 的展開控制，chevron 換
      圖示 name 而不是 rotate（DESIGN.md 第五節的展開收合契約）。
    -->
      <div class="label-questions">
      <div class="label-question">
        <button
          class="label-question__row"
          type="button"
          :aria-expanded="openQuestion === 'claim'"
          :aria-controls="`${groupPrefix}-claim-panel`"
          @click="toggleQuestion('claim')"
        >
          <span class="label-question__name">防曬標示</span>
          <span class="label-question__answer">{{
            answers.claim ?? "尚未填寫"
          }}</span>
          <Icon
            class="label-question__chevron"
            :name="
              openQuestion === 'claim'
                ? 'tool-chevron-down'
                : 'tool-chevron-right'
            "
            :size="20"
          />
        </button>

        <fieldset
          v-if="openQuestion === 'claim'"
          :id="`${groupPrefix}-claim-panel`"
          class="label-question__panel"
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
                @change="markTouched('claim')"
              />
              <span>有</span>
            </label>
            <label>
              <input
                v-model="value.claimAnswer"
                type="radio"
                :name="groupNames.claim"
                value="no"
                @change="markTouched('claim')"
              />
              <span>沒有</span>
            </label>
            <label>
              <input
                v-model="value.claimAnswer"
                type="radio"
                :name="groupNames.claim"
                value="unknown"
                @change="markTouched('claim')"
              />
              <span>不確定或看不清楚</span>
            </label>
          </div>
        </fieldset>
      </div>

      <!--
        剩下三題只有「這是防曬乳」時才有意義。`claimAnswer !== 'yes'` 時
        它們整組不出現——這不是為了省空間，是因為那時根本不會建立倒數，
        問「包裝寫幾分鐘」沒有答案可用。
      -->
      <template v-if="sunscreenFields && value.claimAnswer === 'yes'">
        <div class="label-question">
          <button
            class="label-question__row"
            type="button"
            :aria-expanded="openQuestion === 'wait'"
            :aria-controls="`${groupPrefix}-wait-panel`"
            @click="toggleQuestion('wait')"
          >
            <span class="label-question__name">擦上後等待</span>
            <span class="label-question__answer">{{
              answers.wait ?? "尚未填寫"
            }}</span>
            <Icon
              class="label-question__chevron"
              :name="
                openQuestion === 'wait'
                  ? 'tool-chevron-down'
                  : 'tool-chevron-right'
              "
              :size="20"
            />
          </button>

          <fieldset
            v-if="openQuestion === 'wait'"
            :id="`${groupPrefix}-wait-panel`"
            class="label-question__panel"
          >
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
                  @change="markTouched('wait')"
                />
                <span>沒有這項說明</span>
              </label>
              <label>
                <input
                  v-model="value.waitAnswer"
                  type="radio"
                  :name="groupNames.wait"
                  value="explicit"
                  @change="markTouched('wait')"
                />
                <span>有明確分鐘數</span>
              </label>
              <label>
                <input
                  v-model="value.waitAnswer"
                  type="radio"
                  :name="groupNames.wait"
                  value="unknown"
                  @change="markTouched('wait')"
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
                @input="markTouched('wait')"
              />
            </label>
          </fieldset>
        </div>

        <div class="label-question">
          <button
            class="label-question__row"
            type="button"
            :aria-expanded="openQuestion === 'interval'"
            :aria-controls="`${groupPrefix}-interval-panel`"
            @click="toggleQuestion('interval')"
          >
            <span class="label-question__name">補擦間隔</span>
            <span class="label-question__answer">{{
              answers.interval ?? "尚未填寫"
            }}</span>
            <Icon
              class="label-question__chevron"
              :name="
                openQuestion === 'interval'
                  ? 'tool-chevron-down'
                  : 'tool-chevron-right'
              "
              :size="20"
            />
          </button>

          <fieldset
            v-if="openQuestion === 'interval'"
            :id="`${groupPrefix}-interval-panel`"
            class="label-question__panel"
          >
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
                  @change="markTouched('interval')"
                />
                <span>沒有明確分鐘數</span>
              </label>
              <label>
                <input
                  v-model="value.intervalAnswer"
                  type="radio"
                  :name="groupNames.interval"
                  value="explicit"
                  @change="markTouched('interval')"
                />
                <span>有明確分鐘數</span>
              </label>
              <label>
                <input
                  v-model="value.intervalAnswer"
                  type="radio"
                  :name="groupNames.interval"
                  value="unknown"
                  @change="markTouched('interval')"
                />
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
                @input="markTouched('interval')"
              />
            </label>
          </fieldset>
        </div>

        <div v-if="waterContext" class="label-question">
          <button
            class="label-question__row"
            type="button"
            :aria-expanded="openQuestion === 'water'"
            :aria-controls="`${groupPrefix}-water-panel`"
            @click="toggleQuestion('water')"
          >
            <span class="label-question__name">耐水標示</span>
            <span class="label-question__answer">{{
              answers.water ?? "尚未填寫"
            }}</span>
            <Icon
              class="label-question__chevron"
              :name="
                openQuestion === 'water'
                  ? 'tool-chevron-down'
                  : 'tool-chevron-right'
              "
              :size="20"
            />
          </button>

          <!--
            2026-09-01（使用者裁決：丙）：拆成兩層。

            原本五個選項直式堆疊，實測 423px，是四張卡裡最高的一張。
            「耐水 40 分鐘」與「耐水 80 分鐘」其實是同一個答案的兩種程度，
            所以先問有沒有標示，答有才出現分鐘數。
          -->
          <fieldset
            v-if="openQuestion === 'water'"
            :id="`${groupPrefix}-water-panel`"
            class="label-question__panel"
          >
            <legend>包裝上的耐水標示</legend>
            <p class="question-card__helper">
              只依照包裝標示選擇，不從產品名稱或使用感推測。
            </p>
            <!--
              **第二層緊接在「有耐水標示」下面，不是排在四個選項之後。**

              第一版把 40／80 放在整組選項的最後，畫出來看之後發現讀成了
              「六個並列的選項」——縮排根本救不了，因為中間隔著三個同層級
              的選項。任何 DOM 或數值斷言對這件事都是綠的（CLAUDE.md
              「有些問題只有畫出來看才找得到」）。

              radio group 被拆成兩個 `<div>`，但 `name` 相同，所以單選行為
              不受影響。

              **2026-09-01 第二次調整（使用者要求「旁邊有一條顏色怪怪的，
              字也分兩行」）：改成與母選項接成同一張卡。**

              前一版靠「縮排＋左側一條連接線」表示層級。那條線在畫面上是一
              段沒有來由的色塊——它不圍住任何東西，只是浮在旁邊；而縮排又把
              兩個選項擠窄，「耐水 40 分鐘」因此折成兩行。

              現在改成**用包含關係取代連接線**：母選項的下緣拿掉圓角與框線，
              分鐘那一排直接續在下面、共用同一組邊框與底色，讀起來就是同一
              張卡的第二段。層級不需要另一個圖形來說明。

              文字也一起縮短成「40 分鐘」——母選項已經寫了「有耐水標示」，
              再重複一次「耐水」正是把字擠到第二行的原因。
            -->
            <div class="choice-grid choice-grid--row">
              <label
                class="water-claim-option"
                :class="{
                  'water-claim-option--joined': waterHasClaim === 'yes'
                }"
              >
                <input
                  v-model="waterHasClaim"
                  type="radio"
                  :name="groupNames.waterResistance"
                  value="yes"
                />
                <span>有耐水標示</span>
              </label>

              <div
                v-if="waterHasClaim === 'yes'"
                class="choice-grid label-question__minutes"
              >
                <label>
                  <input
                    v-model="value.waterResistance"
                    type="radio"
                    :name="`${groupNames.waterResistance}-minutes`"
                    value="40"
                    @change="markTouched('water')"
                  />
                  <span>
                    <span class="stat-figure" data-water-resistance="40"
                      >40</span
                    >
                    分鐘
                  </span>
                </label>
                <label>
                  <input
                    v-model="value.waterResistance"
                    type="radio"
                    :name="`${groupNames.waterResistance}-minutes`"
                    value="80"
                    @change="markTouched('water')"
                  />
                  <span>
                    <span class="stat-figure" data-water-resistance="80"
                      >80</span
                    >
                    分鐘
                  </span>
                </label>
              </div>
            </div>

            <div class="choice-grid choice-grid--row">
              <label>
                <input
                  v-model="waterHasClaim"
                  type="radio"
                  :name="groupNames.waterResistance"
                  value="no_claim"
                />
                <span>沒有耐水標示</span>
              </label>
              <label>
                <input
                  v-model="waterHasClaim"
                  type="radio"
                  :name="groupNames.waterResistance"
                  value="not_water_resistant"
                />
                <span>明確標示不耐水</span>
              </label>
              <label>
                <input
                  v-model="waterHasClaim"
                  type="radio"
                  :name="groupNames.waterResistance"
                  value="unknown"
                />
                <span>不確定或看不清楚</span>
              </label>
            </div>
          </fieldset>
        </div>
      </template>
      </div>

      <!--
        2026-09-03：SPF／PA 收進同一張卡（待辦第五項）。

        它原本自己是一張 `app-card`，那是 2026-08-31 用 slot 把它從「暱稱」
        卡搬過來時的最小改動，不是版面裁決——它跟上面四題講的是同一件事。

        呼叫端那句「這兩欄不影響補擦倒數」**必須留著**：同一張卡裡上面四題
        會影響倒數、下面兩欄不會，不講清楚是安全相關的誤解，不只是版面。
      -->
      <slot name="identity" />
    </section>

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

.session-product p:not(.session-product__eyebrow) {
  margin-top: var(--space-2);
  color: var(--text-body);
  line-height: var(--line-height-body);
}

/*
 * 2026-09-01：四題改成逐題展開的清單。
 *
 * 一張卡、每題一列。列與列之間用 hairline 分開而不是各自成卡——四張卡
 * 疊在一起會讓「這是四件事」變成「這是四個區塊」，而它們其實是同一份
 * 包裝標示的四個欄位。
 */
/*
 * 合併後的整張卡（2026-09-03）。
 *
 * `padding: 0` 是刻意的：四題那一段的分隔線要橫貫整張卡，卡片自己有內距
 * 的話線會兩端各縮排 20px，看起來像沒對齊。各區自己出內距。
 */
.label-card {
  display: grid;
  padding: 0;
}

.label-questions {
  display: grid;
  padding: 0;
  /* 與上方標題區之間的分隔——同一張卡裡的分段，不是另一張卡。 */
  border-top: 1px solid var(--border-subtle);
}

.label-question + .label-question {
  border-top: 1px solid var(--border-subtle);
}

.label-question__row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: var(--tap-target);
  padding: var(--space-3) var(--card-padding);
  border: 0;
  background: none;
  color: var(--text-primary);
  cursor: pointer;
  font: inherit;
  text-align: start;
}

.label-question__name {
  font-weight: 500;
}

/* 答案靠右、緊鄰 chevron——那一欄是「目前是什麼」，跟左邊的題目分開讀。 */
.label-question__answer {
  color: var(--text-secondary);
  text-align: end;
}

.label-question__chevron {
  flex: none;
  color: var(--text-secondary);
}

.label-question__panel {
  display: grid;
  gap: var(--space-3);
  margin: 0;
  padding: 0 var(--card-padding) var(--space-4);
  border: 0;
}

.label-question__panel legend {
  padding: 0;
  font-weight: 500;
  line-height: var(--line-height-body);
}

/*
 * 40／80 是「有耐水標示」的細分，不是第五、第六個並列選項。
 *
 * 三件事一起才讀得出層次（只做縮排不夠——第一版就是只有縮排，畫出來看
 * 之後仍然讀成六個並列選項）：緊接在母選項下面、縮排、左側一條連接線。
 *
 * 兩欄並排而不是直式堆疊：這兩個選項各只有五個字，直式會多佔一整列，
 * 而 40／80 本來就是一組二選一。
 */
/*
 * 母選項被選中時，下緣接到分鐘那一排——所以拿掉下方圓角。
 * 邊框留著：兩段共用同一條線，看起來就是一張卡被橫線分成兩段。
 */
.water-claim-option--joined {
  border-end-start-radius: 0;
  border-end-end-radius: 0;
}

/*
 * 分鐘那一排：續在母選項下面，共用邊框與底色。
 *
 * **不用連接線表示層級，用包含關係。** 前一版是「縮排＋左側一條 2px 的
 * 線」，那條線在畫面上是一段沒有來由的色塊（它不圍住任何東西），而縮排
 * 把選項擠窄到讓「耐水 40 分鐘」折成兩行。使用者的原話是「旁邊有一條顏色
 * 怪怪的，字也分兩行了」。
 *
 * `margin-top` 取負的 gap 是為了跟母選項貼齊——`.choice-grid` 的 gap 是
 * space-2，不扣掉的話兩段之間會有一條縫，就不像同一張卡了。
 *
 * 沿用 `.choice-grid`（選項外框與自訂 radio 外觀來自那裡），只覆寫欄數。
 * **更早一版自己刻了一份 label 樣式，畫出來之後 radio 變回瀏覽器預設的
 * 藍點**——同一個面板裡兩種 radio 外觀。共用比重刻安全。
 */
.label-question__minutes {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: calc(var(--space-2) * -1);
  padding: var(--space-3);
  border: 1px solid var(--color-muted);
  border-top: 0;
  border-end-start-radius: var(--radius-sm);
  border-end-end-radius: var(--radius-sm);
  background: var(--color-hairline);
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
