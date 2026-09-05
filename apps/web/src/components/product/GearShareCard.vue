<script setup lang="ts">
import { computed } from "vue";
import type {
  ProductCatalogRecordV1,
  SessionContext,
  UvRiskLevel
} from "@sunshield/contracts";
import { CONTEXT_LABELS } from "../../features/setup/setupCatalog";
import { getUvRiskLevelLabel } from "../../features/uv/uvForecastRules";
import { formatFullDate } from "../../helpers/datetime";
import BrandLockup from "../shell/BrandLockup.vue";
import Icon from "../icons/Icon.vue";
import { GEAR_CATEGORY_ICONS } from "../../features/product/gearPresentation";

/**
 * 可以截圖／輸出成圖片分享的「我的防曬裝備」卡片。
 *
 * **這是 `--surface-inverse` 的第一個消費者。** DESIGN.md 第十節記著深色
 * 表面體系「規範有效但引用 0 次」，並警告套用需要另外排程——那指的是把
 * 三個既有元件改成深色並重驗對比度。這裡是**全新表面**，不動任何既有
 * 畫面，所以可以低風險地讓它第一次上場。
 *
 * **UV 風險色只能出現在淺色區。** 五個風險色是 2026-08-31 為了暖象牙畫布
 * 才壓暗的，實測在深色卡上只有 2.42–2.93，全部過不了 4.5:1。所以版面刻意
 * 把「今日 UV」放在深色卡外面（使用者提供的 mockup 也是這樣畫的），
 * `gearShareCard.test.ts` 有守門擋住把風險色搬進深色卡。
 *
 * 深色卡上的文字用 `--text-inverse`（13.66）與 `--color-on-dark-soft`
 * （8.86）。**不用琥珀金當標籤**：`#C1832E` 在深色上是 4.49，差 0.01，
 * 跟 2026-08-31 `#956900` 那次是同一種擦邊。
 */

export interface GearShareCardData {
  /** 有進行中的提醒時才有；決定標題與要不要印日期／UV／情境。 */
  session: {
    context: SessionContext | null;
    startedAt: string;
  } | null;
  regionName: string | null;
  uvi: number | null;
  riskLevel: UvRiskLevel | null;
  /** 主要防曬乳；沒有可倒數的防曬乳時是 null。 */
  sunscreen: ProductCatalogRecordV1 | null;
  /** 其餘使用中的裝備。 */
  gear: ProductCatalogRecordV1[];
}

const props = defineProps<{
  data: GearShareCardData;
  /** 價格預設不印（2026-09-01 使用者裁決：分享出去等於公開消費紀錄）。 */
  showPrice?: boolean;
}>();

/**
 * 兩種模式（2026-09-01 使用者裁決）。
 *
 * 沒有進行中的提醒時，這張卡不是「今天」的快照，而是「我平常用什麼」。
 * **這時不印日期，也不印 UV**——一張沒有日期的卡片配一個當下的 UV 值，
 * 傳出去過幾天再看就是錯的。
 */
const isToday = computed(() => props.data.session !== null);

const title = computed(() =>
  isToday.value ? "我今天的防曬裝備" : "我的防曬裝備"
);

/**
 * 卡片日期。
 *
 * **2026-09-02：從右上角搬到頁尾，並且兩種模式都有**（使用者要求把頁尾
 * 那段註記換成日期）。原本只有進行中提醒才顯示，而且在頁首——搬到頁尾之
 * 後如果兩邊都留就會出現兩個日期，所以頁首那個拿掉。
 *
 * 沒有進行中提醒時用「今天」，也就是這張卡被做出來的日子。這比沒有日期
 * 好：分享出去的圖會被轉傳，收到的人需要知道它是什麼時候的清單。
 */
const dateLabel = computed(() => {
  const session = props.data.session;
  return formatFullDate(
    session === null ? new Date() : new Date(session.startedAt)
  );
});

/** 深色卡的價格，跟其他裝備共用同一個 showPrice 開關。 */
const sunscreenPrice = computed(() => {
  const sunscreen = props.data.sunscreen;
  if (props.showPrice !== true || sunscreen === null) return null;
  return sunscreen.priceTwd === null ? null : `NT$ ${sunscreen.priceTwd}`;
});

const showsUv = computed(
  () =>
    isToday.value &&
    props.data.regionName !== null &&
    props.data.uvi !== null &&
    props.data.riskLevel !== null
);

const contextLabel = computed(() => {
  const context = props.data.session?.context ?? null;
  return context === null ? null : CONTEXT_LABELS[context];
});

