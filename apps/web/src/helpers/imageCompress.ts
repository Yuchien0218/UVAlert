export interface CompressImageOptions {
  /** 壓縮後最長邊像素上限，預設 1024px */
  maxDimension?: number;
  /** 輸出品質（0 到 1），預設 0.75 */
  quality?: number;
  /** 輸出 MIME 類型，預設 image/jpeg */
  mimeType?: "image/webp" | "image/jpeg";
}

/**
 * 依據原始尺寸與長邊限制，等比計算縮放後的目標長寬。
 */
export function calculateTargetDimensions(
  origWidth: number,
  origHeight: number,
  maxDimension = 1280
): { width: number; height: number } {
  if (origWidth <= 0 || origHeight <= 0) {
    return { width: Math.max(1, origWidth), height: Math.max(1, origHeight) };
  }

  if (origWidth <= maxDimension && origHeight <= maxDimension) {
    return { width: origWidth, height: origHeight };
  }

  if (origWidth >= origHeight) {
    const width = maxDimension;
    const height = Math.round((origHeight * maxDimension) / origWidth);
    return { width, height: Math.max(1, height) };
  }

  const height = maxDimension;
  const width = Math.round((origWidth * maxDimension) / origHeight);
  return { width: Math.max(1, width), height };
}

/**
 * 將影像來源繪製至暫存 Canvas 轉出 Data URL，並在 finally 歸零尺寸立即釋放行動裝置 GPU 緩衝。
 */
function renderSourceToDataUrl(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  maxDimension: number,
  mimeType: "image/webp" | "image/jpeg",
  quality: number
): string | null {
  const { width, height } = calculateTargetDimensions(
    sourceWidth,
    sourceHeight,
    maxDimension
  );
  const canvas = document.createElement("canvas");
  try {
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(source, 0, 0, width, height);
    return canvas.toDataURL(mimeType, quality);
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}

/**
 * 將 File 物件轉成 Data URL。支援瀏覽器 FileReader 與 Node.js 環境。
 */
async function readFileAsDataUrl(file: File | Blob): Promise<string> {
  if (typeof FileReader !== "undefined") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("FileReader result is not a string"));
        }
      };
      reader.onerror = () =>
        reject(reader.error ?? new Error("FileReader error"));
      reader.readAsDataURL(file);
    });
  }

  // Node.js fallback
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const type = file.type || "image/jpeg";
  return `data:${type};base64,${base64}`;
}

/**
 * 從頁內即時鏡頭 `<video>` 擷取當前畫面並壓縮為 Data URL。
 */
export function captureVideoFrameToDataUrl(
  video: HTMLVideoElement,
  options: CompressImageOptions = {}
): string | null {
  if (typeof document === "undefined") return null;
  const {
    maxDimension = 1024,
    quality = 0.75,
    mimeType = "image/jpeg"
  } = options;

  const vw = video.videoWidth || video.clientWidth || 0;
  const vh = video.videoHeight || video.clientHeight || 0;
  if (vw <= 0 || vh <= 0) return null;

  return renderSourceToDataUrl(
    video,
    vw,
    vh,
    maxDimension,
    mimeType,
    quality
  );
}

/**
 * 將圖片檔案等比縮放並壓縮為 WebP 或 JPEG 之 Base64 Data URL。
 *
 * 優先使用 `createImageBitmap` 並在繪製完成當下同步呼叫 `bitmap.close()` 與歸零 Canvas 尺寸，
 * 避免高畫素相機照片殘留於行動裝置原生／GPU 記憶體引發分頁閃退重整。
 */
export async function compressImageFile(
  file: File | Blob,
  options: CompressImageOptions = {}
): Promise<string> {
  const {
    maxDimension = 1024,
    quality = 0.75,
    mimeType = "image/jpeg"
  } = options;

  // 若不在瀏覽器環境或環境不支援 Canvas 2D，直接降級回傳原始檔案之 Data URL
  if (
    typeof document === "undefined" ||
    typeof window === "undefined" ||
    !document.createElement("canvas").getContext?.("2d")
  ) {
    return readFileAsDataUrl(file);
  }

  // 路徑一：優先使用 createImageBitmap 以支援同步 close() 立即釋放 C++ 點陣圖記憶體
  if (typeof globalThis.createImageBitmap === "function") {
    try {
      const bitmap = await globalThis.createImageBitmap(file);
      try {
        const dataUrl = renderSourceToDataUrl(
          bitmap,
          bitmap.width,
          bitmap.height,
          maxDimension,
          mimeType,
          quality
        );
        if (dataUrl !== null) {
          return dataUrl;
        }
      } finally {
        bitmap.close();
      }
    } catch {
      // 若瀏覽器對特定圖片格式不支援 createImageBitmap，自動退回下方 Image + ObjectURL 路徑
    }
  }

  // 路徑二：URL.createObjectURL + HTMLImageElement 備援
  const hasObjectURL =
    typeof URL !== "undefined" && typeof URL.createObjectURL === "function";

  return new Promise<string>((resolve) => {
    const objectUrl = hasObjectURL ? URL.createObjectURL(file) : null;
    const img = new Image();

    const cleanup = () => {
      img.onload = null;
      img.onerror = null;
      if (objectUrl && typeof URL.revokeObjectURL === "function") {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {
          // ignore
        }
      }
    };

    img.onload = () => {
      try {
        const compressedDataUrl = renderSourceToDataUrl(
          img,
          img.naturalWidth || img.width,
          img.naturalHeight || img.height,
          maxDimension,
          mimeType,
          quality
        );
        img.src = "";
        cleanup();
        if (compressedDataUrl !== null) {
          resolve(compressedDataUrl);
          return;
        }
        readFileAsDataUrl(file).then(resolve).catch(() => resolve(""));
      } catch {
        img.src = "";
        cleanup();
        readFileAsDataUrl(file).then(resolve).catch(() => resolve(""));
      }
    };

    img.onerror = () => {
      img.src = "";
      cleanup();
      readFileAsDataUrl(file).then(resolve).catch(() => resolve(""));
    };

    if (objectUrl) {
      img.src = objectUrl;
    } else {
      readFileAsDataUrl(file)
        .then((dataUrl) => {
          img.src = dataUrl;
        })
        .catch(() => resolve(""));
    }
  });
}
