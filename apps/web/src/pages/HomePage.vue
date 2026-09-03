<script setup lang="ts">
import type { ActionKind } from "@sunshield/contracts";
import { computed, nextTick, onMounted, shallowRef, watch } from "vue";
import { useRouter } from "vue-router";
import Icon from "../components/icons/Icon.vue";
import RecentEventsList from "../components/reminder/RecentEventsList.vue";
import ZoneStatusList from "../components/reminder/ZoneStatusList.vue";
import type { SecondaryActionKind } from "../features/reminder/reminderPresentation";
import HomeCountdown from "../components/home/HomeCountdown.vue";
import HomeLocationPrompt from "../components/home/HomeLocationPrompt.vue";
import HomeNightNotice from "../components/home/HomeNightNotice.vue";
import HomeNightSession from "../components/home/HomeNightSession.vue";
import HomeUvHeadline from "../components/home/HomeUvHeadline.vue";
import BroadcastLoader from "../components/feedback/BroadcastLoader.vue";
import SessionEndControl from "../components/session/SessionEndControl.vue";
import { useCurrentTime } from "../composables/useCurrentTime";
import { buildHomeReminderClockPresentation } from "../features/reminder/homeReminderClockPresentation";
import { buildReminderPresentation } from "../features/reminder/reminderPresentation";
import { showsWaterActivityEntry } from "../features/reminder/waterActivityEntry";
import { useWebAppServices } from "../app/injection";
import {
  resolveActionDestination,
  resolveActionRoute
} from "../helpers/resolveActionRoute";

/**
 * 提醒主頁——App 的首屏，五個狀態共用同一個版面骨架。
 *
 * 版面依 2026-08-23 的 wireframe 重做（見 `docs/decisions/
 * 2026-08-23-wireframe-copy-fixes.md`）。與先前實作最關鍵的差異是**資訊
 * 層級對調**：UV 資料從下方的「戶外資訊」卡片提到首屏頂端，倒數與主 CTA
 * 緊接其後，次要入口一律降級成細分隔線連結，不再是同重量的卡片
 * （DESIGN.md 第六節「避免每一塊內容都變成同重量的卡片」）。
 *
 * 五個狀態與各自的主要行動：
 *
 * | 狀態 | 主要行動 |
 * | --- | --- |
 * | 有提醒＋白天 | 記錄補擦 |
 * | 有提醒＋夜間 | 結束提醒（收工版面：不顯示倒數，改顯示已進行多久） |
 * | 無提醒＋白天＋有地區 | 開始防曬提醒 |
 * | 無提醒＋夜間 | 無主 CTA（理由見 HomeNightNotice） |
 * | 無提醒＋無地區 | 設定地區 |
 *
 * 夜間版面的反覆：2026-08-23 裁決夜間走「收工版面」（HomeNightSession：
 * 不顯示倒數與進度條，改顯示已進行多久，主要行動是結束提醒——夜間 UV
 * 為 0，倒數到下次補擦沒有行動價值）。2026-08-24 一度推翻改為日夜共用
 * （commit 47f44c6），2026-08-26 使用者確認**改回收工版面**，理由是
 * 「不讓倒數跨夜」。見
 * docs/decisions/2026-08-26-night-session-layout-revert.md。
 * **沒有提醒**的夜間行為從頭到尾不受影響，仍然沒有主 CTA。
 */

const { boot, sessionControl, sessionEvents, productSettings, uvForecast } =
  useWebAppServices();

/** `view_product_label` 的原地展開；規格語意是「正在等待，不要離開」。 */
const productLabelExpanded = shallowRef(false);
const clockNotice = shallowRef<string | null>(null);

/**
 * `view_conservative_reminder` 的原地展開。
 *
 * **2026-09-03：這顆按鈕原本會跳到 `/help/how-it-works`，而那頁的內容仍在審查，
 * 只顯示「內容正在審查」——在最需要說明的狀態下給一頁空白。**
 *
 * 改成在原地展開說明。內容只講 App 自己的行為（時間對不上、間隔已縮短、
 * 恢復連線後會自己好），不含任何防曬建議或時間長度，所以不受衛教審查閘門管轄。
 */
const shortenedIntervalExplained = shallowRef(false);
const recentEventsRef = shallowRef<{ expand?: () => void } | null>(null);

