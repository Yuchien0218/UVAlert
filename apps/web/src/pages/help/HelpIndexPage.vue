<script setup lang="ts">
import { computed } from "vue";
import { listPublishableTopics } from "../../features/help/helpTopics";

/**
 * S-15 Q&A 總覽。
 *
 * 只列出已通過審查且可發布的主題。未核准主題**不佔位、不顯示灰階項目**——
 * 顯示灰階會讓使用者以為內容即將出現，規格明文禁止。
 * 目前兩則主題皆未核准，因此顯示 CP-HELP-INDEX-002 的空白狀態。
 */

const topics = computed(() => listPublishableTopics());
</script>

<template>
  <div class="page-stack">
    <header class="page-heading">
      <h1 class="page-heading__title">常見問題</h1>
      <p class="page-heading__body">
        這些內容說明防曬乳、提醒時間與使用限制。閱讀不會修改目前的提醒狀態。
      </p>
    </header>

    <nav v-if="topics.length > 0" class="topic-list" aria-label="說明主題">
      <RouterLink
        v-for="topic in topics"
        :key="topic.slug"
        class="topic-item app-card"
        :to="{ name: topic.routeName }"
      >
        <strong>{{ topic.title }}</strong>
        <small>{{ topic.summary }}</small>
      </RouterLink>
    </nav>

    <section v-else class="empty-state app-card" role="status">
      <h2>目前沒有可查看的內容</h2>
      <p>內容正在審查中，完成前暫不提供。這不影響提醒功能。</p>
    </section>

    <RouterLink class="text-link text-link--muted" to="/more">返回更多</RouterLink>
  </div>
</template>

<style scoped>
.topic-list {
  display: grid;
  gap: var(--space-4);
}

.topic-item {
  display: grid;
  min-height: var(--tap-target);
  gap: var(--space-2);
  padding: var(--space-5);
  color: inherit;
  text-decoration: none;
}

.topic-item strong {
  font-weight: 500;
}

.topic-item small {
  color: var(--text-secondary);
  line-height: 1.6;
}

.empty-state {
  display: grid;
  justify-items: start;
  gap: var(--space-3);
  padding: clamp(1.25rem, 5vw, 2rem);
}

.empty-state h2 {
  margin: 0;
  font-size: var(--font-size-section-title);
}

.empty-state p {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.7;
}

</style>
