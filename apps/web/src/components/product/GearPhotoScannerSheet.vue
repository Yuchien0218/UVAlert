<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  shallowRef,
  watch
} from "vue";
import type { GearCategory } from "@sunshield/contracts";
import type { ParseSunscreenLabelResponse } from "@sunshield/contracts";
import InlineLoader from "../feedback/InlineLoader.vue";
import {
  clearScannerPhotosDraft,
  loadScannerPhotosDraft,
  saveScannerPhotosDraft
} from "../../features/product/gearFormDraft";
import {
  captureVideoFrameToDataUrl,
  compressImageFile
} from "../../helpers/imageCompress";
import {
  readSunscreenScanErrorMessage,
  resolveParseSunscreenLabelEndpoint
} from "../../helpers/parseSunscreenLabelEndpoint";

/**
 * 防曬乳外包裝拍照辨識元件。
 *
 * 支援拍攝正面（必要）與背面（選填）兩張照片，透過頁內即時鏡頭
 * （`navigator.mediaDevices.getUserMedia`）直接擷取畫面，避免在 Android
 * Chrome／PWA 切換至外部系統相機 App 時遭作業系統回收背景分頁而發生白畫面重整。
 * 同時保留「從相簿選擇」並將已壓縮縮圖暫存於 `sessionStorage`，分頁重載亦可還原。
 *
 * **隱私設計**：
 * - 照片在前端壓縮後以 base64 傳送至 Edge Function。
 * - 伺服器端純記憶體轉發，零落盤、不存資料庫。
 * - `sessionStorage` 暫存於辨識完成或點擊取消時立即清除。
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
  /** 使用者點擊取消，關閉此區塊 */
  cancel: [];
}>();

const savedPhotos = loadScannerPhotosDraft();

/** 正面照片（必填）的壓縮後 base64 Data URL */
const frontImageDataUrl = ref<string | null>(
  savedPhotos?.frontImageDataUrl ?? null
);
/** 背面照片（選填）的壓縮後 base64 Data URL */
const backImageDataUrl = ref<string | null>(
  savedPhotos?.backImageDataUrl ?? null
);

/** 頁內即時鏡頭狀態 */
const activeCameraSlot = shallowRef<"front" | "back" | null>(null);
const isStartingCamera = shallowRef(false);
const liveVideoEl = ref<HTMLVideoElement | null>(null);
const frontFileInputEl = ref<HTMLInputElement | null>(null);
const backFileInputEl = ref<HTMLInputElement | null>(null);
let activeStream: MediaStream | null = null;

/** 辨識狀態 */
const isScanning = shallowRef(false);
/** 辨識錯誤訊息 */
const scanError = shallowRef<string | null>(null);

/** 至少有正面照片時才可送出 */
const canSubmit = computed(
  () => frontImageDataUrl.value !== null && !isScanning.value
);

watch([frontImageDataUrl, backImageDataUrl], ([front, back]) => {
  saveScannerPhotosDraft({
    frontImageDataUrl: front,
    backImageDataUrl: back
  });
});

function canUseLiveCamera(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function"
  );
}

function stopLiveCamera(): void {
  if (liveVideoEl.value) {
    liveVideoEl.value.srcObject = null;
  }
  if (activeStream) {
    for (const track of activeStream.getTracks()) {
      track.stop();
    }
    activeStream = null;
  }
  activeCameraSlot.value = null;
  isStartingCamera.value = false;
}

onBeforeUnmount(() => {
  stopLiveCamera();
});

async function openLiveCamera(slot: "front" | "back"): Promise<void> {
  scanError.value = null;

  if (!canUseLiveCamera()) {
    const targetInput =
      slot === "front" ? frontFileInputEl.value : backFileInputEl.value;
    targetInput?.click();
    return;
  }

  if (activeStream) {
    activeCameraSlot.value = slot;
    return;
  }

  isStartingCamera.value = true;
  activeCameraSlot.value = slot;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 960 }
      },
      audio: false
    });

    if (activeCameraSlot.value === null) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
      return;
    }

    activeStream = stream;
    await nextTick();
    if (liveVideoEl.value) {
      liveVideoEl.value.srcObject = stream;
      void Promise.resolve(liveVideoEl.value.play?.()).catch(() => undefined);
    }
  } catch {
    stopLiveCamera();
    scanError.value =
      "無法開啟頁內鏡頭，請允許相機權限，或點選下方「從相簿選擇」載入已拍好的照片。";
  } finally {
    isStartingCamera.value = false;
  }
}