/**
 * 補擦間隔——**只在包裝真的有寫分鐘數時才印**（2026-09-02 使用者裁決）。
 *
 * 原本沒有明確分鐘數時會印「一般 120 分」。那個 120 是 `reducer.ts` 的
 * `GENERAL_MAX_MINUTES` **系統預設**，不是包裝上寫的——把它印成「規格」
 * 等於把預設值講成產品標示，違反 DESIGN.md 第九節「要顯示資料就顯示真的
 * 資料」。
 *
 * 跟草稿狀態、通知失敗同一條規則：預期內的結果安靜，例外才出聲。
 */
const intervalLabel = computed(() => {
  const minutes =
    props.data.sunscreen?.currentSnapshot.reapplicationIntervalMinutes ?? null;
  return minutes === null ? null : `${minutes} 分`;
});

/**
 * 耐水標示。
 *
 * **這是少數真的會影響倒數的欄位**（`activeWaterDeadline`），原本沒印在
 * 卡片上，反而印了不影響倒數的東西。2026-09-02 補上。
 */
const waterLabel = computed(() => {
  const status = props.data.sunscreen?.currentSnapshot.waterResistanceStatus;
  if (status === "40" || status === "80") return `${status} 分鐘`;
  if (status === "not_water_resistant") return "標示不耐水";
  return null;
});

const FORMULATION_LABELS = {
  lotion: "乳液",
  gel: "凝膠／水感",
  cream: "霜狀",
  spray: "噴霧",
  stick: "防曬棒"
} as const;

const formulationLabel = computed(() => {
  const value = props.data.sunscreen?.formulation ?? null;
  return value === null ? null : FORMULATION_LABELS[value];
});

/** SPF／PA，只印真的有的。 */
const labelLine = computed(() => {
  const snapshot = props.data.sunscreen?.currentSnapshot;
  if (snapshot === undefined) return null;
  const parts: string[] = [];
  if (snapshot.spf !== null) parts.push(`SPF ${snapshot.spf}`);
  if (snapshot.paGrade !== null) parts.push(snapshot.paGrade);
  return parts.length === 0 ? null : parts.join(" ");
});

/**
 * 每件裝備印「名字／價格／尺寸／顏色」（2026-09-01 使用者指定）。
 *
 * 只印有值的——沒填的欄位不留空位，跟 `GearDetailSheet` 同一個作法。
 * 價格另外受 `showPrice` 控制。
 */
function detailsFor(product: ProductCatalogRecordV1): string[] {
  const parts: string[] = [];
  if (props.showPrice === true && product.priceTwd !== null) {
    parts.push(`NT$ ${product.priceTwd}`);
  }
  if (product.size !== null) parts.push(product.size);
  if (product.color !== null) parts.push(product.color);
  return parts;
}
</script>

