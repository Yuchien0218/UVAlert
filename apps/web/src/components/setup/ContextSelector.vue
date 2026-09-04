<script setup lang="ts">
import type { SessionContext } from "@sunshield/contracts";
import { computed, shallowRef, watch } from "vue";
import Icon from "../icons/Icon.vue";
import DisclosureChevron from "../common/DisclosureChevron.vue";
import DisclosurePanel from "../common/DisclosurePanel.vue";
import { CONTEXT_ICONS } from "../../features/setup/setupCatalog";

/**
 * 情境選擇：四格 icon-first，說明與子選項在格子下方展開。
 *
 * 2026-08-30 改版（B 批，裁決 1A）。原本是四張直式卡片各佔一整列、圖示
 * 24px 擺在文字左邊，整個第一屏就只是「從四個裡選一個」——實測 393px。
 * 改成兩欄格狀之後，圖示放大到 32px 成為掃讀入口，說明文字改到選取後
 * 才出現。
 *
 * **為什麼是 4 格不是 6 格**：六個 SessionContext 裡，室內與水上各有兩
 * 個子選項（近直射窗邊／遠離直射光、準備下水／已在水中）——那種需要判
 * 讀的區分不適合只靠圖示，攤平成六格反而讓首屏多兩個難以掃讀的目標。
 * 所以格子是四個大類，選到室內或水上時才在下方出示子選項。
 *
 * **名稱永遠顯示**，不做成只有圖示：context-indoor 與 context-water 光
 * 看圖猜不出是哪一種室內／水上情境，螢幕閱讀器也需要可存取名稱。
 */

const selectedContext = defineModel<SessionContext | null>({
  required: true
});

type GroupKey = "indoor" | "water";

const directOptions = [
  {
    value: "outdoor_general",
    label: "一般戶外",
    description: "通勤、散步或一般外出。",
    icon: CONTEXT_ICONS.outdoor_general
  },
  {
    value: "outdoor_exercise",
    label: "戶外運動",
    description: "跑步、騎車或其他較大量活動。",
    icon: CONTEXT_ICONS.outdoor_exercise
  }
] as const;

const groups = [
  {
    key: "indoor" as GroupKey,
    label: "室內活動",
    icon: CONTEXT_ICONS.indoor_away,
    options: [
      {
        value: "indoor_window",
        label: "近直射窗邊",
        description: "主要在有直射光線的窗邊活動。"
      },
      {
        value: "indoor_away",
        label: "遠離直射光",
        description: "主要待在室內，沒有靠近直射窗邊。"
      }
    ]
  },
  {
    key: "water" as GroupKey,
    label: "水上活動",
    icon: CONTEXT_ICONS.water_preparing,
    options: [
      {
        value: "water_preparing",
        label: "準備下水",
        description: "不會提前開始耐水時間。"
      },
      {
        value: "water_active",
        label: "已在水中",
        description: "稍後需要確認實際入水時間；不確定也能繼續。"
      }
    ]
  }
] as const;

function groupOf(context: SessionContext | null): GroupKey | null {
  if (context === "indoor_window" || context === "indoor_away") return "indoor";
  if (context === "water_preparing" || context === "water_active") {
    return "water";
  }
  return null;
}

/** 目前展開的群組。已選子選項時預設展開它所屬的群組。 */
const openGroup = shallowRef<GroupKey | null>(groupOf(selectedContext.value));

watch(selectedContext, (context) => {
  const group = groupOf(context);
  if (group !== null) openGroup.value = group;
});

function toggleGroup(key: GroupKey): void {
  openGroup.value = openGroup.value === key ? null : key;
}

/**
 * 點四個大類裡的「直接情境」時要順手收起群組——否則會同時看到「一般戶外
 * 已選取」與展開中的室內子選項，讀起來像兩個都選了。
 */
function selectDirect(value: SessionContext): void {
  selectedContext.value = value;
  openGroup.value = null;
}

