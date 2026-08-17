<script setup lang="ts">
import { AlertTriangle } from "@lucide/vue";
import { useId } from "vue";
import type { ProductClaimAnswer } from "../../features/setup/productSnapshot";

/**
 * 步驟 2 的單題包裝標示確認。
 *
 * 裝備頁那四題裡，只有「有沒有防曬／SPF 標示」會決定能不能產生補擦
 * 倒數（`sunscreenClaimStatus !== "confirmed"` 一律推導為
 * `no_sunscreen_claim`）；其餘三題都接受「不確定」，只影響間隔精細度。
 * 所以這裡只問這一題，其他三題留給裝備頁補，避免為了開始提醒
 * 先離開設定流程。
 */
const model = defineModel<ProductClaimAnswer | null>({ required: true });

const groupName = `sunscreen-claim-${useId()}`;
</script>

<template>
  <fieldset class="question-card app-card">
    <legend>包裝上有明確的防曬或 SPF 標示嗎？</legend>
    <p class="question-card__helper">
      只需要這一題就能開始提醒。包裝上的等待時間、較短補擦間隔與耐水標示可以稍後在裝備頁補齊。
    </p>
    <div class="choice-grid choice-grid--row">
      <label>
        <input
          v-model="model"
          type="radio"
          :name="groupName"
          value="yes"
        >
        <span>有</span>
      </label>
      <label>
        <input
          v-model="model"
          type="radio"
          :name="groupName"
          value="no"
        >
        <span>沒有</span>
      </label>
      <label>
        <input
          v-model="model"
          type="radio"
          :name="groupName"
          value="unknown"
        >
        <span>不確定或看不清楚</span>
      </label>
    </div>

    <aside
      v-if="model !== null && model !== 'yes'"
      class="claim-consequence"
      role="status"
    >
      <AlertTriangle :size="21" aria-hidden="true" />
      <div>
        <strong>這次先不建立補擦倒數</strong>
        <p>
          無法確認是防曬產品時不建立倒數，避免顯示不可信的時間。提醒仍會建立並記錄提醒部位；之後在裝備頁確認標示，就能補上倒數。
        </p>
      </div>
    </aside>
  </fieldset>
</template>

<style scoped>
.claim-consequence {
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-4);
  padding: var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--color-untimed-soft, var(--color-surface-raised));
  color: var(--text-secondary);
}

.claim-consequence strong {
  display: block;
  color: var(--text-primary);
}

.claim-consequence p {
  margin: var(--space-2) 0 0;
  line-height: 1.7;
}
</style>
