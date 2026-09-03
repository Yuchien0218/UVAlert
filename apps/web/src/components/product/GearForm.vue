<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from "vue";
import type { GearCategory } from "@sunshield/contracts";
import { useWebAppServices } from "../../app/injection";
import Icon from "../icons/Icon.vue";
import ProductSnapshotEditor from "./ProductSnapshotEditor.vue";
import {
  makeSessionOnlyProductSnapshot,
  productSnapshotToFormValue,
  type ProductSnapshotFormValue
} from "../../features/setup/productSnapshot";
import {
  affectsCountdown,
  GEAR_CATEGORY_ICONS,
  GEAR_CATEGORY_LABELS,
  GEAR_CATEGORY_REMINDER_EFFECT,
  gearSafetyState
} from "../../features/product/gearPresentation";
import { parseSpfInput } from "../../features/product/parseSpfInput";

/**
 * S-12 新增防曬裝備／S-13 編輯防曬裝備的表單本體。
 *
 * **2026-08-23 從 `GearFormPage.vue` 抽出**，理由是 Sitemap §2.2：「開始
 * 提醒設定採同一流程內完成，不因產品標示、部位調整或通知設定跳離到
 * 平行頁面；必要的調整以同頁區塊或 sheet 呈現。」原本 `SetupTimingPage`
 * 的「改為填寫完整的防曬乳包裝標示」會整頁 `router.push` 到
 * `/products/new`，違反這條規則。
 *
 * 抽出後這個元件不知道自己在頁面裡還是 sheet 裡——不做任何 router
 * 呼叫，成功用 emit 讓外層決定要導頁還是關閉 sheet。取消／關閉的入口
 * 不在這裡，屬於外殼（頁面頁首或 sheet 標題列）。
 * `GearFormPage.vue`（獨立頁）與 `GearFormSheet.vue`（設定流程內嵌）
 * 共用同一份邏輯，不重複維護兩份表單驗證與品類規則。
 */

const props = defineProps<{ productId: string | null }>();
const emit = defineEmits<{
  saved: [];
}>();

const { productSettings } = useWebAppServices();

const isEdit = computed(() => props.productId !== null);

/**
 * 價格輸入轉成 schema 要的非負整數，轉不成就當成沒填。
 *
 * 刻意不用 `type="number"`：Vue 的 v-model 對 number input 會自動轉型，
 * 空字串會變成 undefined 而不是 ""，後面的判斷就得多一層——SPF 那個欄位
 * 2026-08-24 就踩過這個坑（見下方註解）。`text` ＋ `inputmode="numeric"`
 * 一樣會跳數字鍵盤，也避開滾輪誤改值。
 */
function parsePriceTwd(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const value = Number(trimmed);
  if (!Number.isInteger(value) || value < 0) return null;
  return value;
}

/**
 * 暱稱的預設值。
 *
 * 2026-08-30 使用者要求「預設先輸入名字（例：未命名防曬乳）」。用實值而
 * 不是 placeholder，因為 placeholder 不會被送出——暱稱是必填，空著就會
 * 被 `validate()` 擋下來，而多數人根本不在意這罐叫什麼。
 *
 * 跟著品類走（未命名防曬乳／未命名防曬衣物／…），但**只在使用者還沒
 * 自己命名時**才換：`isDefaultName()` 判斷目前的值是不是某個品類的預設
 * 名，是才跟著改。手動改過的名字不會被品類切換蓋掉。
 */
function defaultDisplayName(category: GearCategory): string {
  return `未命名${GEAR_CATEGORY_LABELS[category]}`;
}

function isDefaultDisplayName(name: string): boolean {
  return Object.values(GEAR_CATEGORY_LABELS).some(
    (label) => name === `未命名${label}`
  );
}

const gearCategory = shallowRef<GearCategory>("sunscreen");
const displayName = ref(defaultDisplayName("sunscreen"));
const purchaseMonth = ref("");
const expiryDate = ref("");
const note = ref("");
/*
 * 2026-08-30 新增的兩個純紀錄欄位（規格見
 * docs/superpowers/specs/2026-08-30-gear-simplification-design.md）。
 * 兩者都不進 reducer——packages/domain 對它們零引用。
 */
