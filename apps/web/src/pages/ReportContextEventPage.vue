<script setup lang="ts">
import { computed, nextTick, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useWebAppServices } from "../app/injection";
import QuickTimePicker from "../components/common/QuickTimePicker.vue";
import BroadcastLoader from "../components/feedback/BroadcastLoader.vue";
import ZoneSelectorGrid from "../components/reminder/ZoneSelectorGrid.vue";
import { getZoneLabel } from "../features/reminder/reminderPresentation";
import { suggestsReapplyAfter } from "../features/reminder/createContextEventController";
import { formatDateTime } from "../helpers/datetime";
import IconButton from "../components/common/IconButton.vue";
import Icon from "../components/icons/Icon.vue";

const { contextEvent } = useWebAppServices();
const router = useRouter();
const route = useRoute();

/**
 * 深連結進來的事件種類（`/reminder/report?kind=water`）。
 *
 * **2026-09-03（階段三）：水上活動的入口移到首頁。** 首頁那個連結帶著
 * `kind` 進來，直接跳過「發生了什麼？」那一層——使用者在首頁已經表明過
 * 要做什麼，再讓他從一張清單裡把同一件事再選一次是多餘的。
 *
 * **`water` 是刻意的**：首頁不知道現在有沒有進行中的水中區間（那是
 * repository 的 `openWaterInterval`，投影在預設路徑上根本看不到它——見
 * HomePage 的註解）。所以首頁只說「要處理水上活動」，由這裡解析成當下
 * 唯一可用的那一種：沒有區間就是下水，有就是離水。
 *
 * 也接受寫死的 `water_start`／`water_end`，但**只有那一種真的可用時才生效**
 * ——`allChoices` 在任一時刻只含其中一種。網址是使用者改得動的東西，
 * 不合法的值一律忽略、退回正常的選單。
 */
const deepLinkedKind = computed(() => {
  const raw = route.query.kind;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string") return null;
  if (value === "water") return contextEvent.waterChoice.value?.kind ?? null;
  return (
    contextEvent.allChoices.value.find((choice) => choice.kind === value)
      ?.kind ?? null
  );
});

/** 深連結時不顯示第一層選單——那一層已經在首頁回答過了。 */
const showKindChooser = computed(() => deepLinkedKind.value === null);

onMounted(() => {
  void contextEvent.load();
});

/*
 * 等 load() 之後才能選：`allChoices` 要有內容，`selectKind` 也才算得出
 * 預設部位。所以掛在 phase 上而不是 onMounted 裡直接呼叫。
 */
watch(
  () => contextEvent.phase.value,
  (value) => {
    if (value !== "ready") return;
    const kind = deepLinkedKind.value;
    if (kind !== null && contextEvent.selectedKind.value === null) {
      contextEvent.selectKind(kind);
    }
  },
  { immediate: true }
);

watch(
  () => contextEvent.error.value,
  (value) => {
    // 2026-08-24：這頁從首頁主 CTA 進來，取消／完成／找不到都回首頁。
    if (value === "not_found") void router.replace({ name: "home" });
  }
);

watch(
  () => contextEvent.phase.value,
  async (value) => {
    if (value === "success") {
      await nextTick();
      document.querySelector<HTMLElement>("#report-success-title")?.focus();
    }
  }
);

function cancel(): void {
  void router.push({ name: "home" });
}

/**
 * 記錄完狀況之後，接著去記錄補擦。
 *
 * **為什麼需要這條捷徑（2026-09-02 使用者回報）。** 現實裡「大量流汗」與
 * 「所以我補擦了」是同一件事的兩半，但原本的成功頁只給「返回目前提醒」
 * ——要補擦得先回首頁、再從主行動進來一次，而 App 從頭到尾沒說過「接下來
 * 該補擦」。
 *
 * 資料上不繞路：補擦頁會自動預選 `reapply_due`／`reapply_soon` 的部位，
 * 而剛才記錄的狀況正好讓那些部位到期，所以不需要再選一次。
 */
function goReapply(): void {
  void router.push({ name: "reminder-reapply" });
}

