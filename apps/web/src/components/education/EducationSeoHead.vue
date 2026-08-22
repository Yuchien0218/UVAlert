<script setup lang="ts">
import { onBeforeUnmount, watchEffect } from "vue";
import type { EducationArticle } from "../../features/education/educationContent";
import {
  applyEducationSeo,
  clearEducationSeo,
  type EducationBreadcrumb,
  type EducationRobots
} from "../../features/education/educationSeo";

const props = withDefaults(
  defineProps<{
    title: string;
    description: string;
    canonicalPath: string;
    robots: EducationRobots;
    breadcrumbs: EducationBreadcrumb[];
    article?: EducationArticle;
    pageType?: "WebPage" | "CollectionPage";
  }>(),
  { pageType: "WebPage" }
);

watchEffect(() => {
  applyEducationSeo({
    title: props.title,
    description: props.description,
    canonicalPath: props.canonicalPath,
    robots: props.robots,
    breadcrumbs: props.breadcrumbs,
    pageType: props.pageType,
    ...(props.article === undefined ? {} : { article: props.article })
  });
});

onBeforeUnmount(() => {
  clearEducationSeo();
});
</script>

<template>
  <span class="screen-reader-only" aria-hidden="true" />
</template>