const priceTwd = ref("");
const usageRating = shallowRef<"good" | "ok" | "bad" | "">("");
/**
 * SPF／PA 只用來辨識「這罐是哪一罐」，**不影響倒數**——
 * `packages/domain` 對這兩個欄位零引用，倒數長度由包裝標示裡的
 * 補擦間隔決定。以字串保存輸入，儲存時才轉型與驗證。
 */
const spfInput = ref("");
const paGradeInput = ref("");

const snapshotForm = ref<ProductSnapshotFormValue>({
  claimAnswer: "yes",
  waitAnswer: "none",
  waitMinutes: null,
  intervalAnswer: "none",
  intervalMinutes: null,
  waterResistance: "unknown"
});
const size = ref("");
const color = ref("");
/*
 * 2026-09-02：防曬乳專屬的三個純紀錄欄位（使用者裁決的取捨）。
 *
 * 提案原本有 11 項，只採用這三個。刪掉的兩類：Broad Spectrum 與 BOOTS
 * 星級（台灣市售包裝幾乎不標，欄位會永遠空著）、海洋友善／不易致粉刺／
 * 低敏（那些是**產品宣稱不是規格**，讓使用者自己勾再印到分享圖上，等於
 * 這個 App 幫忙散布未經驗證的宣稱）。
 */
const volume = ref("");
const formulation = shallowRef<
  "lotion" | "gel" | "cream" | "spray" | "stick" | ""
>("");
const protectionType = shallowRef<"physical" | "chemical" | "hybrid" | "">("");
const localError = shallowRef<string | null>(null);
const confirmingDelete = shallowRef(false);

/**
 * 「我的紀錄」的收合狀態。
 *
 * 新增時預設收合——那五個欄位在建檔當下多半還不知道（價格要翻收據、
 * 「好不好用」在用之前根本不可能知道）。編輯時一律展開，因為那時通常
 * 已經有值，把既有資料藏起來沒有道理。
 */
const recordExpanded = shallowRef(false);
const recordOpen = computed(() => isEdit.value || recordExpanded.value);

const existing = computed(() =>
  props.productId === null
    ? null
    : (productSettings.products.value.find(
        (product) => product.productId === props.productId
      ) ?? null)
);

/**
 * 品類不可任意變更（S-13）。已被既有事件引用的 sunscreen 改成純紀錄品類，
 * 會讓既有倒數失去產品依據。需要改品類時另建新紀錄。
 */
const categoryLocked = computed(
  () => isEdit.value && existing.value?.gearCategory === "sunscreen"
);

const needsLabelFields = computed(
  () => gearCategory.value === "sunscreen" || gearCategory.value === "clothing"
);
const showSunscreenFields = computed(() => gearCategory.value === "sunscreen");

/*
 * 尺寸與顏色只對有這個概念的品類顯示（2026-09-01 使用者指定）：
 * 防曬衣物與其他裝備兩者都有、太陽眼鏡只有顏色、防曬乳兩者都沒有。
 */
const showsSize = computed(
  () => gearCategory.value === "clothing" || gearCategory.value === "other_gear"
);
const showsColor = computed(() => gearCategory.value !== "sunscreen");

/* 容量／劑型／防護機制是防曬乳才有的概念。 */
const showsSunscreenSpecs = computed(
  () => gearCategory.value === "sunscreen"
);

const safety = computed(() =>
  existing.value === null ? null : gearSafetyState(existing.value)
);
const isArchived = computed(
  () =>
    existing.value !== null &&
    (existing.value.archivedAt !== null || existing.value.status === "stopped")
);
const canRestore = computed(
  () => isArchived.value && safety.value?.kind !== "blocked"
);

onMounted(async () => {
  await productSettings.ensureLoaded();
  const record = existing.value;
  if (record === null) return;
  gearCategory.value = record.gearCategory;
  displayName.value = record.displayName;
  purchaseMonth.value = record.purchaseMonth ?? "";
  expiryDate.value = record.expiryDate ?? "";
  note.value = record.note ?? "";
  priceTwd.value = record.priceTwd === null ? "" : String(record.priceTwd);
  usageRating.value = record.usageRating ?? "";
  snapshotForm.value = productSnapshotToFormValue(record.currentSnapshot);
  spfInput.value =
    record.currentSnapshot.spf === null
      ? ""
      : String(record.currentSnapshot.spf);
  paGradeInput.value = record.currentSnapshot.paGrade ?? "";
  size.value = record.size ?? "";
  color.value = record.color ?? "";
  volume.value = record.volume ?? "";
  formulation.value = record.formulation ?? "";
  protectionType.value = record.protectionType ?? "";
});