/**
 * 時鐘可信度來自 reducer 的 reason code，不是連線狀態——
 * 離線不必然表示時鐘不可信，兩者是獨立訊號。
 */
const clockTrusted = computed(
  () =>
    !(boot.currentSession.value?.primaryAction.reasonCodes ?? []).includes(
      "CLOCK_UNTRUSTED"
    )
);
const router = useRouter();
const currentTime = useCurrentTime();

onMounted(() => {
  void uvForecast.ensureLoaded();
  // 完整狀態（部位、最近紀錄）併進本頁後，這兩份資料也要在這裡載入。
  if (boot.currentSession.value !== null) {
    void sessionEvents.ensureLoaded();
    void productSettings.ensureLoaded();
  }
});

// Session 換人或剛建立時重讀事件流，否則清單會停留在上一個 Session。
watch(
  () => boot.currentSession.value?.sessionId ?? null,
  (sessionId, previous) => {
    if (sessionId !== null && sessionId !== previous) {
      void sessionEvents.refresh();
    }
  }
);

const session = computed(() => boot.currentSession.value);
const hasSession = computed(() => session.value !== null);
const isNight = computed(() => uvForecast.isEvening.value);
const hasRegion = computed(() => uvForecast.region.value !== null);

const forecastDays = computed(() => uvForecast.forecast.value?.days ?? []);

/** 依本地日期挑預報。offset 0 是今天、1 是明天。 */
function findDay(offsetDays: number) {
  const target = new Date(currentTime.value);
  target.setDate(target.getDate() + offsetDays);
  const key = [
    target.getFullYear(),
    String(target.getMonth() + 1).padStart(2, "0"),
    String(target.getDate()).padStart(2, "0")
  ].join("-");
  return forecastDays.value.find((day) => day.localDate === key) ?? null;
}

const today = computed(() => findDay(0));
const tomorrow = computed(() => findDay(1));

/**
 * 夜間顯示明日預報，白天顯示今日。
 *
 * 夜間看「今天的 UV」沒有行動價值——今天已經過完了。使用者晚上會想知道
 * 的是明天要不要防曬。
 */
const headlineDay = computed(() =>
  isNight.value ? tomorrow.value : today.value
);

const headlineEyebrow = computed(() =>
  isNight.value ? "明日 UV 預報" : "今日 UV"
);

/**
 * 標題右側的註記。
 *
 * 白天寫「地區預報」——資料是地區預報不是即時測站觀測，必須講清楚，這是
 * `copy-audit.md` 既有的規則。wireframe 原本的「12:00 最強」已移除：CWA
 * 的 `F-D0047-091` 沒有尖峰時段欄位，寫出來會是捏造的。
 *
 * 夜間改成今明對比，這個可以由兩天的 uvi 實際算出來。
 */
const headlineNote = computed<string | null>(() => {
  /*
   * 2026-08-31：白天不再顯示「地區預報」（使用者要求）。
   *
   * 那四個字沒有資訊量——這個 App 顯示的 UV 本來就只有地區預報一種來源，
   * 標註它等於在說「這是資料」。夜間那一支留著：「明天比今天高 1」是
   * 實際算出來的比較，不是標籤。
   */
  if (!isNight.value) return null;

  const todayUvi = today.value?.uvi;
  const tomorrowUvi = tomorrow.value?.uvi;
  if (todayUvi === undefined || tomorrowUvi === undefined) return null;

  const diff = tomorrowUvi - todayUvi;
  if (diff === 0) return "與今天相同";
  return diff > 0 ? "明天比今天高 " + diff : "明天比今天低 " + -diff;
});

