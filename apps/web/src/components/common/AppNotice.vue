<script setup lang="ts">
interface Props {
  kind: "ok" | "error";
}

const props = defineProps<Props>();
</script>

<template>
  <p
    class="notice"
    :class="props.kind === 'ok' ? 'notice--ok' : 'notice--error'"
    :role="props.kind === 'ok' ? 'status' : 'alert'"
  >
    <slot />
  </p>
</template>
