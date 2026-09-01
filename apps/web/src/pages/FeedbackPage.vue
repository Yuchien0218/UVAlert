<script setup lang="ts">
import { computed, shallowRef } from "vue";
import type { FeedbackType } from "@sunshield/contracts";
import { useFeedbackController } from "../app/injection";
import AppNotice from "../components/common/AppNotice.vue";

const feedback = useFeedbackController();
const feedbackType = shallowRef<FeedbackType>("bug");
const message = shallowRef("");
const contactEmail = shallowRef("");
const busy = computed(() => feedback.state.value.status === "submitting");

async function submit(): Promise<void> {
  const ok = await feedback.submit({
    feedbackType: feedbackType.value,
    message: message.value,
    contactEmail:
      contactEmail.value.trim() === "" ? null : contactEmail.value.trim()
  });
  if (ok) {
    message.value = "";
    contactEmail.value = "";
  }
}
</script>

<template>
  <div class="page-stack">
    <header class="page-heading">
      <h1 class="page-heading__title" data-typography-role="page-title">
        問題回報與意見回饋
      </h1>
      <p class="page-heading__body">
        免登入即可回報，僅會收到此表單的內容。
      </p>
    </header>

    <form class="app-card feedback-form" @submit.prevent="submit">
      <label>
        <span>問題類型</span>
        <select v-model="feedbackType">
          <option value="bug">功能無法正常使用</option>
          <option value="feature_request">我有功能建議</option>
          <option value="content_correction">衛教內容需要更正</option>
        </select>
      </label>
      <label>
        <span>請描述你遇到的情況</span>
        <textarea
          v-model="message"
          rows="6"
          maxlength="4000"
          required
          placeholder="請描述遇到的狀況與原本操作步驟"
        ></textarea>
      </label>
      <label>
        <span>聯絡信箱（選填）</span>
        <input
          v-model="contactEmail"
          type="email"
          maxlength="320"
          placeholder="選填，可聯繫你目前處理進度"
        />
      </label>
      <button class="button button--primary" type="submit" :disabled="busy">
        {{ busy ? "送出中…" : "送出" }}
      </button>
      <AppNotice v-if="feedback.state.value.status === 'submitted'" kind="ok">
        已收到你的回報，謝謝！
      </AppNotice>
      <AppNotice v-if="feedback.state.value.error" kind="error">
        {{ feedback.state.value.error.message }}
      </AppNotice>
    </form>

    <RouterLink class="text-link text-link--muted" to="/more"
      >返回更多</RouterLink
    >
  </div>
</template>

<style scoped>
.feedback-form {
  display: grid;
  gap: var(--space-4);
  padding: var(--card-padding);
}
label {
  display: grid;
  gap: var(--space-2);
}
label span {
  font-weight: 500;
}
/* 只留寬度，其餘欄位外觀（含 44px 命中高度）用 app.css 的共用宣告。 */
input,
select,
textarea {
  width: 100%;
}
</style>
