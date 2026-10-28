export interface CompressImageOptions {
  /** 壓縮後最長邊像素上限，預設 1280px */
  maxDimension?: number;
  /** 輸出品質（0 到 1），預設 0.8 */
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
 * 將圖片檔案等比縮放並壓縮為 WebP 或 JPEG 之 Base64 Data URL。
 *
 * 優先使用 URL.createObjectURL(file) 載入圖片以避免在記憶體建立龐大的原始 Base64 字串，
 * 載入完成或失敗後立即呼叫 URL.revokeObjectURL 釋放記憶體。
 * 若執行環境缺少 Canvas 2D 支援（如測試環境或老舊瀏覽器），
 * 自動優雅降級為原始檔案之 Data URL。
 */
export async function compressImageFile(
  file: File | Blob,
  options: CompressImageOptions = {}
): Promise<string> {
  const {
    maxDimension = 1280,
    quality = 0.8,
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

  const hasObjectURL =
    typeof URL !== "undefined" && typeof URL.createObjectURL === "function";

  return new Promise<string>((resolve) => {
    const objectUrl = hasObjectURL ? URL.createObjectURL(file) : null;
    const img = new Image();

    const cleanup = () => {
      if (objectUrl && typeof URL.revokeObjectURL === "function") {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {
          // ignore
        }
      }
    };

    img.onload = () => {
      cleanup();
      try {
        const { width, height } = calculateTargetDimensions(
          img.naturalWidth || img.width,
          img.naturalHeight || img.height,
          maxDimension
        );

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          readFileAsDataUrl(file).then(resolve).catch(() => resolve(""));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL(mimeType, quality);
        resolve(compressedDataUrl);
      } catch {
        readFileAsDataUrl(file).then(resolve).catch(() => resolve(""));
      }
    };

    img.onerror = () => {
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
