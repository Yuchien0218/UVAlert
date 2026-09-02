<script setup lang="ts">
import { computed } from "vue";
import type {
  ProductCatalogRecordV1,
  SessionContext,
  UvRiskLevel
} from "@sunshield/contracts";
import { CONTEXT_LABELS } from "../../features/setup/setupCatalog";
import { getUvRiskLevelLabel } from "../../features/uv/uvForecastRules";
import { formatDate } from "../../helpers/datetime";
import BrandLockup from "../shell/BrandLockup.vue";

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

const dateLabel = computed(() => {
  const session = props.data.session;
  if (session === null) return null;
  return formatDate(new Date(session.startedAt));
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

/** 包裝標示上的補擦間隔；沒有明確分鐘數時就是一般間隔。 */
const intervalLabel = computed(() => {
  const snapshot = props.data.sunscreen?.currentSnapshot;
  if (snapshot === undefined) return null;
  const minutes = snapshot.reapplicationIntervalMinutes;
  return minutes === null ? "一般 120 分" : `${minutes} 分`;
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
    <header class="share-card__masthead">
      <BrandLockup class="share-card__lockup" />
      <span v-if="dateLabel !== null" class="share-card__date">{{
        dateLabel
      }}</span>
    </header>

    <h2
      class="share-card__title"
      data-typography-role="section-title"
      data-typography-exception="share-card-hero-title"
    >
      {{ title }}
    </h2>

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
        <div v-if="contextLabel !== null">
          <dt>情境</dt>
          <dd>{{ contextLabel }}</dd>
        </div>
      </dl>
    </section>

    <ul v-if="data.gear.length > 0" class="share-card__gear">
      <li v-for="item in data.gear" :key="item.productId">
        <strong>{{ item.displayName }}</strong>
        <span v-if="detailsFor(item).length > 0">{{
          detailsFor(item).join("・")
        }}</span>
      </li>
    </ul>

    <!--
      安全註記與 UV 出處。這一段在 DESIGN.md 第五節的「不可隱藏」清單裡，
      分享出去的圖更需要它——收到圖的人沒有這個 App 的脈絡。
    -->
    <footer class="share-card__footer">
      <p>
        這是協助記得補擦的紀錄，不是安全曝曬時間或防護效果保證。<template
          v-if="showsUv"
          >UV 資料來源：中央氣象署 F-D0047-091。</template
        >
      </p>
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

.share-card__masthead {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
}

/*
 * 跟頁首同一個 `BrandLockup` 元件，尺寸由呼叫端決定（元件本身不設 height，
 * 這樣兩個使用點可以各自決定份量）。
 */
.share-card__lockup {
  height: 1.4rem;
  width: auto;
  flex: 0 0 auto;
}

.share-card__date {
  font-variant-numeric: tabular-nums;
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
.share-card__eyebrow {
  margin: 0;
  color: var(--color-on-dark-soft);
  font-size: var(--font-size-caption);
  font-weight: 500;
}

.share-card__product {
  margin: 0;
  font-size: var(--font-size-section-title);
  line-height: var(--line-height-section-title);
}

.share-card__stats {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3) var(--space-6);
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

.share-card__gear li {
  display: grid;
  gap: var(--space-1);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--color-hairline);
}

.share-card__gear span {
  color: var(--text-secondary);
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
