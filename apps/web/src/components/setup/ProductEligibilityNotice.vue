<script setup lang="ts">
import Icon from "../icons/Icon.vue";
import type { ProductLabelSnapshotV1 } from "@sunshield/contracts";
import { computed } from "vue";

/**
 * 產品資格警示。
 *
 * 2026-08-24：從 SetupCompletionSummary 抽出來。那張「確認這次提醒」摘要
 * 已依使用者裁決移除——它重述的情境／部位／時間在提醒開始後都看得到，
 * 而這頁的第一考量是當計時器用，字愈少愈好。
 *
 * **但這則警示不是重述，不能跟著一起拿掉**：它講的是「按下去之後會發生
 * 什麼」——過期或未確認標示的防曬乳根本不會產生補擦倒數，回報過不適的
 * 更要求停止使用。這些必須在開始提醒**之前**看到，事後才發現倒數沒跑
 * 已經太晚。文案取自 Copy Deck 已審查條目，不要在這裡改寫。
 */

interface Props {
  productSnapshot?: ProductLabelSnapshotV1 | null;
}

const props = withDefaults(defineProps<Props>(), {
  productSnapshot: null
});

const warning = computed(() => {
  const eligibility =
    props.productSnapshot?.ruleEligibilityAtApplication ?? null;
  if (eligibility === null || eligibility === "eligible") return null;
  const copy: Record<string, { title: string; body: string }> = {
    expired: {
      title: "這瓶防曬乳已超過記錄的有效期限",
      body: "這瓶防曬乳已過期，無法用來建立新的補擦提醒。"
    },
    abnormal_reported: {
      title: "已回報這瓶防曬乳有異常",
      body: "相關部位不再顯示這瓶防曬乳的補擦期限。請停止使用並依包裝警語處理。"
    },
    discomfort_reported: {
      title: "已回報使用這瓶防曬乳後不適",
      body: "請停止使用並依包裝警語處理；需要時尋求醫療協助。"
    },
    no_sunscreen_claim: {
      title: "這瓶防曬乳沒有明確防曬標示",
      body: "這筆紀錄不會產生 120、40 或 80 分鐘期限。"
    },
    identity_unconfirmed: {
      title: "這瓶防曬乳的身分尚未確認",
      body: "這瓶防曬乳的防曬標示尚未確認，暫時無法建立補擦倒數。"
    }
  };
  return copy[eligibility] ?? null;
});
</script>

<template>
  <div v-if="warning" class="eligibility-notice" role="alert">
    <Icon name="state-warning" :size="20" />
    <div>
      <strong>{{ warning.title }}</strong>
      <p>{{ warning.body }}</p>
    </div>
  </div>
</template>

<style scoped>
/*
 * 底色用 DESIGN.md 第五節 status-card 規定的 color-mix(狀態色 12%, canvas)，
 * 無左側色條、無陰影。
 */
.eligibility-notice {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--color-due) 12%, var(--color-canvas));
  color: var(--text-primary);
}

/*
 * 2026-08-25：這是警示框裡單行的標題，不是流動的內文段落，繼承 body
 * 的 1.75 行高會在文字上下留出明顯的空隙，改成跟其他標題級文字一致
 * 的 1.4。
 */
.eligibility-notice strong {
  display: block;
  font-weight: 600;
  line-height: 1.4;
}

.eligibility-notice p {
  margin: var(--space-2) 0 0;
  color: var(--text-body);
  font-size: var(--font-size-body);
  line-height: var(--line-height-body);
}
</style>