/*
 * 品類換了就換預設名，但只在使用者還沒自己命名的時候。
 *
 * 編輯既有裝備時完全不動——那是使用者已經取好的名字，即使它剛好長得像
 * 預設名（例如他真的把某罐取名叫「未命名防曬乳」）也一樣。
 */
watch(gearCategory, (next) => {
  if (props.productId !== null) return;
  if (!isDefaultDisplayName(displayName.value)) return;
  displayName.value = defaultDisplayName(next);
});

function validate(): string | null {
  if (displayName.value.trim().length === 0) {
    return "請輸入這件裝備的暱稱。";
  }
  if (
    purchaseMonth.value !== "" &&
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(purchaseMonth.value)
  ) {
    return "購買月份格式須為 YYYY-MM。";
  }
  if (
    expiryDate.value !== "" &&
    !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate.value)
  ) {
    return "到期日格式須為 YYYY-MM-DD。";
  }
  /*
   * schema 要求 spf 為正數、paGrade 長度 1–20；先擋住再 parse，否則 Zod 會
   * 丟例外而不是回到表單上的錯誤訊息。
   *
   * **只在防曬乳品類才驗證**（2026-08-31 複查補上）。這兩個欄位只對
   * sunscreen 渲染，save() 也只在 showSunscreenFields 時寫入；但驗證原本
   * 不分品類，所以「先填了 SPF、再把品類改成太陽眼鏡」會被一個**畫面上
   * 根本不存在的欄位**擋住存檔，錯誤訊息還指著看不到的東西。
   */
  if (
    showSunscreenFields.value &&
    parseSpfInput(spfInput.value) === "invalid"
  ) {
    return "SPF 請填寫大於 0 的數字，例如 50。";
  }
  if (showSunscreenFields.value && paGradeInput.value.trim().length > 20) {
    return "PA 標示請控制在 20 個字以內。";
  }
  return null;
}

async function save(): Promise<void> {
  localError.value = validate();
  if (localError.value !== null) return;

  // 非 sunscreen 品類不保留只對 sunscreen 有意義的標示答案，
  // 避免存下一組看起來會影響倒數、實際不會的資料。
  // SPF／PA 跟其他標示欄位一樣只對 sunscreen 有意義，
  // 非防曬乳品類不保留，避免存下看起來有意義、實際不會被用到的資料。
  // validate() 已經擋掉 "invalid"，這裡只會拿到 null 或數字。
  const parsedSpf = parseSpfInput(spfInput.value);
  const spf = parsedSpf === "invalid" ? null : parsedSpf;
  const paGrade =
    paGradeInput.value.trim() === "" ? null : paGradeInput.value.trim();

  const formValue: ProductSnapshotFormValue = showSunscreenFields.value
    ? { ...snapshotForm.value, spf, paGrade }
    : {
        claimAnswer: needsLabelFields.value
          ? snapshotForm.value.claimAnswer
          : "no",
        waitAnswer: "unknown",
        waitMinutes: null,
        intervalAnswer: "unknown",
        intervalMinutes: null,
        waterResistance: "unknown",
        spf: null,
        paGrade: null
      };

  const saved = await productSettings.saveProduct({
    displayName: displayName.value.trim(),
    gearCategory: gearCategory.value,
    snapshot: makeSessionOnlyProductSnapshot(
      formValue,
      new Date().toISOString()
    ),
    purchaseMonth: purchaseMonth.value === "" ? null : purchaseMonth.value,
    expiryDate: expiryDate.value === "" ? null : expiryDate.value,
    note: note.value.trim() === "" ? null : note.value.trim(),
    priceTwd: parsePriceTwd(priceTwd.value),
    usageRating: usageRating.value === "" ? null : usageRating.value,
    // 品類不適用時一律存 null，避免留下看起來有意義、實際不會顯示的資料。
    size: showsSize.value && size.value.trim() !== "" ? size.value.trim() : null,
    color:
      showsColor.value && color.value.trim() !== "" ? color.value.trim() : null,
    volume:
      showsSunscreenSpecs.value && volume.value.trim() !== ""
        ? volume.value.trim()
        : null,
    formulation:
      showsSunscreenSpecs.value && formulation.value !== ""
        ? formulation.value
        : null,
    protectionType:
      showsSunscreenSpecs.value && protectionType.value !== ""
        ? protectionType.value
        : null,
    productId: props.productId ?? undefined
  });

  if (!saved) {
    // 儲存失敗時保留表單，不返回列表（S-12）。
    localError.value =
      "資料沒有儲存，這件裝備尚未寫入。輸入仍會保留，可以再試一次。";
    return;
  }

  emit("saved");
}

