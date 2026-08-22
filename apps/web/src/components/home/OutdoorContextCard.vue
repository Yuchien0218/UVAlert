<script setup lang="ts">
import Icon from "../icons/Icon.vue";

interface Props {
  regionName: string | null;
  /**
   * 今日日間溫度（攝氏），與 UV 同源於 CWA F-D0047-091。
   *
   * 純資訊，不影響補擦倒數。資料可能缺，缺的時候是 null，
   * 整列不顯示——不要用 0 或「--」佔位。
   */
  temperatureCelsius?: number | null;
}

withDefaults(defineProps<Props>(), {
  temperatureCelsius: null
});
</script>

<template>
  <section id="outdoor-context" class="context-card" aria-labelledby="context-title">
    <div class="context-card__heading">
      <div>
        <h2 id="context-title" class="context-card__title">
          戶外資訊
        </h2>
      </div>
      <Icon name="context-outdoor" :size="24" />
    </div>
    <div class="context-card__row">
      <div class="context-card__content">
        <strong class="context-card__label">
          {{
            regionName === null
              ? "目前未設定地區"
              : `目前地區：${regionName}`
          }}
        </strong>
        <p class="context-card__description">
          {{
            regionName === null
              ? "不影響這台裝置上已儲存的提醒"
              : "五日 UV 預報會使用這個地區的資料"
          }}
        </p>
      </div>
      <RouterLink
        class="button button--quiet context-card__cta"
        to="/region"
      >
        {{ regionName === null ? "設定地區" : "變更地區" }}
      </RouterLink>
    </div>

    <p v-if="temperatureCelsius !== null" class="context-card__temperature">
      今日氣溫 {{ Math.round(temperatureCelsius) }}°C
      <span class="context-card__temperature-note">
        僅供出門參考，不影響補擦倒數
      </span>
    </p>
  </section>
</template>

<style scoped>
.context-card {
  display: grid;
  gap: var(--space-4);
  padding-top: var(--space-5);
  border-top: 1px solid var(--border-subtle);
}

.context-card__heading {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: var(--space-4);
}

.context-card__title {
  margin: 0;
  font-size: var(--font-size-section-title);
}

.context-card__row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
}

.context-card__content {
  flex: 1;
  min-width: 0;
}

.context-card__label {
  display: block;
  margin: 0;
  font-weight: 500;
  font-size: var(--font-size-body);
  line-height: 1.4;
}

.context-card__description {
  display: block;
  margin: var(--space-1) 0 0;
  color: var(--text-secondary);
  font-size: var(--font-size-body);
  line-height: 1.6;
}

.context-card__cta {
  /* app.css 在 max-width: 31rem 讓 .button 滿版；在這個 flex row 裡會吃光整列，
     把 .context-card__content 壓成 0 寬（文字一字一行）。只覆寫本區塊的 CTA，
     不動全站共用的 .button。 */
  width: auto;
  flex-shrink: 0;
  padding: var(--space-2) var(--space-4);
  white-space: nowrap;
}

.context-card__temperature {
  margin: 0;
  font-size: var(--font-size-body);
  line-height: 1.6;
}

.context-card__temperature-note {
  display: block;
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
}
</style>