/**
 * 水上活動的入口（2026-09-03，階段三）。
 *
 * **下水／離水從「記錄狀況」的選單搬到這裡。** 那張清單原本混著兩種不同
 * 的東西：四種損耗把期限拉到事件發生的那一刻（記錄完就到期），下水／離水
 * 則是開關一段水中區間、改由耐水標示決定期限——連「記錄完接下來要做什麼」
 * 都相反。
 *
 * 階段二把記錄狀況降成補擦流程裡的出口之後更明顯：想記一筆下水得先走
 * 「記錄補擦 → 現在還不能補擦 → 從清單裡挑下水」，而下水根本不是補擦流程
 * 的一部分。
 *
 * **首頁刻意不判斷「現在在不在水裡」。**
 *
 * 第一版讓這顆按鈕跟著投影算出的 `inWater` 換文字（開始水上活動／已離水），
 * 實機一測就壞了：預設路徑（沒填包裝標示）的 `ruleEligibilityAtApplication`
 * 是 `identity_unconfirmed`，reducer 的水上區間分支要求 `eligible`，所以
 * **投影裡完全沒有這段區間的痕跡**——`activeWaterDeadline` 是 null、
 * `reasonCodes` 也沒有 `WATER_RESISTANCE_UNKNOWN`。按鈕會一直寫「開始水上
 * 活動」，而帶著 `kind=water_start` 進去又會因為已有區間而找不到對應選項，
 * 等於**離水永遠按不到**。
 *
 * 知道有沒有進行中區間的是 repository（`openWaterInterval`），那是記錄狀況
 * 那一頁的 controller 才拿得到的東西。所以這裡只送出「使用者要處理水上
 * 活動」，由那一頁決定現在該給下水還是離水。
 */
/**
 * 只在情境是水上活動、或已經有進行中的水中區間時顯示（2026-09-03 裁決）。
 *
 * 使用者回報「選水上活動以外的也會出現」。判斷從事件流來，不是投影——
 * 情境與進行中的區間投影裡都沒有，理由見 `waterActivityEntry.ts`。
 */
const showsWaterEntry = computed(() =>
  showsWaterActivityEntry(sessionEvents.stream.value)
);

function handleWaterActivity(): void {
  void router.push({ name: "reminder-report", query: { kind: "water" } });
}

const clockPresentation = computed(() => {
  if (session.value === null) return null;
  return buildHomeReminderClockPresentation(session.value, currentTime.value);
});

const reminderPresentation = computed(() => {
  if (session.value === null) return null;
  return buildReminderPresentation({
    primaryAction: session.value.primaryAction,
    zones: session.value.zones,
    connectivity: boot.connectivity.value,
    now: currentTime.value
  });
});

/**
 * 主行動按鈕要不要出現。
 *
 * **不變式：畫面上永遠恰好有一個可按的行動。**
 *
 * **2026-09-03（階段二）：首頁的「剛才有流汗嗎？」提問卡已移除，所以這裡
 * 不再有「提問卡與主 CTA 二選一」的分支——主 CTA 永遠顯示。**
 *
 * 那張卡是 2026-08-30 把記錄狀況從主 CTA 降級時留下的獨立入口。
 * `2026-09-02-event-means-reapply.md` 的原則是「遇到了事件＝需要補擦」，
 * 記錄狀況因此從一個並列的目的地降成補擦流程裡的出口
 * （`ReapplyReasonPicker` 的「現在還不能補擦，先記錄狀況」）。
 * 它仍然會在**真的是主行動時**當主 CTA 出現（例如遮蔽狀態下補擦不適用）。
 *
 * 歷史：第一版的隱藏條件寫成「actionKind 是 report_context_event 就隱藏」，
 * 在「到期又是記錄狀況」時會讓提問卡與 CTA 同時消失，被既有守門接住。
 * 現在整個分支都不存在了，那個坑跟著消失。
 */
const showPrimaryCta = computed(() => {
  const presentation = reminderPresentation.value;
  if (presentation === null) return false;
  return true;
});

/**
 * S-07 的動作分派。
 *
 * 2026-08-24：`/reminder` 併入本頁後改用 resolveActionDestination——
 * 原本只用 resolveActionRoute（一律導頁），但完整狀態現在就在同一頁下方，
 * 「錨點到部位」「展開包裝標示」這類原地行為不該再跳頁。這是 2026-08-06
 * 裁決「13 個 ActionKind 不新增畫面」的落點。
 */
function handleAction(kind: ActionKind): void {
  const destination = resolveActionDestination(kind);
  if (destination.kind === "route") {
    void router.push(destination.to);
    return;
  }

  switch (destination.behavior) {
    case "anchor_zones":
      void scrollToZones();
      return;
    case "expand_product_label":
      productLabelExpanded.value = true;
      return;
    case "recalibrate_clock":
      // 校準子系統尚未實作（platform 沒有對應 port）。
      // 明講現況勝過靜默失敗或假裝已校準。
      clockNotice.value =
        "目前無法在這台裝置上校準時間。請確認系統時間後重新整理。";
      return;
    case "explain_shortened_interval":
      shortenedIntervalExplained.value = true;
      return;
    default:
      return;
  }
}