async function archive(): Promise<void> {
  if (props.productId === null) return;
  if (await productSettings.archiveProduct(props.productId)) {
    emit("saved");
  }
}

async function restore(): Promise<void> {
  if (props.productId === null) return;
  if (await productSettings.restoreProduct(props.productId)) {
    emit("saved");
  }
}

async function remove(): Promise<void> {
  if (props.productId === null) return;
  if (await productSettings.deleteProduct(props.productId)) {
    emit("saved");
  }
}
</script>

<template>
  <div class="gear-form">
    <!--
      2026-08-30：拿掉 `app-card`，比照 `ContextSelector`（設定流程的「選擇
      情境」）。原本是 `question-card app-card` 外框再包四個各自有邊框的
      `.category-option`，等於**卡片包卡片**——tile 自己已經是可點的表面，
      外面再加一層邊框只是多一圈線。ContextSelector 的 fieldset 是
      `border: 0; padding: 0`，只有 tile 一層，這裡對齊它。
    -->
    <fieldset class="category-fieldset">
      <legend>裝備分類</legend>
      <p v-if="categoryLocked" class="question-card__helper">
        防曬乳無法變更分類。若需更改，請新增裝備。
      </p>
      <div class="category-grid">
        <label
          v-for="(label, category) in GEAR_CATEGORY_LABELS"
          :key="category"
          class="category-option"
          :class="{
            'category-option--disabled':
              categoryLocked && category !== 'sunscreen'
          }"
        >
          <input
            v-model="gearCategory"
            type="radio"
            name="gear-category"
            :value="category"
            :disabled="categoryLocked && category !== 'sunscreen'"
          />
          <Icon :name="GEAR_CATEGORY_ICONS[category]" :size="32" />
          <!--
            2026-08-31 改回常駐。前一版讓文字只在選取後顯示（未選取時走
            `.screen-reader-only`），使用者回饋「很像消失」——四個只有圖示
            的方塊要靠猜，而「太陽眼鏡」與「帽子」的圖示辨識度本來就沒有
            高到可以不標名字。選取狀態已經有底色與外框在表達，不需要再用
            「只有我有文字」當第二個訊號。
          -->
          <span>{{ label }}</span>
        </label>
      </div>
      <p class="category-effect" role="status">
        {{ GEAR_CATEGORY_REMINDER_EFFECT[gearCategory] }}
      </p>
    </fieldset>

    <section class="app-card">
      <label for="gear-name">裝備暱稱</label>
      <input
        id="gear-name"
        v-model="displayName"
        type="text"
        maxlength="80"
        placeholder="例如：通勤用防曬"
      />
      <!--
        2026-08-31（選項丙）：SPF／PA 搬進包裝標示之後，這句只講暱稱。
        原本它同時罩著暱稱與 SPF／PA，所以寫成「這些」。
      -->
      <p class="field-helper">即使同名，系統會視為不同裝備。</p>
    </section>

    <ProductSnapshotEditor
      v-if="needsLabelFields"
      v-model="snapshotForm"
      :water-context="showSunscreenFields"
      :sunscreen-fields="showSunscreenFields"
      collapsible
      :prefilled="isEdit"
      eyebrow="包裝標示"
      title="防曬乳規格確認"
      :description="
        showSunscreenFields
          ? '請依包裝標示填寫。'
          : '衣物只需要確認身分；沒有會影響倒數的標示欄位。'
      "
    >
      <!--
        2026-08-31（選項丙）：SPF／PA 從「裝備暱稱」卡搬到這裡。
        SPF 這個字原本在兩張卡各出現一次——這裡問「有沒有防曬標示」、
        暱稱卡填「SPF 數字是多少」，畫面上看不出兩者的差別（2026-08-30
        稽核記過）。搬進來之後所有跟包裝有關的事都在同一張卡裡。

        描述文案跟著改：原本寫「以下欄位會影響補擦倒數」，現在這張卡裡
        多了兩個**不影響**倒數的欄位，那句話會變成錯的。改成只講「依包裝
        填寫」，「不影響倒數」由這一組自己標明。
      -->
      <template #identity>
        <div v-if="showSunscreenFields" class="app-card identity-fields">
          <p class="field-helper">
            下面兩欄只用來認出是哪一罐，<strong>不影響補擦倒數</strong>。
          </p>
          <div class="field-pair">
            <div>
              <label for="gear-spf">SPF（選填）</label>
              <!--
                刻意不用 type="number"：Vue 的 v-model 對 number input 會
                自動轉型成 number，spfInput 就不再是字串，後面的 .trim()
                會直接丟 TypeError 讓儲存靜默失敗（2026-08-24 實測抓到）。
                text + inputmode 同樣會跳數字鍵盤，也避開滾輪誤改值。
              -->
              <!--
                placeholder 補上（2026-09-03）：PA 那欄一直有 `PA++++`，
                SPF 卻什麼提示都沒有，兩欄並排一邊有一邊沒有。

                值是 `50` 而不是瓶身上的 `50+`：`inputmode="numeric"` 的
                數字鍵盤**打不出加號**，拿它當範例等於示範一個在手機上做不到
                的動作。加號改由 `parseSpfInput()` 容錯（貼上或桌機打得出來）。
              -->
              <input
                id="gear-spf"
                v-model="spfInput"
                type="text"
                inputmode="numeric"
                maxlength="4"
                placeholder="50"
              />
            </div>
            <div>
              <label for="gear-pa">PA（選填）</label>
              <input
                id="gear-pa"
                v-model="paGradeInput"
                type="text"
                maxlength="20"
                placeholder="PA++++"
              />
            </div>
          </div>
        </div>
      </template>
    </ProductSnapshotEditor>


    <!--
      2026-08-30：這一張從「散落的選填欄位」升級成有名字的區塊「我的紀錄」。
      使用者裁決：「裝備區只是記錄買過的防曬乳（期限、價格、好不好用）」
      ——那三件事在這裡，所以它值得一個標題，而不是躺在包裝標示後面。

      2026-08-31（選項甲）：**只在編輯時出現**。新增流程砍掉這一整塊。
      理由不是版面而是時序——新增一瓶防曬乳時，使用者知道的只有名字與
      品類；購買月份、價格要翻收據，而「好不好用」在用之前**不可能**
      知道，等於一個永遠只能選「未評價」的下拉。這些是回頭補的資料，
      詳情頁的「編輯」才是它們的自然位置。

      2026-08-31 修正：**整塊藏掉做過頭了**。使用者實際用過之後回報「日期、
      價格、備註都不見了」——不只防曬乳，四個品類都受影響。改成新增流程
      仍然看得到這張卡，只是**預設收合**：東西沒有消失，想填就展開，高度
      節省也留住大部分。編輯時直接展開，因為那時通常已經有值。

      這同時解掉前一版的副作用：到期日是這塊裡唯一會進 reducer 的欄位，
      現在新增當下就填得到，不必先存檔再進編輯頁。
    -->
    <section class="app-card" aria-labelledby="gear-record-title">
      <h2 id="gear-record-title" data-typography-role="card-title">我的紀錄</h2>
      <p class="field-helper">選填項目，僅儲存於本機。</p>

      <!--
        揭露契約（DESIGN.md 第五節）：真的 <button>、aria-expanded ＋
        aria-controls 齊備，chevron 換圖示 name 而不是 transform: rotate。
      -->
      <button
        v-if="!isEdit"
        class="button button--quiet record-toggle"
        type="button"
        :aria-expanded="recordOpen"
        aria-controls="gear-record-fields"
        @click="recordExpanded = !recordExpanded"
      >
        <Icon
          :name="recordOpen ? 'tool-chevron-down' : 'tool-chevron-right'"
          :size="20"
        />
        {{ recordOpen ? "收合購買紀錄" : "補上購買紀錄（選填）" }}
      </button>

      <div v-show="recordOpen" id="gear-record-fields" class="record-fields">
      <div class="field-pair">
        <div>
          <label for="gear-purchase">購買月份</label>
          <input id="gear-purchase" v-model="purchaseMonth" type="month" />
        </div>
        <div>
          <label for="gear-expiry">
            到期日
            <span v-if="affectsCountdown(gearCategory)" class="affects-badge">
              會影響倒數
            </span>
          </label>
          <input id="gear-expiry" v-model="expiryDate" type="date" />
        </div>
      </div>
      <p v-if="affectsCountdown(gearCategory)" class="field-helper">
        逾期後將禁止建立補擦倒數。
      </p>

      <div class="field-pair">
        <div>
          <label for="gear-price">購入價格</label>
          <!--
            刻意不用 type="number"，理由同上方 SPF 欄位：v-model 對 number
            input 會自動轉型，空字串會變成 undefined。
          -->
          <input
            id="gear-price"
            v-model="priceTwd"
            type="text"
            inputmode="numeric"
            maxlength="7"
          />
        </div>
        <div>
          <label for="gear-rating">使用評價</label>
          <select id="gear-rating" v-model="usageRating">
            <option value="">未評價</option>
            <option value="good">好用</option>
            <option value="ok">普通</option>
            <option value="bad">不好用</option>
          </select>
        </div>
      </div>

      <!--
        2026-09-01：尺寸與顏色（分享卡要印，使用者裁決）。

        **只對有這個概念的品類顯示**：防曬衣物與其他裝備有尺寸與顏色、
        太陽眼鏡只有顏色、**防曬乳兩者都沒有**——它的識別資訊是 SPF／PA。
        限制做在表單層而不是 schema 層：schema 不該假設使用者的分類習慣，
        而且欄位是選填的，硬擋只會讓資料進不來。

        自由文字而不是 S／M／L／XL：歐碼、數字碼、Free Size 都真實存在。
      -->
      <div v-if="showsSize || showsColor" class="field-pair">
        <div v-if="showsSize">
          <label for="gear-size">尺寸</label>
          <input id="gear-size" v-model="size" type="text" maxlength="20" />
        </div>
        <div v-if="showsColor">
          <label for="gear-color">顏色</label>
          <input id="gear-color" v-model="color" type="text" maxlength="20" />
        </div>
      </div>

      <!--
        2026-09-02：防曬乳的容量／劑型／防護機制（使用者裁決）。

        **放在「我的紀錄」而不是「包裝標示」卡**，即使這三項都印在瓶身上。
        判準是「會不會影響倒數」——它們都不會，所以跟價格、尺寸同一層。
        放進包裝標示那組會改到 `ProductLabelSnapshotV1`，而
        `snapshotFingerprint` 是由 snapshot 算出來的，加欄位會讓既有產品的
        fingerprint 全部變掉，等於每一罐都變成「另一罐」。
      -->
      <template v-if="showsSunscreenSpecs">
        <div class="field-pair">
          <div>
            <label for="gear-volume">包裝容量</label>
            <input
              id="gear-volume"
              v-model="volume"
              type="text"
              maxlength="20"
              placeholder="60ml"
            />
          </div>
          <div>
            <label for="gear-formulation">劑型</label>
            <select id="gear-formulation" v-model="formulation">
              <option value="">未填寫</option>
              <option value="lotion">乳液</option>
              <option value="gel">凝膠／水感</option>
              <option value="cream">霜狀</option>
              <option value="spray">噴霧</option>
              <option value="stick">防曬棒</option>
            </select>
          </div>
        </div>

        <label for="gear-protection-type">防護機制</label>
        <select id="gear-protection-type" v-model="protectionType">
          <option value="">未填寫</option>
          <option value="physical">物理性</option>
          <option value="chemical">化學性</option>
          <option value="hybrid">混合型</option>
        </select>
        <p class="field-helper">
          依包裝標示填寫，不從膚感推測。這三項只是紀錄，不影響補擦倒數。
        </p>
      </template>

      <label for="gear-note">備註</label>
      <textarea id="gear-note" v-model="note" maxlength="500" rows="3" />
      <p class="field-helper">勿填寫個人醫療、用藥或敏感個資。</p>
      </div>
    </section>

    <p v-if="localError" class="form-error" role="alert">{{ localError }}</p>

    <button
      class="button button--primary"
      type="button"
      :disabled="productSettings.phase.value === 'saving'"
      @click="save"
    >
      {{ productSettings.phase.value === "saving" ? "儲存中…" : "儲存" }}
    </button>

    <!--
      取消動作只留 emit，不在這裡放按鈕——外殼（頁面頁首或 sheet 標題列）
      已經有自己的取消／關閉入口，重複放會變成同一個畫面兩個取消按鈕。
    -->

    <section v-if="isEdit" class="app-card danger-zone">
      <h2 data-typography-role="card-title">使用狀態</h2>

      <p v-if="safety && safety.kind === 'blocked'" class="form-error">
        {{ safety.detail }}同配方的新批次請另建一筆新紀錄，不要用恢復繞過。
      </p>

      <button
        v-if="canRestore"
        class="button button--quiet"
        type="button"
        @click="restore"
      >
        恢復使用
      </button>
      <button
        v-else-if="!isArchived"
        class="button button--quiet"
        type="button"
        @click="archive"
      >
        移至收納
      </button>

      <template v-if="!confirmingDelete">
        <button
          class="button button--quiet"
          type="button"
          @click="confirmingDelete = true"
        >
          刪除這筆紀錄
        </button>
      </template>
      <template v-else>
        <p class="form-error" role="alert">
          刪除後，曾經使用這件裝備的設定會失去參照；既有提醒紀錄中的包裝標示不會被改寫。確定要刪除嗎？
        </p>
        <button class="button button--primary" type="button" @click="remove">
          刪除這筆裝備
        </button>
        <button
          class="button button--quiet"
          type="button"
          @click="confirmingDelete = false"
        >
          取消
        </button>
      </template>
    </section>
  </div>
