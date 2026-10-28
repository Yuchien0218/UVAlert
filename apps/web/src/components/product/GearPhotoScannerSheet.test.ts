// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ParseSunscreenLabelResponse } from "@sunshield/contracts";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * GearPhotoScannerSheet 測試
 *
 * 根據 Task 4 規格：
 * - 渲染正面與背面照片上傳按鈕
 * - 選擇照片後調用壓縮函式並顯示預覽縮圖
 * - 點擊「開始辨識」進入 loading 狀態（顯示 InlineLoader）
 * - 辨識完成 emit "detected" 事件
 *
 * 靜態守門：從原始碼字串掃結構契約
 *
 * 注意：happy-dom 下 import.meta.url 為 "about:blank"，無法用於 new URL()。
 * 改用 __dirname / fileURLToPath 組路徑讀取 .vue 原始碼。
 */

// 在 happy-dom 環境下 import.meta.url 可能為 "about:blank"；
// 使用 Vitest 注入的 __dirname 作為 fallback
declare const __dirname: string;

const vueFilePath = resolve(__dirname, "./GearPhotoScannerSheet.vue");
const source = readFileSync(vueFilePath, "utf8");

const strip = (input: string): string =>
  input
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const code = strip(source);

// ===========================
// 靜態結構守門
// ===========================

describe("GearPhotoScannerSheet 靜態結構", () => {
  /*
   * 守 HTML 屬性時改用 source（未 strip），原因：
   * strip 正則 /\/\*[\s\S]*?\*\//g 會把 accept="image/*" 裡的 /*
   * 誤當 CSS 注釋開頭，導致之後的 template 屬性被吃掉成為假陰性。
   * JS 邏輯（defineEmits、compressImageFile 等）繼續用 code 以排除注釋干擾。
   */
  it("包含正面照片上傳輸入框（必要）", () => {
    expect(source).toContain('id="photo-front"');
    expect(source).toContain('accept="image/*"');
  });

  it("包含背面照片上傳輸入框（選填）", () => {
    expect(source).toContain('id="photo-back"');
  });

  it("正面 input 標有 capture 屬性以支援行動裝置相機", () => {
    // 守正面輸入框有 capture="environment"（對準後鏡頭）
    // 用 source（未 strip）以免 image/* 的 /* 被誤吃
    expect(source).toMatch(/id="photo-front"[\s\S]{0,300}capture="environment"/);
  });

  it("包含「開始辨識」觸發按鈕", () => {
    // 守門按鈕的 id，供自動化測試與 a11y 使用
    expect(source).toContain('id="photo-scan-submit"');
  });

  it("使用 InlineLoader 顯示 loading 狀態", () => {
    expect(code).toContain("InlineLoader");
  });

  it("emit detected 事件（辨識完成後）", () => {
    // detected emit 在 defineEmits 裡定義
    expect(code).toContain("detected");
    expect(code).toContain("defineEmits");
  });

  it("使用 compressImageFile 進行前端壓縮", () => {
    expect(code).toContain("compressImageFile");
  });

  it("只有 sunscreen 品類才顯示（元件本身不做過濾，由父層控制，但 prop 包含 gearCategory）", () => {
    // 元件接收 gearCategory prop 讓父層可以用 v-if 判斷
    expect(code).toContain("gearCategory");
  });

  it("「由照片自動填入」提示標籤存在（a11y 與 UX 要求）", () => {
    // 辨識結果回傳後須有「已由照片自動填入」或「由 AI 辨識填入」類型提示
    expect(code).toContain("AI 辨識");
  });

  it("隱私說明：不儲存照片", () => {
    // 規格要求告知使用者照片不落盤
    expect(code).toContain("不會儲存");
  });

  it("介面與說明文字嚴格禁止使用 Emoji", () => {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    expect(code).not.toMatch(emojiRegex);
  });
});

// ===========================
// 動態行為測試（mount）
// ===========================

vi.mock("../../helpers/imageCompress", () => ({
  compressImageFile: vi.fn().mockResolvedValue("data:image/webp;base64,MOCK")
}));

vi.mock("../../app/injection", () => ({
  useWebAppServices: vi.fn(() => ({}))
}));

// 因 GearPhotoScannerSheet 呼叫 fetch（透過 Edge Function），使用 vi.stubGlobal mock
const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockReset();
});

import GearPhotoScannerSheet from "./GearPhotoScannerSheet.vue";

