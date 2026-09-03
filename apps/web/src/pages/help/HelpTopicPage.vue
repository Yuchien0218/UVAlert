<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import IconButton from "../../components/common/IconButton.vue";
import ContentUnderReview from "../../components/help/ContentUnderReview.vue";
import { findTopic, isPublishable } from "../../features/help/helpTopics";

/**
 * S-15 `/help/beach` 與 S-16 `/help/how-it-works` 的共用外殼。
 *
 * 核准前一律顯示審查中狀態，不顯示未核准版本（PRD §13.4、AC-15、AC-63）。
 * 閱讀、開啟或關閉本頁都不得建立事件或改變 Session 狀態（AC-46）——
 * 本頁純顯示，不持有任何 controller。
 */

const route = useRoute();
const router = useRouter();

/*
 * 頂端的返回出口（2026-09-03，稽核 §G：下鑽頁一律有頂端箭頭）。
 * 這一頁的上一層是常見問題，不是「更多」。
 */
function goBack(): void {
  void router.push({ name: "help" });
}
const topic = computed(() => findTopic(String(route.meta.helpTopicSlug ?? "")));
const publishable = computed(() =>
  topic.value === undefined ? false : isPublishable(topic.value)
);
</script>

<template>
  <div class="page-stack">
    <header class="page-heading page-heading--with-exit">
      <h1 class="page-heading__title" data-typography-role="page-title">
        {{ topic?.title ?? "說明" }}
      </h1>
      <IconButton icon="tool-arrow-left" label="返回常見問題" @click="goBack" />
    </header>

    <ContentUnderReview
      v-if="!publishable"
      title="內容正在審查"
      :body="`這篇內容正在審查中，完成前暫不提供。`"
      :required-review="topic?.requiredReview ?? null"
    />
  </div>
</template>
