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

  it("input 不強制綁定 capture 屬性以避免行動裝置相機佔用記憶體導致頁面重載", () => {
    // 不綁 capture="environment"，由行動裝置彈出原生選單（拍照或選相簿）
    expect(source).not.toContain('capture="environment"');
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
  compressImageFile: vi.fn().mockResolvedValue("data:image/webp;base64,MOCK"),
  captureVideoFrameToDataUrl: vi
    .fn()
    .mockReturnValue("data:image/jpeg;base64,LIVE_SHOT")
}));

vi.mock("../../app/injection", () => ({
  useWebAppServices: vi.fn(() => ({}))
}));

// 因 GearPhotoScannerSheet 呼叫 fetch（透過 Edge Function），使用 vi.stubGlobal mock
const mockFetch = vi.fn();

beforeEach(() => {
  window.sessionStorage.clear();
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

  it("辨識失敗時正確顯示後端 ErrorResponseData 物件內的錯誤訊息，不出現 [object Object]", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 502,
      json: () =>
        Promise.resolve({
          error: {
            code: "UPSTREAM_ERROR",
            message: "視覺辨識服務暫時無法回應，請稍後再試"
          }
        })
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
    const alertText = wrapper.find('[role="alert"]').text();
    expect(alertText).toContain("視覺辨識服務暫時無法回應，請稍後再試");
    expect(alertText).not.toContain("[object Object]");
  });

  it("辨識失敗且後端回傳純字串或無法解析 JSON 時也能優雅顯示錯誤", async () => {
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
    const alertText = wrapper.find('[role="alert"]').text();
    expect(alertText).toContain("Internal Server Error");
    expect(alertText).not.toContain("[object Object]");
  });

  it("支援 getUserMedia 時以頁內即時鏡頭連拍正反面，不跳離頁面且拍完立即釋放鏡頭軌", async () => {
    const stopTrack = vi.fn();
    const baseStream =
      typeof MediaStream !== "undefined" ? new MediaStream() : {};
    const fakeStream = Object.assign(baseStream, {
      getTracks: () => [{ stop: stopTrack }]
    }) as unknown as MediaStream;
    const getUserMedia = vi.fn().mockResolvedValue(fakeStream);
    Object.defineProperty(window.navigator, "mediaDevices", {
      value: { getUserMedia },
      configurable: true
    });

    const wrapper = mount(GearPhotoScannerSheet, {
      props: { gearCategory: "sunscreen" }
    });

    await wrapper.find("#photo-front-camera-btn").trigger("click");
    await flushPromises();

    expect(getUserMedia).toHaveBeenCalledWith({
      video: expect.objectContaining({
        facingMode: { ideal: "environment" }
      }),
      audio: false
    });
    expect(wrapper.find("#scanner-live-video").exists()).toBe(true);

    // 拍下正面 -> 自動切換為待拍背面，鏡頭維持開啟避免重複授權
    await wrapper.find("#scanner-shutter-btn").trigger("click");
    await flushPromises();
    expect(stopTrack).not.toHaveBeenCalled();
    expect(wrapper.find("#scanner-live-video").exists()).toBe(true);

    // 拍下背面 -> 正反面皆完成，自動關閉頁內鏡頭並停止 MediaStreamTrack
    await wrapper.find("#scanner-shutter-btn").trigger("click");
    await flushPromises();
    expect(stopTrack).toHaveBeenCalledTimes(1);
    expect(wrapper.find("#scanner-live-video").exists()).toBe(false);
    expect(wrapper.findAll(".photo-slot__thumbnail")).toHaveLength(2);
    expect(
      wrapper.find("#photo-scan-submit").attributes("disabled")
    ).toBeUndefined();
  });

  it("getUserMedia 權限遭拒時顯示相簿選圖引導且不拋出未捕捉錯誤", async () => {
    const getUserMedia = vi
      .fn()
      .mockRejectedValue(new Error("Permission denied"));
    Object.defineProperty(window.navigator, "mediaDevices", {
      value: { getUserMedia },
      configurable: true
    });

    const wrapper = mount(GearPhotoScannerSheet, {
      props: { gearCategory: "sunscreen" }
    });

    await wrapper.find("#photo-front-camera-btn").trigger("click");
    await flushPromises();

    expect(wrapper.find("#scanner-live-video").exists()).toBe(false);
    expect(wrapper.find('[role="alert"]').text()).toContain("相簿");
  });

  it("拍攝或選圖後自動暫存至 sessionStorage，即使分頁重整重新掛載仍完整還原正反面預覽，取消時一併清除", async () => {
    const wrapper1 = mount(GearPhotoScannerSheet, {
      props: { gearCategory: "sunscreen" }
    });

    const frontInput = wrapper1.find<HTMLInputElement>("#photo-front");
    Object.defineProperty(frontInput.element, "files", {
      value: { 0: makeFile("front.jpg"), length: 1 },
      configurable: true
    });
    await frontInput.trigger("change");
    await flushPromises();
    expect(frontInput.element.value).toBe("");

    const backInput = wrapper1.find<HTMLInputElement>("#photo-back");
    Object.defineProperty(backInput.element, "files", {
      value: { 0: makeFile("back.jpg"), length: 1 },
      configurable: true
    });
    await backInput.trigger("change");
    await flushPromises();
    expect(backInput.element.value).toBe("");

    // 模擬 Android 分頁重整：卸載舊元件並重新掛載新實例
    wrapper1.unmount();

    const wrapper2 = mount(GearPhotoScannerSheet, {
      props: { gearCategory: "sunscreen" }
    });
    await flushPromises();

    expect(wrapper2.findAll(".photo-slot__thumbnail")).toHaveLength(2);
    expect(
      wrapper2.find("#photo-scan-submit").attributes("disabled")
    ).toBeUndefined();

    // 點擊取消應清除暫存照片
    const cancelBtn = wrapper2
      .findAll("button")
      .find((b) => b.text() === "取消");
    await cancelBtn!.trigger("click");

    const wrapper3 = mount(GearPhotoScannerSheet, {
      props: { gearCategory: "sunscreen" }
    });
    expect(wrapper3.findAll(".photo-slot__thumbnail")).toHaveLength(0);
  });
});
