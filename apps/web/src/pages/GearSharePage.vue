<script setup lang="ts">
import { computed, onMounted, shallowRef } from "vue";
import { useRouter } from "vue-router";
import type { SessionContext } from "@sunshield/contracts";
import { useWebAppServices } from "../app/injection";
import { paintShareCard } from "../features/share/paintShareCard";
import { getUvRiskLevelLabel } from "../features/uv/uvForecastRules";
import { CONTEXT_LABELS } from "../features/setup/setupCatalog";
import { formatFullDate } from "../helpers/datetime";
import IconButton from "../components/common/IconButton.vue";
import Icon from "../components/icons/Icon.vue";
import GearShareCard, {
  type GearShareCardData
} from "../components/product/GearShareCard.vue";

/**
 * 「我的防曬裝備」分享頁。
 *
 * 計畫見 `docs/superpowers/plans/2026-09-01-gear-share-card.md`：階段一是
 * 卡片畫面、階段二輸出 PNG、階段三交給系統分享。畫面上的那張卡是三者
 * 唯一的資料來源——`paintShareCard` 讀的是同一份 `cardData`。
 *
 * **只放使用中的裝備**（2026-09-01 使用者裁決）。收納中的裝備依定義不會
 * 用於新的提醒，印在「我今天用什麼」的卡片上是錯的。
 */

const { boot, productSettings, sessionEvents, share, uvForecast } =
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

/*
 * 階段二、三：輸出 PNG 並交給系統分享。
 *
 * **兩顆按鈕不是二選一。** 「儲存圖片」永遠都在（下載是每個瀏覽器都會的
 * 事）；「分享」只在 Web Share API 真的收得下這個檔案時才出現。先畫圖再
 * 問能不能分享——`canShare({ files })` 要帶著真的那個 file 去問，有些實作
 * 會依 MIME 與大小拒絕。
 */
const busy = shallowRef(false);
const shareError = shallowRef<string | null>(null);
const canShare = shallowRef(false);

async function renderFile(): Promise<File> {
  const blob = await paintShareCard({
    data: cardData.value,
    title: sessionInfo.value === null ? "我的防曬裝備" : "我今天的防曬裝備",
    // 沒有進行中提醒時用今天——這張卡就是今天做出來的。與 GearShareCard
    // 的 dateLabel 同一條規則，兩邊都要有日期（2026-09-02 使用者要求）。
    dateLabel: formatFullDate(
      sessionInfo.value === null
        ? new Date()
        : new Date(sessionInfo.value.startedAt)
    ),
    riskLabel:
      sessionInfo.value !== null && uvDay.value?.riskLevel != null
        ? getUvRiskLevelLabel(uvDay.value.riskLevel)
        : null,
    contextLabel:
      sessionInfo.value?.context == null
        ? null
        : CONTEXT_LABELS[sessionInfo.value.context],
    showPrice: showPrice.value
  });
  return new File([blob], "uvalert-gear.png", { type: "image/png" });
}

async function saveImage(): Promise<void> {
  if (busy.value) return;
  busy.value = true;
  shareError.value = null;
  try {
    const file = await renderFile();
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file.name;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    // 立刻 revoke 會讓部分瀏覽器來不及開始下載（跟 downloadTextFile 一致）。
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    canShare.value = share.canShareFiles(file);
  } catch {
    shareError.value = "圖片沒有產生成功，卡片內容沒有變動，可以再試一次。";
  } finally {
    busy.value = false;
  }
}

async function shareImage(): Promise<void> {
  if (busy.value) return;
  busy.value = true;
  shareError.value = null;
  try {
    const file = await renderFile();
    if (!share.canShareFiles(file)) {
      canShare.value = false;
      shareError.value = "這個瀏覽器不支援直接分享圖片，請改用「儲存圖片」。";
      return;
    }
    const result = await share.shareFile(file, "我的防曬裝備");
    // 使用者按取消不是錯誤，不跳訊息。
    if (result === "failed") {
      shareError.value = "分享沒有完成，圖片已經產生好，可以改用「儲存圖片」。";
    }
  } catch {
    shareError.value = "圖片沒有產生成功，卡片內容沒有變動，可以再試一次。";
  } finally {
    busy.value = false;
  }
}

function goBack(): void {
  void router.push({ name: "products" });
}
</script>

<template>
  <div class="page-stack share-page">
    <header class="flow-heading">
      <div class="share-page__heading-main">
        <!--
          2026-09-02：標題不放圖示（使用者要求）。

          `feature-share` 仍然登記在圖示系統裡，只是這一頁不用它——這頁的
          主體是下方那張卡片預覽，標題再放一個 40px 圖示會多出一個視覺重心。
        -->
        <h1 class="page-heading__title" data-typography-role="page-title">
          分享我的防曬裝備
        </h1>
      </div>
      <IconButton
        icon="tool-arrow-left"
        label="返回我的防曬裝備"
        @click="goBack"
      />
      <!-- 說明橫跨兩欄，不必為圖示鈕讓出寬度（2026-09-03）。 -->
      <p>存成圖片或直接分享你的防曬清單，價格預設不會印在卡片上。</p>
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

    <!--
      **「儲存圖片」是主要動作，「分享」是加分的。** 下載每個瀏覽器都會，
      Web Share API level 2（分享檔案）在桌面幾乎沒有支援——把分享當主要
      動作會讓多數使用者按到一顆不能用的按鈕。

      分享鈕只在畫過一次圖、而且瀏覽器真的收得下那個檔案時才出現：
      `canShare({ files })` 必須帶著真的那個 file 去問。
    -->
    <div class="share-page__actions">
      <!--
        2026-09-02：「儲存圖片」左邊放 `more-install`（使用者指定這一顆）。

        **`mono` 是必要的，不是保險。** 這是雙色圖示，琥珀金在 primary
        按鈕上實測只有 1.58——而琥珀金那一半正是那支箭頭，也就是「下載」
        的語意本體。理由完整版見 Icon.vue 的 mono。

        圖示是裝飾性的——按鈕本身就有可見文字，螢幕閱讀器讀那句就夠了，
        再播報一次圖示的 title 會變成「儲存圖片 儲存圖片」那類重複。

        產生中時圖示不換掉：文字已經從「儲存圖片」變成「產生中…」，
        圖示跟著抽換只會讓按鈕在點下去的瞬間跳一下。
      -->
      <button
        class="button button--primary share-page__save"
        type="button"
        :disabled="busy"
        @click="saveImage"
      >
        <Icon name="more-install" :size="20" mono />
        <span>{{ busy ? "產生中…" : "儲存圖片" }}</span>
      </button>
      <button
        v-if="canShare"
        class="button button--quiet"
        type="button"
        :disabled="busy"
        @click="shareImage"
      >
        分享圖片
      </button>
    </div>

    <p v-if="shareError !== null" class="form-error" role="alert">
      {{ shareError }}
    </p>
  </div>
</template>

<style scoped>
.share-page {
  gap: var(--page-stack-gap);
}

.share-page__heading-main {
  display: grid;
  gap: var(--space-3);
}

/*
 * 2026-09-03：說明的顏色與行高由 app.css 的 `.flow-heading > p` 統一給，
 * 這裡那份逐字重複的覆寫刪掉。
 */

.share-page__actions {
  display: grid;
  gap: var(--space-3);
}

/*
 * 圖示與文字一起置中。`.button` 本身沒有 flex 佈局（它只排文字），所以
 * 這裡補上——不改 `.button` 共用類別，那會影響全站每一顆按鈕。
 */
.share-page__save {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
}

.share-page__toggle {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: var(--tap-target);
  cursor: pointer;
}
</style>