/**
 * 這次記錄的狀況會不會讓部位立刻到期。
 *
 * **只有「游泳／下水」不會。** reducer 把 `water_start` 排除在 timedCauses
 * 之外——它開啟的是一段水中區間（期限改由耐水標示決定），不是一個立刻
 * 到期的原因。其餘五種（流汗／擦毛巾／摩擦／洗手／離水）都把期限拉到
 * 事件發生的那一刻。
 *
 * 所以下水之後不提示補擦：那時人還在水裡，而且根本還沒到期。離水之後
 * 反而要提示，那是最該補擦的時機。
 */
const suggestsReapply = computed(() =>
  contextEvent.success.value === null
    ? false
    : suggestsReapplyAfter(contextEvent.success.value.kind)
);

/**
 * 送出按鈕的文字。跟著已選事件走，例如「記錄流汗」。
 *
 * 還沒選事件時退回「確認記錄」——那時沒有東西可以具體化。
 */
const submitLabel = computed(() => {
  const kind = contextEvent.selectedKind.value;
  if (kind === null) return "確認記錄";
  return (
    contextEvent.allChoices.value.find((choice) => choice.kind === kind)
      ?.submitLabel ?? "確認記錄"
  );
});

function zoneNames(zoneIds: string[]): string {
  return zoneIds
    .map((zoneId) => {
      const zone = contextEvent.session.value?.zones.find(
        (item) => item.zoneInstanceId === zoneId
      );
      return zone ? getZoneLabel(zone) : zoneId;
    })
    .join("、");
}
</script>

