<script setup lang="ts">
/**
 * 按鈕內的行內載入指示器：tool-loading 3/4 圓弧順時針旋轉。
 *
 * 顏色繼承按鈕的 currentColor（深底淺字、淺底深字皆自動適配）。
 * 純裝飾用途（aria-hidden="true"），無障礙由按鈕的可見忙碌文字承擔。
 */
</script>

<template>
  <svg
    class="inline-loader"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      class="inline-loader__spinner"
      d="M12 4.25A7.75 7.75 0 1 1 4.25 12"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linecap="round"
    />
  </svg>
</template>

<style scoped>
.inline-loader {
  width: 1em;
  height: 1em;
  margin-right: var(--space-2);
  flex: none;
  animation-name: inline-loader-spin;
  animation-duration: var(--duration-loader-cycle);
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

@keyframes inline-loader-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .inline-loader {
    animation: none;
  }
}
</style>
