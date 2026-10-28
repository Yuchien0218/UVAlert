<script setup lang="ts">
import { computed, ref, shallowRef } from "vue";
import type { GearCategory } from "@sunshield/contracts";
import type { ParseSunscreenLabelResponse } from "@sunshield/contracts";
import InlineLoader from "../feedback/InlineLoader.vue";
import { compressImageFile } from "../../helpers/imageCompress";

/**
 * 防曬乳外包裝拍照辨識 Sheet 元件。
 *
 * 支援拍攝正面（必要）與背面（選填）兩張照片，透過前端 Canvas 壓縮後
 * 呼叫 Supabase Edge Function `/v1/parse-sunscreen-label`，將 AI 辨識
 * 結果 emit 給父層（`GearForm.vue`）自動填入表單欄位。
 *
 * **隱私設計**：
 * - 照片在前端壓縮後以 base64 傳送至 Edge Function。
 * - 伺服器端純記憶體轉發，零落盤、不存資料庫。
 * - 元件本身不負責儲存任何照片。
 *
 * **品類限定**：父層需確認 `gearCategory === "sunscreen"` 才渲染此元件。
 * 元件接收 `gearCategory` prop，供外層用 `v-if` 條件判斷。
 */

defineProps<{
  /** 目前的裝備品類，父層只應在 sunscreen 時渲染此元件 */
  gearCategory: GearCategory;
}>();

const emit = defineEmits<{
  /**
   * AI 辨識完成，帶上解析結果供父層填入表單。
   * 使用者可在填入後手動修正任何欄位。
   */
  detected: [result: ParseSunscreenLabelResponse];
  /** 使用者點擊取消，關閉此 Sheet */
  cancel: [];
}>();

/** 正面照片（必填）的壓縮後 base64 Data URL */
const frontImageDataUrl = ref<string | null>(null);
/** 背面照片（選填）的壓縮後 base64 Data URL */
const backImageDataUrl = ref<string | null>(null);

/** 辨識狀態 */
const isScanning = shallowRef(false);
/** 辨識錯誤訊息 */
const scanError = shallowRef<string | null>(null);

/** 至少有正面照片時才可送出 */
const canSubmit = computed(
  () => frontImageDataUrl.value !== null && !isScanning.value
);

/**
 * 處理正面照片選擇。
 * 自動以 Canvas 等比壓縮（長邊 1280px，WebP 80% 品質）。
 */
async function onFrontFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  frontImageDataUrl.value = await compressImageFile(file);
}

/**
 * 處理背面照片選擇。
 */
async function onBackFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  backImageDataUrl.value = await compressImageFile(file);
}

/**
 * 呼叫 Edge Function 進行 AI 辨識。
 * 成功後 emit `detected` 事件；失敗時顯示錯誤訊息。
 */
