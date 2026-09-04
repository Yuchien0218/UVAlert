<script setup lang="ts">
import { RouterView } from "vue-router";
import AppShell from "./components/shell/AppShell.vue";
</script>

<template>
  <AppShell>
    <!--
      換頁的離場轉場（2026-09-04，裁決 4：接受多 120–160ms）。

      在這之前 page-stack 只處理進場——舊頁瞬間消失、新頁才開始淡入，
      中間有一格「什麼都沒有」的空白。加上離場之後，舊頁先淡出，新頁接手。

      mode="out-in" 而不是預設的同時進出：兩頁同時存在會疊在一起，在
      #FAF5EC 這種低對比暖底上會讀成鬼影。代價是總時間變成離場 ＋ 進場，
      也就是使用者接受的那 160ms。

      :key 用 route.path 而不是 route.fullPath——查詢字串變化（例如衛教
      分類的篩選）不該整頁重來。
    -->
    <RouterView v-slot="{ Component, route }">
      <Transition name="page" mode="out-in">
        <component :is="Component" :key="route.path" />
      </Transition>
    </RouterView>
  </AppShell>
</template>