<template>
  <div class="page-stack report-page">
    <header class="flow-heading">
      <div>
        <p class="eyebrow">記錄狀況</p>
        <h1 data-typography-role="page-title">記錄這次狀況</h1>
        <p>記下這次狀況後，相關部位的提醒會更新；確認前不會改變提醒。</p>
      </div>
      <IconButton icon="tool-close" label="返回提醒" @click="cancel" />
    </header>

    <BroadcastLoader
      v-if="contextEvent.phase.value === 'loading'"
      label="正在讀取目前提醒狀態…"
    />

    <section
      v-else-if="
        contextEvent.phase.value === 'success' && contextEvent.success.value
      "
      class="app-card success-panel"
    >
      <h2
        id="report-success-title"
        data-typography-role="section-title"
        tabindex="-1"
      >
        已記錄這次狀況
      </h2>
      <p>
        {{ contextEvent.success.value.label }}，{{
          formatDateTime(contextEvent.success.value.occurredAt)
        }}。
      </p>
      <p>影響部位：{{ zoneNames(contextEvent.success.value.zoneIds) }}</p>
      <p
        v-if="contextEvent.error.value === 'refresh_failed'"
        class="form-error"
        role="alert"
      >
        狀況紀錄已儲存，但目前提醒尚未重新讀取。
      </p>

      <!--
        接續到補擦（2026-09-02 使用者回報）。

        **這句話不能寫成「已經補擦」。** 控制器裡對送出按鈕有一條既有規則：
        記錄狀況與記錄補擦是兩件不同的事，措辭讓人以為補過了是這個 App 最
        不能出錯的地方。所以這裡寫的是「接著去做」，而且明說目前的狀態是
        「已到期」而不是「已補擦」。
      -->
      <template v-if="suggestsReapply">
        <p class="control-rule-note">這些部位現在已經到期，還沒有補擦紀錄。</p>
        <button class="button button--primary" type="button" @click="goReapply">
          接著記錄補擦
        </button>
        <!--
          次要動作用文字連結而不是第二顆按鈕：2026-08-31 的裁決（送出區那
          兩顆同寬堆疊，次要動作拿到跟主要動作一樣的視覺份量）在這裡同樣
          成立，而且該頁的守門測試就擋著 button--quiet。
        -->
        <button
          class="text-link success-panel__skip"
          data-typography-role="body"
          type="button"
          @click="cancel"
        >
          先不補擦，返回提醒
        </button>
      </template>

      <button
        v-else
        class="button button--primary"
        type="button"
        @click="cancel"
      >
        返回目前提醒
      </button>
      <p class="correction-note">
        如果紀錄有誤，稍後可以從最近事件更正；本頁不會改寫已提交紀錄。
      </p>
    </section>

    <template v-else-if="contextEvent.session.value">
      <!-- 第一層：事件選擇 -->
      <section
        v-if="showKindChooser"
        class="app-card"
        aria-labelledby="report-kind-title"
      >
        <h2 id="report-kind-title" data-typography-role="card-title">
          發生了什麼？
        </h2>
        <!--
          2026-09-03：拿掉「或碰水」。水上活動的入口移到首頁之後，這張
          清單只剩四種損耗，舉一個清單上沒有的例子會讓人以為自己看漏了。
        -->
        <p class="control-rule-note">
          請選擇剛才發生的狀況（例如大量流汗或擦毛巾）。
        </p>
        <div class="kind-grid">
          <button
            v-for="choice in contextEvent.ordinaryChoices.value"
            :key="choice.kind"
            class="kind-option app-card"
            :class="{
              'option-selected': contextEvent.selectedKind.value === choice.kind
            }"
            type="button"
            :aria-pressed="contextEvent.selectedKind.value === choice.kind"
            @click="contextEvent.selectKind(choice.kind)"
          >
            <Icon :name="choice.icon" :size="32" />
            <strong>{{ choice.label }}</strong>
            <span>{{ choice.description }}</span>
          </button>
        </div>
        <p
          v-if="contextEvent.fieldErrors.value.kind?.[0]"
          class="form-error"
          role="alert"
        >
          {{ contextEvent.fieldErrors.value.kind[0] }}
        </p>
      </section>

      <!-- 第二層：確認 -->
      <template v-if="contextEvent.selectedKind.value">
        <section class="app-card" aria-labelledby="report-zones-title">
          <h2 id="report-zones-title" data-typography-role="card-title">
            影響哪些部位？
          </h2>
          <p
            v-if="contextEvent.zoneSelectionLocked.value"
            class="control-rule-note"
          >
            離水會直接套用下水時選取的部位，無法在此修改。
          </p>
          <p v-else class="control-rule-note">
            只勾選這次實際受影響的部位；未勾選的部位狀態不會改變。
          </p>
          <ZoneSelectorGrid
            :zones="contextEvent.selectableZones.value"
            :selected-zone-ids="contextEvent.selectedZoneIds.value"
            :locked="contextEvent.zoneSelectionLocked.value"
            @toggle="contextEvent.toggleZone"
          />
          <p
            v-if="contextEvent.fieldErrors.value.zones?.[0]"
            class="form-error"
            role="alert"
          >
            {{ contextEvent.fieldErrors.value.zones[0] }}
          </p>
        </section>

        <!-- 水上 interval 狀態 -->
        <section
          v-if="contextEvent.selectedKind.value === 'water_start'"
          class="app-card"
          aria-labelledby="report-water-title"
        >
          <h2 id="report-water-title" data-typography-role="card-title">
            知道實際下水時間嗎？
          </h2>
          <p class="control-rule-note">
            不確定時不會建立耐水倒數，避免顯示不可信的時間。
          </p>
          <div class="choice-grid choice-grid--row">
            <label>
              <input
                type="radio"
                name="water-confidence"
                value="confirmed"
                :checked="
                  contextEvent.waterStartConfidence.value === 'confirmed'
                "
                @change="contextEvent.setWaterStartConfidence('confirmed')"
              />
              <span>知道，就是下面選的時間</span>
            </label>
            <label>
              <input
                type="radio"
                name="water-confidence"
                value="unknown"
                :checked="contextEvent.waterStartConfidence.value === 'unknown'"
                @change="contextEvent.setWaterStartConfidence('unknown')"
              />
              <span>不確定</span>
            </label>
          </div>
        </section>

        <QuickTimePicker
          heading="實際什麼時候發生？"
          id-prefix="report-time"
          default-label="剛剛"
          :applied-at="contextEvent.occurredAt.value"
          :reference-now="contextEvent.referenceNow.value"
          :error="contextEvent.fieldErrors.value.occurredAt?.[0]"
          @change="contextEvent.setOccurredAt"
          @quick="contextEvent.setQuickTime"
        />
      </template>

      <p
        v-if="
          contextEvent.error.value !== null &&
          contextEvent.error.value !== 'validation'
        "
        class="form-error"
        role="alert"
      >
        {{
          contextEvent.error.value === "state_changed"
            ? "提醒狀態已改變，請返回提醒頁重新確認後再記錄一次。"
            : contextEvent.error.value === "persistence"
              ? "資料沒有儲存，這次狀況尚未記錄。輸入仍會保留，可以再試一次。"
              : "這次狀況尚未記錄，請確認後再試一次。"
        }}
      </p>

      <!--
        2026-08-31：「取消」從等寬按鈕降成文字連結（使用者裁決乙）。

        原本兩顆都是 336×45 上下堆疊——次要動作拿到跟主要動作一樣的視覺
        份量。跟夜間頁的「還是要開始提醒」同一種處理：離開的出口必須在，
        但不需要跟送出平起平坐。
      -->
      <div class="submit-actions">
        <button
          class="button button--primary"
          type="button"
          :disabled="contextEvent.phase.value === 'submitting'"
          @click="contextEvent.submit"
        >
          {{ contextEvent.phase.value === "submitting" ? "記錄中…" : submitLabel }}
        </button>
        <button
          class="text-link submit-actions__cancel"
          data-typography-role="body"
          type="button"
          :disabled="contextEvent.phase.value === 'submitting'"
          @click="cancel"
        >
          取消
        </button>
      </div>
      <p class="safety-note">
        記錄只會更新受影響部位的提醒時間，不代表防護效果或你可以在陽光下停留的時間。
      </p>
    </template>
  </div>