function makeFile(name = "sunscreen.jpg", type = "image/jpeg"): File {
  return new File(["fake-bytes"], name, { type });
}

describe("GearPhotoScannerSheet 動態行為", () => {
  it("未選照片時「開始辨識」按鈕應為 disabled", async () => {
    const wrapper = mount(GearPhotoScannerSheet, {
      props: { gearCategory: "sunscreen" }
    });
    const btn = wrapper.find("#photo-scan-submit");
    expect(btn.attributes("disabled")).toBeDefined();
  });

  it("選擇正面照片後呼叫 compressImageFile", async () => {
    const { compressImageFile } = await import("../../helpers/imageCompress");
    const wrapper = mount(GearPhotoScannerSheet, {
      props: { gearCategory: "sunscreen" }
    });

    const frontInput = wrapper.find<HTMLInputElement>("#photo-front");
    const file = makeFile();
    Object.defineProperty(frontInput.element, "files", {
      value: { 0: file, length: 1 },
      configurable: true
    });
    await frontInput.trigger("change");
    await flushPromises();

    expect(compressImageFile).toHaveBeenCalledWith(file);
  });

  it("選正面照片後啟用「開始辨識」按鈕", async () => {
    const wrapper = mount(GearPhotoScannerSheet, {
      props: { gearCategory: "sunscreen" }
    });
    const frontInput = wrapper.find<HTMLInputElement>("#photo-front");
    Object.defineProperty(frontInput.element, "files", {
      value: { 0: makeFile(), length: 1 },
      configurable: true
    });
    await frontInput.trigger("change");
    await flushPromises();

    const btn = wrapper.find("#photo-scan-submit");
    expect(btn.attributes("disabled")).toBeUndefined();
  });

  it("點擊「開始辨識」後進入 loading 狀態，顯示 InlineLoader", async () => {
    // Arrange: fetch 永遠 pending
    mockFetch.mockReturnValue(new Promise(() => {}));

    const wrapper = mount(GearPhotoScannerSheet, {
      props: { gearCategory: "sunscreen" }
    });
    const frontInput = wrapper.find<HTMLInputElement>("#photo-front");
    Object.defineProperty(frontInput.element, "files", {
      value: { 0: makeFile(), length: 1 },
      configurable: true
    });
    await frontInput.trigger("change");
    await flushPromises();

    await wrapper.find("#photo-scan-submit").trigger("click");
    await flushPromises();

    // 應顯示 InlineLoader
    expect(wrapper.findComponent({ name: "InlineLoader" }).exists()).toBe(true);
  });

  it("辨識成功後 emit detected 事件，帶上解析結果", async () => {
    const mockResult = {
      displayName: "測試防曬乳 SPF50",
      spf: 50,
      paGrade: "PA++++",
      waterResistanceStatus: "none",
      reapplicationIntervalMinutes: 120,
      preExposureWaitMinutes: 15,
      expiryDate: null,
      sunscreenClaimConfirmed: true,
      notes: null
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResult)
    });

    const wrapper = mount(GearPhotoScannerSheet, {
      props: { gearCategory: "sunscreen" }
    });
    const frontInput = wrapper.find<HTMLInputElement>("#photo-front");
    Object.defineProperty(frontInput.element, "files", {
      value: { 0: makeFile(), length: 1 },
      configurable: true
    });
    await frontInput.trigger("change");
    await flushPromises();

    await wrapper.find("#photo-scan-submit").trigger("click");
    await flushPromises();

    const emitted = wrapper.emitted<[ParseSunscreenLabelResponse][]>("detected");
    expect(emitted).toBeDefined();
    expect(emitted?.[0]?.[0]).toMatchObject({ spf: 50, paGrade: "PA++++" });
  });

  it("辨識失敗時顯示錯誤訊息，不 emit detected", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Internal Server Error" })
    });

    const wrapper = mount(GearPhotoScannerSheet, {
      props: { gearCategory: "sunscreen" }
    });
    const frontInput = wrapper.find<HTMLInputElement>("#photo-front");
    Object.defineProperty(frontInput.element, "files", {
      value: { 0: makeFile(), length: 1 },
      configurable: true
    });
    await frontInput.trigger("change");
    await flushPromises();

    await wrapper.find("#photo-scan-submit").trigger("click");
    await flushPromises();

    expect(wrapper.emitted("detected")).toBeUndefined();
    expect(wrapper.html()).toContain("辨識");
  });
});
