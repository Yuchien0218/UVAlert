<script setup lang="ts">
import { Moon } from "@lucide/vue";

/**
 * 夜間收工提示。
 *
 * **這裡不會停止倒數。** 使用者原本的想法是「紫外線 < 1 時自動停止計時」，
 * 但暫停之後恢復會產生假安全感——18:00 擦、19:00 凍結時剩 40 分鐘、
 * 隔天 06:00 恢復顯示「還有 40 分鐘」，那層防曬已經 12 小時了。
 * 正確語意是「這次防護結束了」，所以這裡只提示結束，時鐘照走。
 *
 * 判定用 `isFixedEvening()` 的固定本地時段，不用 UV 值：
 * 逐小時 UV 資料不存在，而且天氣需要地區、是快取、還會讓核心倒數
 * 依賴網路資源。詳見 `docs/decisions/2026-08-08-night-behavior.md`。
 */
defineProps<{ ending: boolean }>();

defineEmits<{ end: []; keep: [] }>();
</script>

<template>
  <section class="night-prompt" role="status" aria-labelledby="night-title">
    <div class="night-prompt__heading">
      <Moon :size="21" aria-hidden="true" />
      <h2 id="night-title">現在是晚上</h2>
    </div>
    <p>
      現在紫外線通常較低。如果今天已經不會再外出，可以結束這次提醒；
      倒數會繼續，直到你手動結束。
    </p>
    <div class="night-prompt__actions">
      <button
        class="button button--primary"
        type="button"
        :disabled="ending"
        @click="$emit('end')"
      >
        {{ ending ? "結束中…" : "結束本次提醒" }}
      </button>
      <button class="button button--quiet" type="button" @click="$emit('keep')">
        繼續提醒
      </button>
    </div>
  </section>
</template>

<style scoped>
.night-prompt {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--color-untimed-soft, var(--surface-soft));
}

.night-prompt__heading {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

h2,
p {
  margin: 0;
}

h2 {
  font-size: var(--font-size-section-title);
}

p {
  color: var(--text-secondary);
  line-height: 1.7;
}

.night-prompt__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.night-prompt__actions .button {
  flex: 1 1 auto;
}
</style>