<template>
  <article class="share-card">
    <!--
      2026-09-02（使用者要求）：拿掉原本自己一列的「標記＋防曬晴報員」
      lockup，改成標題前面只放標記。

      **不放字標是對的**：這一列的標題是「我的防曬裝備」，再擺一次
      「防曬晴報員」等於同一列有兩組中文字在搶第一眼。標記本身已經足夠
      標示來源，而且不會跟標題競爭。

      標記是裝飾性的（aria-hidden 由 BrandLockup 負責）——它旁邊就是可見
      的標題文字，螢幕閱讀器讀那句就夠了。
    -->
    <header class="share-card__masthead">
      <BrandLockup class="share-card__mark" variant="mark" />
      <h2
        class="share-card__title"
        data-typography-role="section-title"
        data-typography-exception="share-card-hero-title"
      >
        {{ title }}
      </h2>
    </header>

    <!--
      地區與 UV 在**淺色區**，不是深色卡裡——五個 UV 風險色在
      `--surface-inverse` 上只有 2.42–2.93，全部過不了 AA。
    -->
    <p v-if="showsUv" class="share-card__meta">
      <span>{{ data.regionName }}</span>
      <span class="share-card__divider" aria-hidden="true">｜</span>
      <span>今日 UV</span>
      <span
        class="share-card__uvi"
        :class="`share-card__uvi--${data.riskLevel}`"
        >{{ data.uvi }}</span
      >
      <span>{{ getUvRiskLevelLabel(data.riskLevel!) }}</span>
    </p>

    <section v-if="data.sunscreen !== null" class="share-card__primary">
      <!--
        品類圖示當深色卡的視覺重心（2026-09-02 使用者要求）。放右上角而
        不是名稱左邊：左邊已經有 eyebrow 在帶路，再放一個圖示會有兩個起點。

        圖示的墨色繼承 --color-on-dark-soft（深色上 8.86）；裡面的琥珀金
        原樣保留，那是圖示配色系統的重點色，而且這是裝飾性圖形、不受
        4.5:1 約束。
      -->
      <Icon
        class="share-card__badge"
        :name="GEAR_CATEGORY_ICONS.sunscreen"
        :size="32"
        decorative
      />
      <p class="share-card__eyebrow">主要防曬</p>
      <p class="share-card__product">{{ data.sunscreen.displayName }}</p>

      <dl class="share-card__stats">
        <div v-if="labelLine !== null">
          <dt>標示</dt>
          <dd>{{ labelLine }}</dd>
        </div>
        <div v-if="intervalLabel !== null">
          <dt>補擦間隔</dt>
          <dd>{{ intervalLabel }}</dd>
        </div>
        <div v-if="waterLabel !== null">
          <dt>耐水</dt>
          <dd>{{ waterLabel }}</dd>
        </div>
        <div v-if="data.sunscreen.volume !== null">
          <dt>容量</dt>
          <dd>{{ data.sunscreen.volume }}</dd>
        </div>

        <div v-if="formulationLabel !== null">
          <dt>劑型</dt>
          <dd>{{ formulationLabel }}</dd>
        </div>
        <div v-if="contextLabel !== null">
          <dt>情境</dt>
          <dd>{{ contextLabel }}</dd>
        </div>
        <!--
          2026-09-02：價格（使用者要求「防曬乳也要可以顯示價格」）。

          跟其他裝備一樣受 showPrice 控制、預設不印——深色卡不是例外。

          **順序必須跟畫布的 buildStats 一致**（那邊 push 在最後）。第一版
          放在「容量」後面，預覽是 容量／價格／劑型、PNG 是 …／情境／價格，
          兩邊排出來不一樣——正是這一批一直在防的漂移。
        -->
        <div v-if="sunscreenPrice !== null">
          <dt>價格</dt>
          <dd>{{ sunscreenPrice }}</dd>
        </div>
      </dl>
    </section>

    <ul v-if="data.gear.length > 0" class="share-card__gear">
      <!--
        每一列前面的品類圖示（2026-09-02 使用者要求）。三個放置點裡最實用
        的一個：圖被縮小之後，不讀字也看得出這一列是防曬乳、太陽眼鏡、
        衣物還是其他。
      -->
      <li v-for="item in data.gear" :key="item.productId">
        <Icon
          :name="GEAR_CATEGORY_ICONS[item.gearCategory]"
          :size="24"
          decorative
        />
        <span class="share-card__gear-text">
          <strong>{{ item.displayName }}</strong>
          <span v-if="detailsFor(item).length > 0">{{
            detailsFor(item).join("・")
          }}</span>
        </span>
      </li>
    </ul>

    <!--
      2026-09-02：頁尾改成日期（使用者要求）。

      **原本這裡是安全註記**，而那段在 DESIGN.md 第五節的「不可隱藏」清單
      裡。移除是使用者的裁決，理由與代價記在
      `docs/decisions/2026-09-02-share-card-footer-date.md`——這裡只留指標，
      不要在註解裡另立一份說法。

      UV 出處（中央氣象署）跟著那段一起消失了。資料集代號 F-D0047-091 本來
      就已被 2026-09-02 的在地化稽核判定為對一般人無意義，所以沒有沿用。
    -->
    <footer class="share-card__footer">
      <p class="share-card__date">{{ dateLabel }}</p>
    </footer>
  </article>
</template>

<style scoped>
/*
 * 卡片底色跟頁面同色（`--color-canvas`），所以要一條 hairline 才讀得出
 * 「這一塊就是等一下會被分享出去的那張圖」——沒有邊框時它跟頁面融成一片。
 */
.share-card {
  display: grid;
  gap: var(--space-4);
  padding: var(--sheet-padding);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-canvas);
}

/*
 * 標記與標題同一列。
 *
 * 用 center 而不是 baseline：標記是圖形沒有文字基線，baseline 對齊會讓它
 * 掉到標題下緣。標記高度綁在標題的行高上（1em），這樣改字級時兩者一起動。
 */
.share-card__masthead {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

/*
 * 跟頁首同一個 `BrandLockup` 元件，尺寸由呼叫端決定（元件本身不設 height，
 * 這樣兩個使用點可以各自決定份量）。
 */
/*
 * flex: none 不是保險——flex 子項預設可壓縮，標記被壓縮就是變形
 * （跟 IconLead 那條註解同一個理由）。
 */
.share-card__mark {
  height: 1em;
  width: auto;
  flex: none;
  font-size: var(--font-size-page-title);
}

/* 2026-09-02：靠右（使用者要求）。 */
.share-card__date {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
  font-variant-numeric: tabular-nums;
  text-align: end;
}

.share-card__title {
  margin: 0;
  font-family: var(--font-family-page-title);
  font-size: var(--font-size-page-title);
  letter-spacing: var(--letter-spacing-page-title);
}

.share-card__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--space-2);
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-supporting);
}