</template>

<style scoped>
.gear-form {
  display: grid;
  gap: var(--space-4);
}

.app-card {
  display: grid;
  gap: var(--space-3);
  padding: var(--card-padding);
}

h2,
p {
  margin: 0;
}

.field-helper {
  color: var(--text-secondary);
  line-height: var(--line-height-body);
  font-size: var(--font-size-supporting);
}

/*
 * 2×2，不是 3 欄。域模型的 GearCategory 只有 4 個值，放進 3 欄會讓
 * 第二排只剩一個孤兒、右邊空 2/3（2026-08-24 使用者截圖指出）。
 * 高保真稿用 3 欄是因為它的品類陣列有 6 個（多了帽子與陽傘），
 * 抄版面時要一併核對項目數量。
 */
/*
 * 2026-08-30：品類選擇不再是卡片，比照 ContextSelector 的 fieldset——
 * 沒有邊框與內距，tile 自己就是那層表面。
 */
.category-fieldset {
  display: grid;
  gap: var(--space-3);
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

/*
 * 用 canonical 的 card-title，不是 .question-card 那份複製過來的
 * --font-size-title-sm——後者是 B8 遷移前的舊字級桶，typographyRoles
 * 的守門測試會擋（app.css 裡的原版不在掃描範圍所以沒被抓到）。
 */
.category-fieldset legend {
  float: left;
  width: 100%;
  margin: 0;
  padding: 0;
  font-size: var(--font-size-card-title);
  font-weight: var(--font-weight-card-title);
}

.category-fieldset legend + * {
  clear: both;
  margin-top: var(--space-stack-title-body);
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-2);
}

