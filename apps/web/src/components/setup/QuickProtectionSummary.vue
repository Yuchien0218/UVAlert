<script setup lang="ts">
import Icon from "../icons/Icon.vue";
import DisclosureChevron from "../common/DisclosureChevron.vue";
import DisclosurePanel from "../common/DisclosurePanel.vue";
import type { SessionContext, SetupDraftZoneV1 } from "@sunshield/contracts";
import { computed, shallowRef, useId, watch } from "vue";
import {
  BODY_ZONE_LABELS,
  recommendedPresetFor
} from "../../features/setup/setupCatalog";

interface Props {
  context: SessionContext;
  zones: SetupDraftZoneV1[];
  pending?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  pending: false
});
defineEmits<{
  accept: [];
  adjust: [];
}>();

/**
 * 尚未確認時攤開（使用者沒挑過部位，推薦內容必須看得到）；一旦確認就
 * 收合成單行——這時它的任務已經完成，下面還要填塗抹時間、看確認摘要，
 * 讓它繼續佔掉整段版面只是把頁面拉長。使用者仍可點標題列重新展開。
 */
const expanded = shallowRef(props.pending);

/** aria-controls 需要一個穩定 id；同頁可能有多個實例，用 useId 不用寫死。 */
const detailsId = useId();

watch(
  () => props.pending,
  (pending) => {
    expanded.value = pending;
  }
);

const preset = computed(() => recommendedPresetFor(props.context));
const zoneLabels = computed(() =>
  props.zones.map(
    (zone) => zone.customLabel ?? BODY_ZONE_LABELS[zone.bodyZoneCode]
  )
);
</script>

<template>
  <section class="quick-protection">
    <button
      class="quick-protection__header"
      type="button"
      :aria-expanded="expanded"
      :aria-controls="detailsId"
      @click="expanded = !expanded"
    >
      <h2 data-typography-role="card-title">{{ preset.label }}</h2>
      <DisclosureChevron
        :open="expanded"
        :size="20"
        class="quick-protection__toggle"
      />
    </button>

    <!--
      2026-08-31：三段收成一段（使用者要求「精簡文字，現在文字量太多」）。

      展開後原本是：

        1. `preset.summary`   臉部、耳朵、頸部、手臂、手背
        2. 這次會套用到：…    額頭、鼻子與雙頰、臉部下半部、耳朵、前頸…
        3. 確認實際塗抹時間後，才會建立正式提醒。

      **1 與 2 是同一份資訊的兩種寫法**（預設組合的簡稱 vs 實際會建立的
      部位全名）。留全名那一份：簡稱好讀，但讀者在這裡要判斷的是「等一下
      真的會被提醒的是哪些」，那只有全名答得出來。

      3 刪掉——下方主要 CTA 就寫著「開始防曬提醒」，而塗抹時間卡本身也在
      同一個畫面上。它在重述畫面上已經看得到的流程。
    -->
    <DisclosurePanel :open="expanded">
      <div :id="detailsId" class="quick-protection__details">
        <p class="quick-protection__zones">{{ zoneLabels.join("、") }}</p>
        <div class="quick-protection__actions">
          <button
            v-if="pending"
            class="button button--primary"
            type="button"
            @click="$emit('accept')"
          >
            使用這組並繼續
          </button>
          <button
            class="button button--quiet"
            type="button"
            @click="$emit('adjust')"
          >
            <Icon name="tool-edit" :size="16" />
            調整要提醒的部位
          </button>
        </div>
      </div>
    </DisclosurePanel>
  </section>
</template>

<style scoped>
/*
 * 2026-08-24：原本整區用 --color-soon-soft 當底、圓形圖示用 --color-soon。
 * 但 --color-soon 的語意是「即將到期」，這區講的是「這是推薦的部位組合」，
 * 完全不同的事——DESIGN.md 第二節明訂狀態色不得與裝飾用法混淆。
 *
 * SetupProcessBanner（2026-08-31 已移除）當時也因為同一個理由把 --color-soon 換掉
 * （「同一個顏色會讓使用者把該去完成設定跟該去補擦搞混」），這一處是當時
 * 漏掉的。改用共用的 .app-card，跟同頁其他區塊一致。
 */
/*
 * 2026-08-30（B 批）：從 .app-card 改為情境選擇器下方的一段文字。
 *
 * 它只在選好情境後才出現，本來就已經有「這是接著要看的東西」的脈絡；
 * 再包一張卡、加一個圓形圖示、又標一次「快速提醒（推薦）」，等於把同一
 * 件事宣告三次。同頁下方還有兩張真正的卡（SPF 標示題、塗抹時間），這一
 * 區跟它們等重會讓人分不出哪個需要作答。
 *
 * 一併移除的：.app-card 外框、圓形圖示 .quick-protection__mark、eyebrow
 * 「快速提醒（推薦）」。保留展開收合——details 裡有部位清單與兩個操作，
 * 常駐會比原本的卡片更高。
 */
.quick-protection {
  display: grid;
  gap: var(--space-3);
}

.quick-protection__header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--space-3);
  align-items: center;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: opacity var(--duration-fast) var(--ease-out);
}

.quick-protection__header:hover {
  opacity: 0.8;
}

.quick-protection__header h2,
.quick-protection__zones {
  margin: 0;
}

.quick-protection__header h2 {
  font-size: var(--font-size-card-title);
}

/* chevron 改用換 name，理由見 ContextSelector.vue 同名註解（B9 裁決 2）。 */
.quick-protection__toggle {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.quick-protection__details {
  display: grid;
  gap: var(--space-3);
  padding: 0;
}

.quick-protection__zones {
  font-size: var(--font-size-supporting);
  color: var(--text-secondary);
  line-height: var(--line-height-body);
}

.quick-protection__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-top: var(--space-2);
}

/*
 * 2026-08-24：原本叫 slideDown、帶 translateY(-0.5rem)，但 DESIGN.md
 * 第十二節明訂動畫「只用 opacity，不用位移或縮放」。改成純淡入。
 */
@media (max-width: 31rem) {
  .quick-protection__header {
    gap: var(--space-3);
  }

  .quick-protection__actions {
    display: grid;
  }

  .quick-protection__actions .button {
    width: 100%;
  }
}
</style>
