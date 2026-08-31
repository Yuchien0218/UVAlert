<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import GearForm from "../components/product/GearForm.vue";
import IconButton from "../components/common/IconButton.vue";

/**
 * S-12 新增防曬裝備／S-13 編輯防曬裝備的獨立頁殼。
 *
 * 2026-08-23 拆成頁殼＋`GearForm.vue`：表單邏輯本身抽到 `GearForm`，
 * 讓設定流程能用 `GearFormSheet.vue` 同一份邏輯在同頁內開合，不必
 * 整頁跳轉（見 `GearForm.vue` 頂部註解與 Sitemap §2.2）。這個頁殼只負責
 * 這條路由獨有的東西：router 導頁與 `returnTo` 查詢參數。
 */
const route = useRoute();
const router = useRouter();

const productId = computed(() =>
  typeof route.params.id === "string" ? route.params.id : null
);
const isEdit = computed(() => productId.value !== null);

/**
 * 設定流程送來的返回路徑，存完要送回設定頁。
 * 2026-08-24：設定合併成單一頁面後，`/setup/timing` 改為 `/setup`。
 */
const returnTo = computed(() =>
  route.query.returnTo === "/setup" ? "/setup" : null
);

async function handleSaved(): Promise<void> {
  if (returnTo.value !== null) {
    await router.replace(returnTo.value);
    return;
  }
  await router.replace({ name: "products" });
}

function handleCancel(): void {
  void router.back();
}
</script>

<template>
  <div class="page-stack gear-form-page">
    <!--
      2026-08-31：標題與叉叉同列、說明獨立成一列。
      原本是 flex ＋ 一個包住標題與說明的 <div>，叉叉貼齊整塊的頂端——
      於是 44px 的按鈕把**整段說明**的可用寬度都吃掉，說明因此提早換行；
      叉叉也停在說明那一塊的上緣，跟標題對不齊。拆成兩列之後說明拿回整個
      寬度，叉叉也真的落在標題的水平中線上。
    -->
    <header class="form-heading">
      <h1 class="page-heading__title" data-typography-role="page-title">
        {{ isEdit ? "編輯防曬裝備" : "新增防曬裝備" }}
      </h1>
      <IconButton
        icon="tool-close"
        label="取消"
        @click="handleCancel"
      />
      <p>資料會先儲存在這台裝置；若已開啟同步，之後也可以同步到雲端。</p>
    </header>

    <GearForm :product-id="productId" @saved="handleSaved" />
  </div>
</template>

<style scoped>
h1,
p {
  margin: 0;
}

/* 關閉控制項用 app.css 的共用 .icon-button，不在這裡另寫一份。 */
.form-heading {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  /* 叉叉的中心對齊標題那一列的中線，不是整塊的頂端。 */
  align-items: center;
  column-gap: var(--space-4);
}

.form-heading p {
  /* 說明橫跨兩欄，拿回被按鈕吃掉的那 44px。 */
  grid-column: 1 / -1;
  margin-top: var(--space-3);
  color: var(--text-body);
  line-height: var(--line-height-body);
}
</style>
