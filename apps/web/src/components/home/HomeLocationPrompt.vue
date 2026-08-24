<script setup lang="ts">
/**
 * 沒有地區時的提示卡。
 *
 * 文案先說明狀況、再給下一步，符合 `copy-audit.md`「錯誤與限制文字先說明
 * 狀況，再提供下一步」。刻意不阻擋任何其他操作——Sitemap §一：定位或
 * 網路不足時「仍不得阻擋本機倒數與手動操作」。
 *
 * **與 wireframe 04 的兩處刻意差異**：
 *
 * 一、wireframe 寫「無法取得你的位置」，這裡改成「尚未設定地區」。首頁
 * 能判斷的只有 `uvForecast.phase === "no_region"`，那代表**沒有設定過
 * 地區**，不代表定位失敗——第一次開啟 App 時根本還沒問過定位權限，
 * 說「無法取得你的位置」是假的。真正的定位錯誤狀態在 `RegionController`
 * 手上，屬於 `/region` 那一頁。
 *
 * 二、wireframe 的按鈕寫「開啟位置服務」，這裡用「設定地區」。理由有三：
 * `copy-audit.md` 統一規則訂「地理與 UV 預報使用『地區』」；網頁無法開啟
 * 作業系統的定位設定，權限在 OS 層被拒時這個按鈕會承諾做不到的事；而
 * `/region` 同時提供手動選擇，那條路永遠可用。
 */
</script>

<template>
  <div class="location-prompt">
    <p class="location-prompt__message">
      尚未設定地區，所以沒有 UV 資料。
    </p>
    <RouterLink class="button button--quiet location-prompt__cta" to="/region">
      設定地區
    </RouterLink>
  </div>
</template>

<style scoped>
.location-prompt {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-4);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-surface-soft);
}

.location-prompt__message {
  margin: 0;
  color: var(--color-body-strong, var(--text-primary));
  font-size: var(--font-size-body);
}

.location-prompt__cta {
  justify-self: stretch;
}
</style>