async function handleSecondaryAction(kind: SecondaryActionKind): Promise<void> {
  switch (kind) {
    case "view_saved_records":
      // 紀錄就在本頁下方；離開頁面反而失去脈絡，所以錨點並展開。
      recentEventsRef.value?.expand?.();
      await nextTick();
      globalThis.document
        .querySelector("#recent-events")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    case "view_handling_guidance":
      // 不得預先帶入症狀、產品名稱或任何使用者輸入（S-07 裁決附註）。
      void router.push({ name: "special-situation" });
      return;
    default:
      void router.push(resolveActionRoute(kind as ActionKind));
      return;
  }
}

async function scrollToZones(): Promise<void> {
  await nextTick();
  globalThis.document
    .querySelector("#zone-status")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function handleCorrectEvent(eventId: string): void {
  void router.push({
    name: "reminder-event-correct",
    params: { id: eventId }
  });
}

function handleStartSetup(): void {
  void router.push("/setup");
}

function handleEndSession(): void {
  const current = session.value;
  if (current === null) return;
  void sessionControl.endCurrentSession(current);
}
</script>

<template>
  <div class="page-stack home">
    <!--
      首頁依 wireframe 沒有可見的頁面標題——版面直接從 UV 資料開始。
      但每一頁仍需要一個 h1，否則螢幕閱讀器的標題導覽在這一頁是空的。
      舊版的 h1 在 HomeReminderSummary 裡，拆掉那個元件時一併消失了。
    -->
    <h1 class="screen-reader-only" data-typography-role="page-title">提醒</h1>

    <section
      v-if="
        boot.phase.value === 'opening_database' ||
        boot.phase.value === 'restoring_session'
      "
      class="home-state home-state--loading"
      role="status"
    >
      <BroadcastLoader label="正在讀取這台裝置上的提醒" />
      <p>正在讀取這台裝置上的提醒…</p>
    </section>

    <section
      v-else-if="boot.phase.value === 'error'"
      class="home-state"
      role="alert"
    >
      <h2 data-typography-role="section-title">無法讀取提醒</h2>
      <p>原有資料不會被空白內容取代，請重新讀取。</p>
      <button
        class="button button--primary"
        type="button"
        @click="boot.ensureBooted"
      >
        重新讀取
      </button>
    </section>

    <!--
      夜間＋提醒進行中：收工版面（2026-08-26 使用者確認改回，見檔頭註解）。
      主要行動是結束提醒，不是補擦——夜間 UV 為 0，繼續倒數沒有行動價值，
      但系統不自動結束，決定權在使用者（Sitemap §4.2）。刻意不顯示倒數與
      進度條，改由 HomeNightSession 顯示「已進行多久」。部位清單不放進這個
      分支，維持「夜間是收工版面」的設計。
    -->
    <template v-else-if="hasSession && isNight">
      <!--
        2026-08-31：結束鈕與夜間摘要併成同一列。

        原本結束鈕自己佔 page-stack 的一列，下面才是「提醒仍在進行」——
        實測內容上方憑空多出 64px（44px 的按鈕 ＋ 20px 的 page-stack
        gap），而那一列左邊什麼都沒有。使用者回報「右上角叉叉還是會跑版」
        並附了這一頁的截圖。

        白天那一支（下面的 home__session-head）2026-08-30 就已經是兩欄，
        夜間這一支漏掉了——同一個版型分兩處寫，只改了一處。現在共用同一
        個 class，align-items: start 讓叉叉與「提醒仍在進行」那行齊平。
      -->
      <div class="home__session-head">
        <HomeNightSession :session="session!" />

        <SessionEndControl
          :phase="sessionControl.endPhase.value"
          :error="sessionControl.endError.value"
          @confirm="handleEndSession"
          @reset-error="sessionControl.clearEndError"
        />
      </div>

      <!-- 夜間也看得到最近紀錄（S-10 事件更正的唯一入口）。 -->
      <RecentEventsList
        id="recent-events"
        ref="recentEventsRef"
        :zones="session!.zones"
        :events="sessionEvents.stream.value"
        :clock-trusted="clockTrusted"
        @correct="handleCorrectEvent"
      />
    </template>

    <!-- 白天＋提醒進行中：日間完整版面（倒數、主 CTA、部位清單、最近紀錄）。 -->
    <template v-else-if="hasSession">
      <!--
        2026-08-24：白天也要能結束提醒。`/reminder` 併入本頁時漏掉了——
        那頁本來一直有結束控制，白天分支沒補上等於白天沒辦法結束。
      -->
      <!--
        2026-08-30：結束鈕與倒數併成同一列。原本它自成一列、`justify-self:
        end`，於是首屏頂端 88px 只放了一個 44px 的按鈕（實測 390×844：
        main 頂端 y=72、按鈕 y=96、倒數區塊 y=160）——那是首屏最貴的位置。

        用 grid 兩欄而不是 slot：倒數有 `v-if`，塞進 slot 的話 clockPresentation
        為 null 時結束鈕會跟著消失。兩欄的寫法讓按鈕在任何情況下都還在，
        而且 `align-items: start` 讓它與倒數的 eyebrow「補擦倒數」齊平。
      -->
      <div class="home__session-head">
        <HomeCountdown
          v-if="clockPresentation !== null"
          :presentation="clockPresentation"
        />

        <SessionEndControl
          :phase="sessionControl.endPhase.value"
          :error="sessionControl.endError.value"
          @confirm="handleEndSession"
          @reset-error="sessionControl.clearEndError"
        />
      </div>

      <button
        v-if="showPrimaryCta && reminderPresentation !== null"
        class="button button--primary home__cta"
        type="button"
        @click="handleAction(reminderPresentation.actionKind)"
      >
        {{ reminderPresentation.actionLabel }}
      </button>

      <!--
        水上活動的入口（2026-09-03，階段三）。
        文字連結不是按鈕：它不是「你現在該做的事」，是狀態改變時才用得到。
      -->
      <button
        v-if="showsWaterEntry"
        class="text-link home__water"
        data-typography-role="body"
        type="button"
        @click="handleWaterActivity"
      >
        <Icon name="context-water" :size="20" />
        水上活動（下水／離水）
      </button>

      <!--
        主行動之外的次要動作（查看已存紀錄、處理指引等）。原本只有
        /reminder 的 ReminderPanel 顯示它們，首頁明明已經算出同一份
        presentation 卻只取 actionLabel，等於少了一半的操作。
      -->
      <div
        v-if="
          reminderPresentation !== null &&
          reminderPresentation.secondaryActions.length > 0
        "
        class="home__secondary-actions"
      >
        <button
          v-for="secondary in reminderPresentation.secondaryActions"
          :key="secondary.kind"
          class="button button--quiet"
          type="button"
          @click="handleSecondaryAction(secondary.kind)"
        >
          {{ secondary.label }}
        </button>
      </div>

      <p v-if="clockNotice" class="inline-notice" role="status">
        {{ clockNotice }}
      </p>

      <!--
        view_conservative_reminder：原地展開。
        只描述 App 的行為，不給防曬建議，也不提任何時間長度。
      -->
      <section
        v-if="shortenedIntervalExplained"
        class="shortened-interval app-card"
        aria-labelledby="shortened-interval-title"
      >
        <h2 id="shortened-interval-title" data-typography-role="section-title">
          為什麼間隔變短？
        </h2>
        <p>
          這台裝置的時間和實際時間對不上，而且目前無法連線確認，所以無法確定你上次擦防曬乳到現在過了多久。
        </p>
        <p>
          遇到這種情況，提醒一律往「早一點」的方向走——寧可提醒你太多次，也不會因為時間算錯而讓你曬太久。
        </p>
        <p>
          恢復連線、或把裝置的系統時間調正之後，提醒間隔會自己回到正常。
        </p>
      </section>

      <!-- view_product_label：原地展開，語意是「正在等待，不要離開」 -->
      <section
        v-if="productLabelExpanded && productSettings.snapshot.value"
        class="product-label app-card"
        aria-labelledby="product-label-title"
      >
        <h2 id="product-label-title" data-typography-role="section-title">
          目前防曬乳的包裝標示
        </h2>
        <ul>
          <li>
            {{
              productSettings.snapshot.value.preExposureWaitStatus ===
                "explicit_minutes" &&
              productSettings.snapshot.value.preExposureWaitMinutes !== null
                ? `擦上後需等待 ${productSettings.snapshot.value.preExposureWaitMinutes} 分鐘`
                : "包裝沒有寫擦上後要等多久"
            }}
          </li>
          <li>
            {{
              productSettings.snapshot.value.reapplicationIntervalStatus ===
                "explicit_minutes" &&
              productSettings.snapshot.value.reapplicationIntervalMinutes !==
                null
                ? `包裝標示的補擦間隔為 ${productSettings.snapshot.value.reapplicationIntervalMinutes} 分鐘`
                : "包裝沒有寫明補擦間隔"
            }}
          </li>
        </ul>
        <button
          class="button button--quiet"
          type="button"
          @click="productLabelExpanded = false"
        >
          收合
        </button>
      </section>

      <HomeUvHeadline
        :eyebrow="headlineEyebrow"
        :uvi="headlineDay?.uvi ?? null"
        :risk-level="headlineDay?.riskLevel ?? null"
        :note="headlineNote"
      />

      <!--
        2026-08-24：「五日 UV 預報」入口移到頁首右上角的 UV 指數
        （點下去就是 /forecast），這裡不再重複一個入口。
      -->

      <!--
        2026-08-24：完整狀態併入首頁下半部（原 /reminder，已移除）。
        首屏維持「倒數＋主 CTA＋UV」不捲動就看完；部位與最近紀錄放在
        下面，需要細節的人往下捲即可，不必再跳到另一頁。
      -->
      <ZoneStatusList
        id="zone-status"
        :primary-action="session!.primaryAction"
        :zones="session!.zones"
      />
      <RecentEventsList
        id="recent-events"
        ref="recentEventsRef"
        :zones="session!.zones"
        :events="sessionEvents.stream.value"
        :clock-trusted="clockTrusted"
        @correct="handleCorrectEvent"
      />
    </template>

    <!-- 以下都是沒有提醒進行中的狀態。 -->
    <template v-else>
      <HomeUvHeadline
        :eyebrow="headlineEyebrow"
        :uvi="headlineDay?.uvi ?? null"
        :risk-level="headlineDay?.riskLevel ?? null"
        :note="headlineNote"
      />

      <!--
        沒有地區就沒有 UV 可看，先解決這件事——但**不擋開始提醒**。

        2026-08-31 修正：原本這三塊是 v-if／v-else-if／v-else 一條鏈，
        於是沒設定地區的人**看不到「開始防曬提醒」那顆按鈕**，等於地區
        變成開始倒數的前置條件。那既違反 Sitemap §一「定位或網路不足時
        仍不得阻擋本機倒數與手動操作」，也違反 HomeLocationPrompt 自己
        docblock 寫的「刻意不阻擋任何其他操作」——實作跟兩份規格都相反。

        地區只影響「看不看得到 UV」，不影響倒數：補擦間隔由包裝標示或
        120 分鐘保守值決定，UV 高低從來不會延長或縮短它（/forecast 那頁
        也是這樣寫的）。所以提示卡改成獨立顯示，CTA 照常出現。

        夜間那一支維持替換 CTA——那是 2026-08-23 的裁決，而且它自己帶了
        「還是要開始提醒」的逃生出口，沒有把人擋死。
      -->
      <HomeLocationPrompt v-if="!hasRegion" />

      <!-- 夜間不放主 CTA，改用說明加逃生出口。 -->
      <HomeNightNotice v-if="isNight" @start="handleStartSetup" />

      <button
        v-else
        class="button button--primary home__cta"
        type="button"
        @click="handleStartSetup"
      >
        開始防曬提醒
      </button>

      <!--
        2026-08-24：這裡原本有兩個次要入口，現在都沒了，連 <nav> 空殼一起
        移除。
        - 「查看最近紀錄」連到 /reminder：該頁已併入本頁，且沒有提醒進行中
          時事件流本來就查不到東西（事件流只查得到目前 session）。
        - 「五日 UV 預報」：入口移到頁首右上角的 UV 指數，點它就是 /forecast。
      -->
    </template>

    <p class="safety-note">
      這是協助你記得補擦的提醒，不是安全曝曬時間或防護效果保證。
    </p>
  </div>
</template>

<style scoped>
/*
 * 2026-08-30 補回：這兩個 class 的樣式在 51026aa（2026-08-24「/reminder
 * 併入首頁」）時遺失——模板搬過來了，但 scoped 樣式留在被刪除的
 * ReminderPage.vue 裡。兩者在畫面上掛著 class 卻沒有任何規則。
 *
 * .product-label 只剩 .app-card，而 .app-card 只提供邊框／圓角／底色、
 * 沒有 padding，所以內容會貼著邊框。
 *
 * 行高改用 token（原本寫死 1.7），對齊 2026-08-30 的行高收斂。
 */
.inline-notice {
  margin: 0;
  padding: var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--surface-soft);
  color: var(--text-secondary);
  line-height: var(--line-height-body);
}