/**
 * 目前選取情境的說明。
 *
 * **刻意與展開狀態無關。** 2026-09-04 之前這裡會在 `openGroup !== null` 時
 * 回傳 null——但改成高度動畫之後，那會讓說明在收合的當下就變成空字串，
 * 高度動畫等於在一個空盒子上跑。內容留著、由 `descriptionOpen` 決定要不要
 * 顯示，收合過程中才有東西可以縮。
 */
const selectedDescription = computed(() => {
  const direct = directOptions.find(
    (option) => option.value === selectedContext.value
  );
  if (direct !== undefined) return direct.description;
  for (const group of groups) {
    const option = group.options.find(
      (candidate) => candidate.value === selectedContext.value
    );
    if (option !== undefined) return option.description;
  }
  return null;
});

/** 沒有展開群組、而且真的有說明可講時，才展開說明區。 */
const descriptionOpen = computed(
  () => openGroup.value === null && selectedDescription.value !== null
);
</script>

<template>
  <fieldset class="context-selector">
    <legend class="screen-reader-only">選擇目前情境</legend>

    <div class="context-grid">
      <label
        v-for="option in directOptions"
        :key="option.value"
        class="context-tile"
      >
        <input
          class="context-tile__input"
          type="radio"
          name="setup-context"
          :value="option.value"
          :checked="selectedContext === option.value"
          @change="selectDirect(option.value)"
        />
        <Icon :name="option.icon" :size="32" />
        <strong>{{ option.label }}</strong>
      </label>

      <button
        v-for="group in groups"
        :key="group.key"
        class="context-tile context-tile--group"
        :class="{
          'context-tile--active': groupOf(selectedContext) === group.key
        }"
        type="button"
        :aria-expanded="openGroup === group.key"
        :aria-controls="group.key + '-context-options'"
        @click="toggleGroup(group.key)"
      >
        <Icon :name="group.icon" :size="32" />
        <strong>{{ group.label }}</strong>
        <DisclosureChevron
          :open="openGroup === group.key"
          class="context-tile__chevron"
          :size="16"
        />
      </button>
    </div>

    <!--
      2026-09-04：從「一個共用展開區」改成「每個群組各自一個面板」。

      原本說明與子選項共用同一個 `v-if` / `v-else-if` 區塊，於是它有三種
      狀態（子選項／說明／空），高度在 24px、171px、192px、0 之間直接跳，
      實測從說明切到室內子選項是 **+147px 的瞬跳**。

      共用區沒辦法接 DisclosurePanel：那個元件做的是 0↔內容高度，而這裡是
      內容高度↔另一個內容高度；而且 `activeGroup` 收合時會變 undefined，
      模板直接炸。**這是元件結構問題，不是動效問題**——拆開之後每個面板
      都回到單純的「開／關」，DisclosurePanel 就直接可用了。

      順帶修好一個無障礙問題：`aria-controls` 指的 id 以前只有展開時才存在，
      現在永遠在 DOM 裡（收合時由 DisclosurePanel 標成 inert）。

      切換群組時會有一個面板收合、另一個展開——那是同一個動作的兩半，不是
      第十二節規則五要擋的「兩個各自獨立的元素同時動」。
    -->
    <DisclosurePanel
      v-for="group in groups"
      :key="group.key"
      :open="openGroup === group.key"
    >
      <div :id="group.key + '-context-options'" class="context-detail">
        <label
          v-for="option in group.options"
          :key="option.value"
          class="context-suboption"
          :class="{ 'option-selected': selectedContext === option.value }"
        >
          <input
            v-model="selectedContext"
            type="radio"
            name="setup-context"
            :value="option.value"
          />
          <span>
            <strong>{{ option.label }}</strong>
            <small>{{ option.description }}</small>
          </span>
        </label>
      </div>
    </DisclosurePanel>

    <DisclosurePanel :open="descriptionOpen">
      <p class="context-detail__description">{{ selectedDescription }}</p>
    </DisclosurePanel>
  </fieldset>