</template>

<style scoped>
.app-card {
  display: grid;
  gap: var(--space-4);
  padding: var(--card-padding);
}

h2,
p {
  margin: 0;
}

.app-card:not(.success-panel) > h2 {
  font-size: var(--font-size-card-title);
}

.kind-grid {
  display: grid;
  gap: var(--space-3);
}

/*
 * 2026-08-24：這裡原本自己寫了 border 與 background: transparent，
 * scoped 的特異性（.kind-option[data-v-xxx]）高過共用的 .option-selected，
 * 把選取態整組蓋掉——選了以後底色與邊框都沒變，看起來像沒選到。
 * 同一個陷阱今天已經在 ContextSelector 與 ApplicationTimePicker 修過，
 * DESIGN.md 第十節也記過一次（min-height 那次）。
 * 邊框與底色改由共用的 .app-card 提供，這裡只留版面。
 */
/*
 * 2026-08-31：改成 icon-first（使用者裁決乙）。
 *
 * 圖示在左、標題與說明在右，跟 /setup 的情境選擇器同一種讀法。32px 是
 * DESIGN.md 第八節的「卡片主視覺」檔位，不另立。
 *
 * 圖示跨兩列（grid-row: 1 / 3）而不是只佔標題那一列——說明有兩行時，
 * 圖示靠上會在下方留一根空柱子，那正是同一天在衛教分類卡上量到 122px
 * 的那個問題。這裡讓它跨滿並置中。
 */
.kind-option {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  column-gap: var(--space-4);
  row-gap: var(--space-1);
  padding: var(--space-4);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  text-align: start;
  cursor: pointer;
  min-height: var(--tap-target);
}

.kind-option svg {
  grid-row: 1 / 3;
  flex: none;
}

.kind-option span {
  color: var(--text-secondary);
}

.correction-note {
  color: var(--text-secondary);
  line-height: var(--line-height-body);
}

/*
 * 成功頁的次要動作。刻意**不共用** .submit-actions__cancel——那個名字屬於
 * 送出區，而且該頁的守門測試用它抓「送出區的取消按鈕」，借來用會讓守門
 * 抓到錯的那一顆（實測過：它抓第一個符合的，而成功頁在前面）。
 */
.success-panel__skip,
.submit-actions__cancel {
  justify-self: center;
  padding: var(--space-2) 0;
  border: 0;
  background: none;
  font: inherit;
  cursor: pointer;
}
</style>
