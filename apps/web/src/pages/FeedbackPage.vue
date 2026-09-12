<script setup lang="ts">
import { useRouter } from "vue-router";
import IconButton from "../components/common/IconButton.vue";
import { computed, shallowRef } from "vue";
import type { FeedbackType } from "@sunshield/contracts";
import { useFeedbackController } from "../app/injection";
import AppNotice from "../components/common/AppNotice.vue";
import InlineLoader from "../components/feedback/InlineLoader.vue";

const feedback = useFeedbackController();
const feedbackType = shallowRef<FeedbackType>("bug");
const message = shallowRef("");
const contactEmail = shallowRef("");
const busy = computed(() => feedback.state.value.status === "submitting");

const FEEDBACK_FIELD_CONFIG: Record<
  FeedbackType,
  { label: string; placeholder: string }
> = {
  bug: {
    label: "問題描述",
    placeholder: "請描述發生的狀況與操作步驟，幫助我們更快排查"
  },
  feature_request: {
    label: "建議內容",
    placeholder: "分享你期待的新功能或使用體驗改善想法"
  },
  content_correction: {
    label: "更正說明",
    placeholder: "請指出有疑慮的衛教文章、數值或章節，以及建議修正內容"
  },
  privacy_request: {
    label: "請求內容",
    placeholder: "請說明需要查閱、匯出或刪除的帳號與隱私資料項目"
  }
};

const fieldConfig = computed(
  () => FEEDBACK_FIELD_CONFIG[feedbackType.value] ?? FEEDBACK_FIELD_CONFIG.bug
);

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
const router = useRouter();

/*
 * 頂端的返回出口（2026-09-03，稽核 §G：下鑽頁一律有頂端箭頭）。
 * 直接回「更多」，不用 history.back——這一頁也可能是從網址列直接打開的。
 */
function goBack(): void {
  void router.push({ name: "more" });
}
</script>

<template>
  <div class="page-stack">
    <header class="page-heading page-heading--with-exit">
      <h1 class="page-heading__title" data-typography-role="page-title">
        問題回報與意見回饋
      </h1>
      <p class="page-heading__body">可匿名或提供聯絡信箱，僅會收到此表單的回覆。</p>
      <IconButton icon="tool-arrow-left" label="返回更多" @click="goBack" />
    </header>

    <form class="app-card feedback-form form-control-stack" @submit.prevent="submit">
      <label>
        <span>問題類型</span>
        <select v-model="feedbackType">
          <option value="bug">功能無法正常使用</option>
          <option value="feature_request">我有功能建議</option>
          <option value="content_correction">衛教內容需要更正</option>
          <option value="privacy_request">隱私／帳號資料請求</option>
        </select>
      </label>
      <label>
        <span>{{ fieldConfig.label }}</span>
        <textarea
          v-model="message"
          rows="6"
          maxlength="4000"
          required
          :placeholder="fieldConfig.placeholder"
        ></textarea>
      </label>
      <label>
        <span>聯絡信箱</span>
        <input
          v-model="contactEmail"
          type="email"
          maxlength="320"
          placeholder="選填，可聯繫你目前處理進度"
        />
      </label>
      <button class="button button--primary" type="submit" :disabled="busy">
        <InlineLoader v-if="busy" />
        {{ busy ? "送出中…" : "送出" }}
      </button>
      <AppNotice v-if="feedback.state.value.status === 'submitted'" kind="ok">
        已收到你的回報，謝謝！
      </AppNotice>
      <AppNotice v-if="feedback.state.value.error" kind="error">
        {{ feedback.state.value.error.message }}
      </AppNotice>
    </form>
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
</style>