.category-option {
  position: relative;
  display: grid;
  justify-items: center;
  gap: var(--space-2);
  min-height: 4.75rem;
  padding: var(--space-3) var(--space-1);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  text-align: center;
  font-size: var(--font-size-caption);
  cursor: pointer;
}

/*
 * 2026-09-01：改用共用的「已選取」外觀（使用者要求統一）。
 *
 * 這裡原本是 `--color-primary` 邊框 ＋ `--color-surface-cream-strong` 底，
 * 是全站**唯一**自己刻選取樣式的地方——其餘九個使用點與所有 `.choice-grid`
 * 都走 app.css 的 `.option-selected`（`--color-muted` 邊框 ＋
 * `--color-hairline` 底）。同一個表單裡因此有兩種「被選中」的長相。
 *
 * **選共用那組而不是把共用那組改成這組**，兩個理由：
 *
 *   1. 一比九。
 *   2. `--color-primary` 是**行動色**（按鈕、連結）。拿它當選取狀態的邊框，
 *      等於讓「這裡可以按」跟「這個已經選了」共用一個訊號。
 *
 * 視覺強度幾乎沒有損失：兩種底色對卡片的對比是 1.20 與 1.26，差別在色相
 * 不在明度；邊框反而更清楚（muted 5.56 vs primary 4.37，SC 1.4.11 門檻 3:1）。
 */
