<script setup lang="ts">
import type { SessionContext } from "@sunshield/contracts";
import { computed, shallowRef, watch } from "vue";
import Icon from "../icons/Icon.vue";

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
    icon: "context-outdoor"
  },
  {
    value: "outdoor_exercise",
    label: "戶外運動",
    description: "跑步、騎車或其他較大量活動。",
    icon: "context-exercise"
  }
] as const;

const groups = [
  {
    key: "indoor" as GroupKey,
    label: "室內活動",
    icon: "context-indoor",
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
    icon: "context-water",
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

const activeGroup = computed(() =>
  groups.find((group) => group.key === openGroup.value)
);

/** 沒有展開群組時，說明區顯示目前選取情境的說明。 */
const selectedDescription = computed(() => {
  if (openGroup.value !== null) return null;
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
        <Icon
          :name="
            openGroup === group.key ? 'tool-chevron-down' : 'tool-chevron-right'
          "
          class="context-tile__chevron"
          :size="16"
        />
      </button>
    </div>

    <!--
      說明與子選項共用同一個展開區——這頁只該有一種展開模式。展開群組時
      顯示子選項，否則顯示已選情境的說明。
    -->
    <div
      v-if="activeGroup !== undefined"
      :id="activeGroup.key + '-context-options'"
      class="context-detail"
    >
      <label
        v-for="option in activeGroup.options"
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

    <p v-else-if="selectedDescription" class="context-detail__description">
      {{ selectedDescription }}
    </p>
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
}

/*
 * 選取狀態同時給邊框與底色，不只靠顏色（DESIGN.md 第九節）。
 *
 * 直接寫在 .context-tile 上，不再像改版前那樣本地寫一份 background、再
 * 靠共用的 .option-selected 蓋回來——那個特異性衝突 2026-08-24 已經修過
 * 一次，不要再製造第二次。
 */
.context-tile:has(.context-tile__input:checked),
.context-tile--active {
  border-color: var(--color-primary);
  background: var(--color-surface-cream-strong);
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