.product-label {
  display: grid;
  justify-items: start;
  gap: var(--space-3);
  padding: var(--card-padding);
}

/* 水上活動入口：貼齊左緣、保有可點區高度。 */
.home__water {
  justify-self: start;
  min-height: var(--tap-target);
}

.shortened-interval {
  display: grid;
  gap: var(--space-3);
  padding: var(--card-padding);
}

.shortened-interval h2 {
  margin: 0;
  font-size: var(--font-size-section-title);
}

.shortened-interval p {
  margin: 0;
  color: var(--text-body);
  line-height: var(--line-height-body);
}

/*
 * 首屏要在不捲動的情況下顯示 UV、下一步與主 CTA（DESIGN.md 第四節：
 * 「單一畫面要在不捲動的情況下顯示倒數、狀態與下一步」），所以整體間距
 * 比其他頁緊湊，並用 spacer 把安全提示壓到底部。
 *
 * 2026-08-30 後續：這個 20px 原本是三檔位之外的具名例外，因為當時的預設
 * 是 24px。同日把預設收緊到 20px（選項乙）之後，首頁的值就跟預設一模
 * 一樣，例外不再存在——改用 --page-stack-gap，算出來的數值沒有變。
 */
.home {
  gap: var(--page-stack-gap);
}

/*
 * 2026-08-30：倒數與結束鈕併列。`align-items: start` 讓 44px 的按鈕貼齊
 * 倒數頂端（也就是「補擦倒數」那一行），而不是被拉到整塊的垂直中線。
 * 第一欄用 minmax(0, 1fr)，倒數裡的大讀數才不會把按鈕擠出容器。
 */
