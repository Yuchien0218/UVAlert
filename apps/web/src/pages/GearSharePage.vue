<script setup lang="ts">
import { computed, onMounted, shallowRef } from "vue";
import { useRouter } from "vue-router";
import type { SessionContext } from "@sunshield/contracts";
import { useWebAppServices } from "../app/injection";
import IconButton from "../components/common/IconButton.vue";
import GearShareCard, {
  type GearShareCardData
} from "../components/product/GearShareCard.vue";

/**
 * 「我的防曬裝備」分享頁（階段一）。
 *
 * 計畫見 `docs/superpowers/plans/2026-09-01-gear-share-card.md`。這一階段
 * 只做畫面——做完就已經可用（使用者能自己截圖），也是階段二輸出 PNG、
 * 階段三系統分享唯一的資料來源。
 *
 * **只放使用中的裝備**（2026-09-01 使用者裁決）。收納中的裝備依定義不會
 * 用於新的提醒，印在「我今天用什麼」的卡片上是錯的。
 */

const { boot, productSettings, sessionEvents, uvForecast } =
  useWebAppServices();
const router = useRouter();

/** 價格預設不印（使用者裁決：分享出去等於把消費紀錄給別人看）。 */
const showPrice = shallowRef(false);

onMounted(() => {
  void productSettings.ensureLoaded();
  void sessionEvents.ensureLoaded();
  void uvForecast.ensureLoaded();
});

const activeGear = computed(() =>
  productSettings.products.value.filter(
    (product) => product.archivedAt === null && product.status === "active"
  )
);

/**
 * 主要防曬乳＝使用中、而且**真的能建立倒數**的那一罐。
 *
 * 用 `ruleEligibilityAtApplication` 而不是只看品類：標示沒確認的防曬乳
 * 不會建立倒數，把它印成「主要防曬」會讓收到圖的人以為它正在計時。
 */
const sunscreen = computed(
  () =>
    activeGear.value.find(
      (product) =>
        product.gearCategory === "sunscreen" &&
        product.currentSnapshot.ruleEligibilityAtApplication === "eligible"
    ) ?? null
);

const otherGear = computed(() =>
  activeGear.value.filter(
    (product) => product.productId !== sunscreen.value?.productId
  )
);

/**
 * 進行中提醒的情境。
 *
 * `SessionProjection` 沒有情境欄位，情境在事件流裡：`sessionStarted` 帶
 * `initialContext`，之後的 `context_changed` 會覆蓋它。取最後一次變更，
 * 沒有變更過就用起始值。
 */
const sessionInfo = computed<GearShareCardData["session"]>(() => {
  const projection = boot.currentSession.value;
  const stream = sessionEvents.stream.value;
  if (projection === null || stream?.sessionStarted == null) return null;

  const changes = stream.contextEvents.filter(
    (event) => event.contextType === "context_changed"
  );
  const latest = changes.at(-1);
  const context: SessionContext =
    latest !== undefined && "context" in latest
      ? latest.context
      : stream.sessionStarted.initialContext;

  return { context, startedAt: stream.sessionStarted.effectiveStartedAt };
});

/** 白天看今日、夜間看明日——跟 AppShell 頁首同一條規則。 */
const uvDay = computed(() => {
  const days = uvForecast.forecast.value?.days ?? [];
  if (days.length === 0) return null;
  return uvForecast.isEvening.value ? (days[1] ?? null) : (days[0] ?? null);
});

const cardData = computed<GearShareCardData>(() => ({
  session: sessionInfo.value,
  regionName: uvForecast.region.value?.displayName ?? null,
  uvi: uvDay.value?.uvi ?? null,
  riskLevel: uvDay.value?.riskLevel ?? null,
  sunscreen: sunscreen.value,
  gear: otherGear.value
}));

const hasPrice = computed(() =>
  activeGear.value.some((product) => product.priceTwd !== null)
);

function goBack(): void {
  void router.push({ name: "products" });
}
</script>

<template>
  <div class="page-stack share-page">
    <header class="flow-heading">
      <div>
        <h1 class="page-heading__title" data-typography-role="page-title">
          分享我的防曬裝備
        </h1>
        <p>可以直接截圖分享。價格預設不會印在卡片上。</p>
      </div>
      <IconButton
        icon="tool-arrow-left"
        label="返回我的防曬裝備"
        @click="goBack"
      />
    </header>

    <GearShareCard :data="cardData" :show-price="showPrice" />

    <!--
      價格開關（2026-09-01 使用者裁決：**預設關**）。

      裝備區的價格是私人記帳（2026-08-30 的定位是「記錄買過的防曬乳：期限、
      價格、好不好用」）。把它印進一張要傳給別人的圖，是另一回事——所以
      預設不印，要印是使用者的明確動作。

      沒有任何裝備填過價格時整個開關不出現：一個切了也不會有變化的開關
      只會讓人以為功能壞了。
    -->
    <label v-if="hasPrice" class="share-page__toggle">
      <input v-model="showPrice" type="checkbox" />
      <span>在卡片上顯示價格</span>
    </label>
  </div>
</template>

<style scoped>
.share-page {
  gap: var(--page-stack-gap);
}

.flow-heading p {
  color: var(--text-body);
  line-height: var(--line-height-body);
}

.share-page__toggle {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: var(--tap-target);
  cursor: pointer;
}
</style>