</template>

<style scoped>
.context-selector {
  display: grid;
  gap: var(--space-3);
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

/*
 * 版面沿用「新增防曬裝備」的品類格（GearForm 的 .category-grid）——同一
 * 個 App 裡「從幾個大類挑一個」應該長一樣。手機與桌面都是兩欄：四個項目
 * 剛好 2×2，不會出現第二排落單。
 */
.context-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-2);
}

.context-tile {
  position: relative;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: var(--space-2);
  min-height: 5.5rem;
  padding: var(--space-4) var(--space-2);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--surface-primary);
  color: var(--text-primary);
  text-align: center;
  cursor: pointer;
  transition:
    background-color var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    filter var(--duration-fast) var(--ease-out);
}

/* 2026-09-04：原本 transition 與 :active 都沒有，選取瞬變、按下無回饋。 */
.context-tile:active {
  filter: brightness(var(--press-dim));
}

/*
 * 選取狀態同時給邊框與底色，不只靠顏色（DESIGN.md 第九節）。
 *
 * 直接寫在 .context-tile 上，不再像改版前那樣本地寫一份 background、再
 * 靠共用的 .option-selected 蓋回來——那個特異性衝突 2026-08-24 已經修過
 * 一次，不要再製造第二次。
 *
 * 2026-09-04：值改成共用那組（muted 邊框 ＋ hairline 底）。這裡是全站
 * **最後一個**自己刻選取樣式的地方——2026-09-01 統一裝備分類時漏掉了它，
 * 於是那次裁決只執行了一半。理由與當時完全相同：
 *
 *   1. 一比九。
 *   2. --color-primary 是**行動色**。拿它當選取邊框，等於讓「這裡可以按」
 *      跟「這個已經選了」共用一個訊號——而情境磁磚本身就是可按的，兩個
 *      訊號疊在同一個元素上最容易混淆。
 *   3. 邊框對比反而更好（muted 5.56 vs primary 4.37，SC 1.4.11 門檻 3:1）。
 *
 * 為什麼 2026-09-01 的守門沒抓到：selectedOptionStyle.test.ts 當時比對的是
 * 字面上的 `:has(input:checked)`，而這裡寫的是 `:has(.context-tile__input:checked)`，
 * 而且 `:has()` 與 `{` 之間還隔著第二個選擇器。守門同日已放寬成能涵蓋這兩種寫法。
 */
.context-tile:has(.context-tile__input:checked),
.context-tile--active {
  border-color: var(--color-muted);
  background: var(--color-hairline);
}

.context-tile strong {
  font-weight: 500;
  line-height: 1.4;
}

.context-tile__input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}

.context-tile:has(.context-tile__input:focus-visible),
.context-tile--group:focus-visible {
  outline: 0.15rem solid var(--focus-ring);
  outline-offset: 0.2rem;
}

.context-tile__chevron {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  color: var(--text-secondary);
}

.context-detail {
  display: grid;
  gap: var(--space-2);
}

.context-detail__description {
  margin: 0;
  color: var(--text-secondary);
  line-height: var(--line-height-body);
}

.context-suboption {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition:
    background-color var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    filter var(--duration-fast) var(--ease-out);
}

/* 同 .context-tile，但這顆沒有自己的底色，所以按壓要補底（見 app.css）。 */
.context-suboption:active {
  background-color: var(--color-hairline);
  filter: brightness(var(--press-dim));
}

.context-suboption:has(input:focus-visible) {
  outline: 0.15rem solid var(--focus-ring);
  outline-offset: 0.2rem;
}

.context-suboption strong,
.context-suboption small {
  display: block;
}

.context-suboption strong {
  font-weight: 500;
  line-height: 1.4;
}

.context-suboption small {
  margin-top: var(--space-1);
  color: var(--text-secondary);
  line-height: var(--line-height-body);
}
</style>
