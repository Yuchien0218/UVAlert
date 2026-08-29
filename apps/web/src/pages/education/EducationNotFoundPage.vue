<script setup lang="ts">
import EducationSeoHead from "../../components/education/EducationSeoHead.vue";
</script>

<template>
  <div class="page-stack education-not-found">
    <EducationSeoHead
      title="找不到這篇衛教內容"
      description="這篇衛教內容不存在或已移除，請回到防曬衛教首頁重新選擇。"
      canonical-path="/education"
      robots="noindex,follow"
      :breadcrumbs="[{ name: '防曬衛教', path: '/education' }]"
    />
    <header class="page-heading">
      <p class="page-heading__eyebrow">防曬衛教</p>
      <h1 class="page-heading__title" data-typography-role="page-title">
        找不到這篇內容
      </h1>
      <p class="page-heading__body">
        連結可能已更新，請回到衛教首頁重新選擇文章。
      </p>
    </header>
    <RouterLink class="button button--primary" to="/education"
      >回到防曬衛教</RouterLink
    >
  </div>
</template>

<style scoped>
.education-not-found {
  max-width: 42rem;
}
</style>
