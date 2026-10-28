// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { calculateTargetDimensions, compressImageFile } from "./imageCompress";

describe("calculateTargetDimensions", () => {
  it("keeps original dimensions when both width and height are within maxDimension", () => {
    const result = calculateTargetDimensions(800, 600, 1280);
    expect(result).toEqual({ width: 800, height: 600 });
  });

  it("scales down landscape image so width equals maxDimension with correct aspect ratio", () => {
    // 4000x2000 -> 1280x640
    const result = calculateTargetDimensions(4000, 2000, 1280);
    expect(result).toEqual({ width: 1280, height: 640 });
  });

  it("scales down portrait image so height equals maxDimension with correct aspect ratio", () => {
    // 1500x3000 -> 640x1280
    const result = calculateTargetDimensions(1500, 3000, 1280);
    expect(result).toEqual({ width: 640, height: 1280 });
  });

  it("handles square image correctly", () => {
    // 2000x2000 -> 1280x1280
    const result = calculateTargetDimensions(2000, 2000, 1280);
    expect(result).toEqual({ width: 1280, height: 1280 });
  });

  it("handles image exactly at maxDimension without change", () => {
    const result = calculateTargetDimensions(1280, 720, 1280);
    expect(result).toEqual({ width: 1280, height: 720 });
  });

  it("uses 1280 as default maxDimension", () => {
    const result = calculateTargetDimensions(2560, 1440);
    expect(result.width).toBe(1280);
    expect(result.height).toBe(720);
  });

  it("protects against non-positive dimensions", () => {
    const result = calculateTargetDimensions(0, -100);
    expect(result.width).toBe(1);
    expect(result.height).toBe(1);
  });
});

describe("compressImageFile", () => {
  it("reads file as data URL fallback when canvas context is unavailable (happy-dom)", async () => {
    const file = new File(["dummy-image-bytes"], "photo.jpg", {
      type: "image/jpeg"
    });

    const result = await compressImageFile(file);
    // 即使在不支援 canvas 2d 的環境下，也能優雅降級回傳 data URL
    expect(result).toMatch(/^data:image\//);
  });

  it("compresses and returns data URL when canvas 2d context is available", async () => {
    const file = new File(["dummy-image-bytes"], "photo.jpg", {
      type: "image/jpeg"
    });

    const mockCtx = {
      drawImage: vi.fn()
    };
    const mockToDataURL = vi
      .fn()
      .mockReturnValue("data:image/webp;base64,mocked_webp_data");

    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(
      (tagName: string) => {
        if (tagName === "canvas") {
          const canvas = origCreateElement("canvas");
          canvas.getContext = vi.fn().mockReturnValue(mockCtx);
          canvas.toDataURL = mockToDataURL;
          return canvas;
        }
        return origCreateElement(tagName);
      }
    );

    // Mock Image load behavior
    const origImage = globalThis.Image;
    class MockImage {
      width = 2000;
      height = 1000;
      naturalWidth = 2000;
      naturalHeight = 1000;
      #src = "";
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      get src() {
        return this.#src;
      }

      set src(value: string) {
        this.#src = value;
        setTimeout(() => {
          this.onload?.();
        }, 0);
      }
    }
    globalThis.Image = MockImage as unknown as typeof Image;

    try {
      const result = await compressImageFile(file, {
        maxDimension: 1280,
        quality: 0.8,
        mimeType: "image/webp"
      });

      expect(result).toBe("data:image/webp;base64,mocked_webp_data");
      expect(mockCtx.drawImage).toHaveBeenCalledWith(
        expect.anything(),
        0,
        0,
        1280,
        640
      );
      expect(mockToDataURL).toHaveBeenCalledWith("image/webp", 0.8);
    } finally {
      globalThis.Image = origImage;
      vi.restoreAllMocks();
    }
  });
});