.share-card__divider {
  color: var(--border-strong);
}

/*
 * 風險色只出現在這裡（淺色區）。搬進深色卡就會掉到 2.4–2.9，
 * `gearShareCard.test.ts` 有守門擋著。
 */
.share-card__uvi {
  font-size: var(--font-size-section-title);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.share-card__uvi--low {
  color: var(--color-uvi-low);
}
.share-card__uvi--moderate {
  color: var(--color-uvi-moderate);
}
.share-card__uvi--high {
  color: var(--color-uvi-high);
}
.share-card__uvi--very_high {
  color: var(--color-uvi-very-high);
}
.share-card__uvi--extreme {
  color: var(--color-uvi-extreme);
}

/* 深色卡：DESIGN.md 第十節的深色表面體系首次落地。 */
.share-card__primary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: var(--space-2);
  padding: var(--sheet-padding);
  border-radius: var(--radius-md);
  background: var(--surface-inverse);
  color: var(--text-inverse);
}

/*
 * 標籤用 on-dark-soft（8.86）而不是琥珀金——`#C1832E` 在這個底色上是
 * 4.49，差 0.01 過不了 AA。跟 2026-08-31 `#956900`→`#946800` 同一種擦邊。
 */
/*
 * 圖示佔右欄、跨 eyebrow 與名稱兩列；規格網格在底下用回整個寬度。
 * grid 子項預設可壓縮，圖示被壓縮就是變形——所以 flex: none。
 */
.share-card__badge {
  grid-column: 2;
  grid-row: 1 / span 2;
  flex: none;
  color: var(--color-on-dark-soft);
}

.share-card__eyebrow {
  grid-column: 1;
  margin: 0;
  color: var(--color-on-dark-soft);
  font-size: var(--font-size-caption);
  font-weight: 500;
}

.share-card__product {
  grid-column: 1;
  margin: 0;
  font-size: var(--font-size-section-title);
  line-height: var(--line-height-section-title);
}

/*
 * 2026-09-02：從 flex-wrap 改成 auto-fit grid。
 *
 * 欄位數是變動的（1–5，看使用者填了什麼）。flex-wrap 時第二列的起點跟著
 * 內容寬度跑，跟第一列對不齊——實測四欄時第一列撐滿、第二列擠在左邊。
 * grid 讓每一列的欄位落在同一組縱向格線上，接近 mockup 的樣子，而且欄位
 * 增減時不會重新排出奇怪的斷點。
 *
 * **6rem 不是隨手挑的**：375px 下這個 dl 的可用寬度是 238px、欄距 16px，
 * 兩欄的上限就是 (238-16)/2 = 111px ≈ 6.9rem。第一版寫 7rem，實測直接掉回
 * 單欄——四個欄位變成四列，比改動前更糟。留一點餘裕取 6rem。
 */
.share-card__stats {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(6rem, 1fr));
  gap: var(--space-3) var(--space-4);
  margin: 0;
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-on-dark-soft);
}

.share-card__stats dt {
  margin: 0 0 var(--space-1);
  color: var(--color-on-dark-soft);
  font-size: var(--font-size-caption);
}

.share-card__stats dd {
  margin: 0;
  font-weight: 500;
}

.share-card__gear {
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

/*
 * 圖示垂直置中於整格，不是對齊第一行——一列有沒有第二行（尺寸／顏色）
 * 是變動的，對齊文字會讓有無細節的兩列圖示高度不一致。
 */
.share-card__gear li {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--color-hairline);
}

/*
 * 2026-09-02：從 --text-secondary 提到 --text-body（使用者回報「文字顏色
 * 偏淡」）。
 *
 * 實測是真的：同一顆 --text-secondary 在畫布上是 5.92，但這些方塊的底色是
 * --color-hairline，**對比掉到 4.63**——過 AA 但只剩 0.13 餘裕。同一個 token
 * 換了背景就掉一階，這是「底色變深」造成的，不是字級問題。
 */
.share-card__gear-text {
  display: grid;
  gap: var(--space-1);
  min-width: 0;
}

.share-card__gear-text span {
  color: var(--text-body);
  font-size: var(--font-size-caption);
}

.share-card__footer {
  padding-top: var(--space-3);
  border-top: 1px solid var(--border-subtle);
}

.share-card__footer p {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
  line-height: var(--line-height-body);
}
</style>