.category-option:has(input:checked) {
  border-color: var(--color-muted);
  background: var(--color-hairline);
}

.category-option--disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.category-option input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}

/*
 * 原本用 var(--surface-raised, transparent)，但 --surface-raised 從未
 * 在 packages/ui/src/styles.css 定義過 → 落到 transparent，於是這段
 * 白白比上面的 legend 與格子多縮 12px，卻看不出為什麼要縮。改用實際
 * 存在的 surface-soft，讓內距有對應的底色支撐。
 */
.category-effect {
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--color-surface-soft);
  color: var(--text-secondary);
  line-height: var(--line-height-body);
}

/*
 * 2026-08-30：`.no-effect-note` 整張卡已移除，樣式跟著刪。
 *
 * 那張 124px 的卡只為了說「這件裝備不會建立補擦倒數」，而品類選擇格下方
 * 的 `.category-effect` 已經在講同一件事（`GEAR_CATEGORY_REMINDER_EFFECT`
 * 對 eyewear／other_gear 就是「只做紀錄，不會影響補擦倒數。」）。同一個
 * 畫面、相距兩個區塊、講同一件事，其中一個還佔整張卡。
 *
 * `GearCategorySchema` 的註解要求「UI 必須明示這件事——使用者記錄一副
 * 墨鏡時不得以為提醒行為會改變」。刪掉整張卡之後這個責任由
 * `.category-effect` 單獨承擔——它貼著品類選擇，是做決定的當下會看的
 * 位置。GearForm.test.ts 有守門測試釘住它。
 */