/*
 * 結束鈕疊在右上角，而不是自己佔一欄（2026-09-03，使用者回報倒數下面那行
 * 說明「莫名其妙換行」並猜是叉叉造成的——**是**）。
 *
 * 改動前這裡是 `minmax(0, 1fr) auto` 兩欄：叉叉只有 44px 高，卻讓**整個
 * 倒數區塊**（eyebrow、數字、進度條、下面那行說明）都被壓到 280px。實測
 * 375px 視窗：可用 336px、倒數只拿到 280px，少掉的 56px 正好夠讓
 * 「建議優先補擦：手背・預計 15:52」折成兩行。
 *
 * 改成單欄重疊：兩個子元素放在同一個 grid 區域，叉叉靠右上。倒數因此拿回
 * 整個寬度，而 2026-08-30「叉叉與倒數同一列、省下 60px」的目的不變。
 *
 * 安全性：`SessionEndControl` 的確認彈窗是 `position: fixed` 的遮罩，不是
 * 就地展開，所以 `.session-end` 永遠只有那顆 44×44 的按鈕，重疊不會蓋到
 * 會變高的東西。
 */
.home__session-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: start;
}

.home__session-head > * {
  grid-area: 1 / 1;
}

.home__session-head > .session-end {
  justify-self: end;
}

.home__cta {
  width: 100%;
}

.home-state {
  display: grid;
  justify-items: start;
  gap: var(--space-4);
  padding: clamp(1.25rem, 5vw, 2rem) 0;
  color: var(--text-secondary);
}

.home-state--loading {
  justify-items: center;
  text-align: center;
  padding: clamp(2rem, 8vw, 3rem) 0;
}

.home-state h2,
.home-state p {
  margin: 0;
}

.home-state h2 {
  color: var(--text-primary);
  font-size: var(--font-size-section-title);
}
</style>
