<script setup lang="ts">
import type { ActionKind } from "@sunshield/contracts";
import { computed, nextTick, onMounted, shallowRef, watch } from "vue";
import { useRouter } from "vue-router";
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
  if (!isNight.value) {
    return headlineDay.value === null ? null : "地區預報";
  }

  const todayUvi = today.value?.uvi;
  const tomorrowUvi = tomorrow.value?.uvi;
  if (todayUvi === undefined || tomorrowUvi === undefined) return null;

  const diff = tomorrowUvi - todayUvi;
  if (diff === 0) return "與今天相同";
  return diff > 0 ? "明天比今天高 " + diff : "明天比今天低 " + -diff;
});

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
 * 「記錄狀況」改用提問式的提示卡，不再是深杏桃主 CTA。
 *
 * 2026-08-30 使用者裁決（見 docs/decisions/2026-08-30-pending-decisions.md
 * 第六節）：「事件現在是深色按鈕，會一直注意到這個事件的存在」。
 *
 * 這與 domain 的語意是相符的——情境事件（流汗／擦毛巾／摩擦／洗手／下水）
 * **本來就是條件觸發**，不是每次都要做。滿寬實心按鈕讀起來是「你現在該做
 * 這件事」，跟「如果剛好發生了，才需要點」不是同一件事。
 *
 * 兩個條件缺一不可：
 *
 * 1. `actionKind === "report_context_event"`。那顆按鈕的文字跟著 actionKind
 *    走，共 13 種；問句只對「記錄狀況」成立。「補上防護紀錄」「確認防護
 *    方式」這些是真的要使用者去做的事，配上問句會變成明明要求動作卻寫得
 *    像可有可無。
 * 2. `tone !== "due"`。到了補擦時間時它是「記錄補擦」，那是當下最主要的
 *    任務，降級反而有害——這也是為什麼不能一刀切。
 */
const showContextEventPrompt = computed(
  () =>
    reminderPresentation.value !== null &&
    reminderPresentation.value.actionKind === "report_context_event" &&
    reminderPresentation.value.tone !== "due"
);

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
      <SessionEndControl
        :phase="sessionControl.endPhase.value"
        :error="sessionControl.endError.value"
        @confirm="handleEndSession"
        @reset-error="sessionControl.clearEndError"
      />

      <HomeNightSession :session="session!" />

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

      <!--
        提問式的提示卡。文案涵蓋 ReportContextEventPage 實際提供的五個
        選項（大量流汗／擦毛巾／明顯摩擦／洗手／游泳下水），不只講流汗
        ——只講流汗會讓另外四種看起來不算數。

        用「你」不用「您」：2026-08-23-wireframe-copy-fixes.md 第 2.3 節
        有實測紀錄，apps/web/src/ 之中「您」0 次、「你」41 次。
      -->
      <section
        v-if="showContextEventPrompt && reminderPresentation !== null"
        class="home__prompt app-card"
        aria-labelledby="context-event-prompt"
      >
        <p id="context-event-prompt" class="home__prompt-question">
          剛才有流汗、碰水或擦拭嗎？
        </p>
        <p class="home__prompt-hint">記錄後會重新計算補擦時間。</p>
        <button
          class="button button--quiet"
          type="button"
          @click="handleAction(reminderPresentation.actionKind)"
        >
          {{ reminderPresentation.actionLabel }}
        </button>
      </section>

      <button
        v-else-if="reminderPresentation !== null"
        class="button button--primary home__cta"
        type="button"
        @click="handleAction(reminderPresentation.actionKind)"
      >
        {{ reminderPresentation.actionLabel }}
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
        :region-name="uvForecast.region.value?.displayName ?? null"
        :temperature-celsius="headlineDay?.temperatureCelsius ?? null"
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
        :region-name="uvForecast.region.value?.displayName ?? null"
        :temperature-celsius="headlineDay?.temperatureCelsius ?? null"
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

    <div class="home__spacer" />

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
.home__session-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: var(--space-3);
}

.home__cta {
  width: 100%;
}

/*
 * 2026-08-30：情境事件的提示卡。留在倒數正下方（使用者裁決的位置），
 * 但份量從深杏桃實心滿寬按鈕降成一張卡片內的 quiet 按鈕。
 *
 * 按鈕**不設 width: 100%**：滿寬是主 CTA 的語彙，這裡要的是「如果剛好
 * 發生了，才需要點」，按鈕貼齊左緣、只佔內容寬度即可。
 */
.home__prompt {
  display: grid;
  justify-items: start;
  gap: var(--space-2);
  padding: var(--space-4);
}

.home__prompt-question {
  margin: 0;
  font-weight: 500;
  line-height: var(--line-height-body);
}

.home__prompt-hint {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-supporting);
  line-height: var(--line-height-body);
}

.home__spacer {
  min-height: var(--space-4);
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