function captureFromLiveCamera(): void {
  const slot = activeCameraSlot.value;
  const video = liveVideoEl.value;
  if (!slot || !video) return;

  const dataUrl = captureVideoFrameToDataUrl(video, {
    maxDimension: 1024,
    quality: 0.75
  });

  if (!dataUrl) {
    scanError.value = "鏡頭畫面尚在對焦準備中，請稍候一秒再拍。";
    return;
  }

  scanError.value = null;
  if (slot === "front") {
    frontImageDataUrl.value = dataUrl;
    if (backImageDataUrl.value === null) {
      activeCameraSlot.value = "back";
      return;
    }
    stopLiveCamera();
    return;
  }

  backImageDataUrl.value = dataUrl;
  stopLiveCamera();
}

/**
 * 處理正面相簿照片選擇。
 */
async function onFrontFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  scanError.value = null;
  try {
    frontImageDataUrl.value = await compressImageFile(file);
  } catch {
    scanError.value = "讀取正面照片時發生問題，請重新選擇清晰照片。";
  }
}

/**
 * 處理背面相簿照片選擇。
 */
async function onBackFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  scanError.value = null;
  try {
    backImageDataUrl.value = await compressImageFile(file);
  } catch {
    scanError.value = "讀取背面照片時發生問題，請重新選擇清晰照片。";
  }
}

function handleCancel(): void {
  stopLiveCamera();
  clearScannerPhotosDraft();
  emit("cancel");
}

/**
 * 呼叫 Edge Function 進行 AI 辨識。
 * 成功後 emit `detected` 事件；失敗時顯示錯誤訊息。
 */
async function startScan(): Promise<void> {
  if (!canSubmit.value || frontImageDataUrl.value === null) return;

  stopLiveCamera();
  isScanning.value = true;
  scanError.value = null;

  try {
    const images: string[] = [frontImageDataUrl.value];
    if (backImageDataUrl.value !== null) {
      images.push(backImageDataUrl.value);
    }

    const endpoint = resolveParseSunscreenLabelEndpoint();
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        images,
        clientLocalTime: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const detail = readSunscreenScanErrorMessage(
        body,
        response.status
      ).replace(/[。.]$/u, "");
      scanError.value = `辨識失敗：${detail}。可稍後再試或改為手動填寫。`;
      return;
    }

    const result = (await response.json()) as ParseSunscreenLabelResponse;
    clearScannerPhotosDraft();
    emit("detected", result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知錯誤";
    scanError.value = `辨識時發生問題：${message}。請稍後再試，或手動填寫。`;
  } finally {
    isScanning.value = false;
  }
}
</script>