async function startScan(): Promise<void> {
  if (!canSubmit.value || frontImageDataUrl.value === null) return;

  isScanning.value = true;
  scanError.value = null;

  try {
    const images: string[] = [frontImageDataUrl.value];
    if (backImageDataUrl.value !== null) {
      images.push(backImageDataUrl.value);
    }

    const apiBase = import.meta.env.VITE_API_BASE_URL ?? "/v1";
    const response = await fetch(`${apiBase}/parse-sunscreen-label`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        images,
        clientLocalTime: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const detail = (body as { error?: string }).error ?? `HTTP ${response.status}`;
      scanError.value = `辨識失敗：${detail}。請確認照片清晰，或手動填寫。`;
      return;
    }

    const result = (await response.json()) as ParseSunscreenLabelResponse;
    emit("detected", result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "未知錯誤";
    scanError.value = `辨識時發生問題：${message}。請稍後再試，或手動填寫。`;
  } finally {
    isScanning.value = false;
  }
}
</script>

<template>
  <div class="photo-scanner">
    <!--
      隱私說明：告知使用者照片不會儲存，純記憶體轉發。
      規格書（2026-10-27）明確要求此說明，降低使用疑慮。
    -->
    <p class="scanner-privacy-note">
      <span class="scanner-privacy-icon" aria-hidden="true">🔒</span>
      照片僅用於 AI 辨識，<strong>不會儲存</strong>於伺服器。
    </p>

    <!-- 照片上傳區塊 -->
    <div class="photo-slots">
      <!-- 正面照片（必要） -->
      <div class="photo-slot">
        <label for="photo-front" class="photo-slot__label">
          <span class="photo-slot__title">正面包裝</span>
          <span class="photo-slot__badge photo-slot__badge--required">必要</span>
        </label>
        <div
          class="photo-slot__preview"
          :class="{ 'photo-slot__preview--filled': frontImageDataUrl !== null }"
        >
          <img
            v-if="frontImageDataUrl"
            :src="frontImageDataUrl"
            alt="正面照片預覽"
            class="photo-slot__thumbnail"
          />
          <span v-else class="photo-slot__placeholder" aria-hidden="true">
            📷
          </span>
        </div>
        <!--
          capture="environment" 指定後鏡頭，防曬乳包裝通常需要清楚拍到標示。
          行動裝置上開啟相機 App；桌機則開啟檔案選擇。
        -->
        <input
          id="photo-front"
          type="file"
          accept="image/*"
          capture="environment"
          class="photo-slot__input screen-reader-only"
          @change="onFrontFileChange"
        />
        <label for="photo-front" class="button button--secondary photo-slot__trigger">
          {{ frontImageDataUrl ? "重新拍攝" : "拍攝或選擇" }}
        </label>
      </div>

      <!-- 背面照片（選填） -->
      <div class="photo-slot">
        <label for="photo-back" class="photo-slot__label">
          <span class="photo-slot__title">背面包裝</span>
          <span class="photo-slot__badge">選填</span>
        </label>
        <div
          class="photo-slot__preview"
          :class="{ 'photo-slot__preview--filled': backImageDataUrl !== null }"
        >
          <img
            v-if="backImageDataUrl"
            :src="backImageDataUrl"
            alt="背面照片預覽"
            class="photo-slot__thumbnail"
          />
          <span v-else class="photo-slot__placeholder" aria-hidden="true">
            📋
          </span>
        </div>
        <input
          id="photo-back"
          type="file"
          accept="image/*"
          capture="environment"
          class="photo-slot__input screen-reader-only"
          @change="onBackFileChange"
        />
        <label for="photo-back" class="button button--secondary photo-slot__trigger">
          {{ backImageDataUrl ? "重新拍攝" : "拍攝或選擇" }}
        </label>
      </div>
    </div>

    <!-- AI 辨識說明 -->
    <p class="scanner-hint field-helper">
      AI 辨識將自動填入品名、SPF、PA、耐水性與補擦間隔，填入後可手動修正。
    </p>

    <!-- 錯誤訊息 -->
    <p v-if="scanError" class="form-error scanner-error" role="alert">
      {{ scanError }}
    </p>

    <!-- 操作按鈕 -->
    <div class="scanner-actions">
      <button
        id="photo-scan-submit"
        class="button button--primary"
        type="button"
        :disabled="!canSubmit"
        @click="startScan"
      >
        <InlineLoader v-if="isScanning" />
        {{ isScanning ? "辨識中…" : "開始辨識" }}
      </button>
      <button
        class="button button--quiet"
        type="button"
        :disabled="isScanning"
        @click="emit('cancel')"
      >
        取消
      </button>
    </div>
  </div>
</template>

<style scoped>
.photo-scanner {
  display: grid;
  gap: var(--space-4);
}

.scanner-privacy-note {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--color-surface-card);
  color: var(--text-secondary);
  font-size: var(--font-size-supporting);
  line-height: var(--line-height-body);
  margin: 0;
}

.scanner-privacy-icon {
  flex: none;
  font-size: 1rem;
}

/* 兩個照片卡槽並排 */
.photo-slots {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3);
}

.photo-slot {
  display: grid;
  gap: var(--space-2);
}

.photo-slot__label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-caption);
  cursor: default;
}

.photo-slot__title {
  font-weight: 500;
}

.photo-slot__badge {
  padding: 0 var(--space-1);
  border-radius: var(--radius-xs, 4px);
  background: var(--color-hairline);
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
  line-height: 1.4;
}

.photo-slot__badge--required {
  background: var(--color-tracking-soft, #fff3e0);
  color: var(--color-tracking, #e65100);
}

.photo-slot__preview {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 3 / 4;
  border: 1.5px dashed var(--border-subtle);
  border-radius: var(--radius-sm);
  background: var(--color-surface-card);
  overflow: hidden;
  transition: border-color var(--duration-fast) var(--ease-out);
}

.photo-slot__preview--filled {
  border-style: solid;
  border-color: var(--color-muted);
}

.photo-slot__thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-slot__placeholder {
  font-size: 2rem;
  opacity: 0.4;
}

/* 隱藏原生 file input，以 label 為觸發器 */
.photo-slot__input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}

.photo-slot__trigger {
  text-align: center;
  font-size: var(--font-size-caption);
}

.scanner-hint {
  margin: 0;
}

.scanner-error {
  margin: 0;
}

.scanner-actions {
  display: grid;
  gap: var(--space-2);
}

/* button--secondary 若全域尚未定義，提供預設樣式 */
:where(.button--secondary) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-2) var(--space-4);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-primary);
  font-size: var(--font-size-body);
  cursor: pointer;
  transition:
    background-color var(--duration-fast) var(--ease-out),
    filter var(--duration-fast) var(--ease-out);
}

:where(.button--secondary):active {
  filter: brightness(var(--press-dim));
}
</style>