/*
 * inline-block + nowrap 缺一不可：欄位改成兩欄並排後寬度減半，
 * 原本的 inline span 一換行邊框就從中間斷開（「會」留在框內、
 * 「影響倒數」跑到框外）。改成整塊不可分割，放不下就整顆換行。
 */
/*
 * 2026-08-30：套用 --color-amber。DESIGN.md 第二節指定它的用途是「徽章、
 * SPF 標記、陽光母題」，但它先前是全站唯一從未被引用的 accent 之一（見
 * 2026-08-30-unused-declaration-audit.md）。這顆徽章標的正是「這個欄位
 * 會影響補擦倒數」，在 SPF／到期日旁邊，是那個用途最貼的落點。
 *
 * **底色而不是文字色**：amber 當文字放在畫布上只有 2.07:1，遠低於 AA 的
 * 4.5；深咖文字放在 amber 底上是 6.41:1。這與 DESIGN.md 對同族的
 * accent-apricot 寫的「此色上必須用深咖文字」是同一條規則。
 *
 * 邊框一併移除——有實底色之後再加深色邊框會變成兩層框。
 */
.affects-badge {
  display: inline-block;
  padding: 0 var(--space-2);
  border-radius: var(--radius-pill);
  background: var(--color-amber);
  color: var(--text-primary);
  font-size: var(--font-size-caption);
  white-space: nowrap;
}

.field-pair label {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}

.field-pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.field-pair > div {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
}

/*
 * 兩欄的 label 行數不一定相同（到期日多一顆「會影響倒數」徽章，
 * 窄欄時會掉成兩行）。把輸入框推到欄底，兩個框才會對齊——否則
 * 修好徽章反而換來輸入框高低不齊。
 */
.field-pair > div > input {
  margin-top: auto;
}

/* 欄位在格線裡要撐滿自己那一欄，否則 date/month 這類原生控制項
   會用瀏覽器預設寬度，兩欄看起來一長一短。 */
.field-pair input,
.field-pair select {
  width: 100%;
}

/* 欄位外觀改用 app.css 的共用宣告，這裡不再抄一份。 */
/*
 * 2026-08-31（選項丙）：SPF／PA 搬進包裝標示卡之後，需要一層自己的
 * 表面把「純辨識」跟上面「會影響倒數」的問題分開，否則它們會讀成
 * 同一組。
 */
.identity-fields {
  display: grid;
  gap: var(--space-3);
  padding: var(--card-padding);
}

/*
 * 2026-08-31：「我的紀錄」在新增流程改成收合。觸發器沿用包裝標示那顆
 * quiet 按鈕的形狀，兩處揭露看起來是同一種東西。
 */
.record-toggle {
  justify-self: start;
}

.record-fields {
  display: grid;
  gap: var(--space-3);
}

.danger-zone {
  justify-items: start;
}

.danger-zone h2 {
  font-size: var(--font-size-card-title);
}
</style>