<template>
  <div class="photo-scanner">
    <p class="scanner-privacy-note">
      照片僅用於 AI 辨識，<strong>不會儲存</strong>於伺服器。
    </p>

    <!-- 頁內即時鏡頭取景框：不跳離瀏覽器，避免行動裝置外部相機觸發分頁重整 -->
    <div v-if="activeCameraSlot !== null" class="live-camera">
      <p class="live-camera__status" role="status" aria-live="polite">
        {{
          activeCameraSlot === "front"
            ? "正在拍攝：正面包裝（必要）"
            : "正面已完成，接著可翻面拍攝背面包裝（選填）"
        }}
      </p>
      <div class="live-camera__viewport">
        <video
          id="scanner-live-video"
          ref="liveVideoEl"
          class="live-camera__video"
          autoplay
          playsinline
          muted
        />
      </div>
      <div class="button-group">
        <button
          id="scanner-shutter-btn"
          class="button button--primary"
          type="button"
          :disabled="isStartingCamera"
          @click="captureFromLiveCamera"
        >
          {{ activeCameraSlot === "front" ? "拍下正面" : "拍下背面" }}
        </button>
        <button
          id="scanner-camera-close"
          class="button button--secondary"
          type="button"
          @click="stopLiveCamera"
        >
          {{ frontImageDataUrl ? "完成拍攝" : "關閉鏡頭" }}
        </button>
      </div>
    </div>

    <!-- 照片預覽與操作卡槽 -->
    <div class="photo-slots">
      <!-- 正面照片（必要） -->
      <div class="photo-slot">
        <div class="photo-slot__label">
          <span class="photo-slot__title">正面包裝</span>
          <span class="photo-slot__badge photo-slot__badge--required">必要</span>
        </div>
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
            未拍攝正面
          </span>
        </div>
        <button
          id="photo-front-camera-btn"
          type="button"
          class="button button--secondary photo-slot__trigger"
          :disabled="isScanning"
          @click="openLiveCamera('front')"
        >
          {{ frontImageDataUrl ? "重新拍攝" : "開啟鏡頭" }}
        </button>
        <input
          id="photo-front"
          ref="frontFileInputEl"
          type="file"
          accept="image/*"
          class="photo-slot__input screen-reader-only"
          @change="onFrontFileChange"
        />
        <label for="photo-front" class="photo-slot__album-link">
          從相簿選擇
        </label>
      </div>

      <!-- 背面照片（選填） -->
      <div class="photo-slot">
        <div class="photo-slot__label">
          <span class="photo-slot__title">背面包裝</span>
          <span class="photo-slot__badge">選填</span>
        </div>
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
            未拍攝背面
          </span>
        </div>
        <button
          id="photo-back-camera-btn"
          type="button"
          class="button button--secondary photo-slot__trigger"
          :disabled="isScanning"
          @click="openLiveCamera('back')"
        >
          {{ backImageDataUrl ? "重新拍攝" : "開啟鏡頭" }}
        </button>
        <input
          id="photo-back"
          ref="backFileInputEl"
          type="file"
          accept="image/*"
          class="photo-slot__input screen-reader-only"
          @change="onBackFileChange"
        />
        <label for="photo-back" class="photo-slot__album-link">
          從相簿選擇
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
        @click="handleCancel"
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
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--color-surface-card);
  color: var(--color-muted);
  border: 1px solid var(--color-hairline);
  font-size: var(--font-size-caption);
  line-height: var(--line-height-body);
  margin: 0;
}

.live-camera {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-surface-card);
}

.live-camera__status {
  margin: 0;
  font-size: var(--font-size-supporting);
  font-weight: var(--font-weight-emphasis);
  line-height: var(--line-height-supporting);
  color: var(--text-emphasis);
}

.live-camera__viewport {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 3 / 4;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
  background: var(--color-surface-cream-strong);
  overflow: hidden;
}

.live-camera__video {
  width: 100%;
  height: 100%;
  object-fit: cover;
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
  font-weight: var(--font-weight-emphasis);
}

.photo-slot__badge {
  padding: 0 var(--space-1);
  border-radius: var(--radius-xs);
  background: var(--color-hairline);
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
  line-height: 1.4;
}

.photo-slot__badge--required {
  background: var(--color-surface-card);
  color: var(--color-primary-text);
  border: 1px solid var(--color-hairline);
}

.photo-slot__preview {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 3 / 4;
  border: 1px dashed var(--color-hairline);
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
  font-size: var(--font-size-caption);
  color: var(--color-muted);
}

/* 隱藏原生 file input，以相簿連結觸發 */
.photo-slot__input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}

.photo-slot__trigger {
  width: 100%;
  text-align: center;
  font-size: var(--font-size-caption);
}

.photo-slot__album-link {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: var(--tap-target);
  color: var(--color-primary-text);
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-emphasis);
  line-height: var(--line-height-caption);
  text-align: center;
  text-decoration: underline;
  text-underline-offset: 0.2em;
  cursor: pointer;
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
</style>
