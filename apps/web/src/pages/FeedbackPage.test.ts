// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { shallowReadonly, shallowRef } from "vue";
import { describe, expect, it, vi } from "vitest";
import FeedbackPage from "./FeedbackPage.vue";

vi.mock("../app/injection", () => ({
  useFeedbackController: vi.fn()
}));

vi.mock("vue-router", () => ({
  useRouter: () => ({ push: vi.fn() })
}));

import { useFeedbackController } from "../app/injection";

describe("FeedbackPage", () => {
  it("讓使用者選擇隱私或帳號資料請求", () => {
    vi.mocked(useFeedbackController).mockReturnValue({
      state: shallowReadonly(shallowRef({ status: "idle", error: null })),
      submit: vi.fn(async () => true)
    } as never);

    const wrapper = mount(FeedbackPage, {
      global: {
        stubs: { IconButton: true, InlineLoader: true, AppNotice: true }
      }
    });

    const privacyRequestOption = wrapper.get('option[value="privacy_request"]');

    expect(privacyRequestOption.text()).toBe("隱私／帳號資料請求");
  });

  it("根據所選問題類型動態切換描述標籤與提示文字，並簡化信箱標籤", async () => {
    vi.mocked(useFeedbackController).mockReturnValue({
      state: shallowReadonly(shallowRef({ status: "idle", error: null })),
      submit: vi.fn(async () => true)
    } as never);

    const wrapper = mount(FeedbackPage, {
      global: {
        stubs: { IconButton: true, InlineLoader: true, AppNotice: true }
      }
    });

    const textarea = wrapper.get("textarea");
    const select = wrapper.get("select");

    // 預設為 bug（功能無法正常使用）
    expect(wrapper.text()).toContain("問題描述");
    expect(textarea.attributes("placeholder")).toBe(
      "請描述發生的狀況與操作步驟，幫助我們更快排查"
    );

    // 切換至 feature_request（我有功能建議）
    await select.setValue("feature_request");
    expect(wrapper.text()).toContain("建議內容");
    expect(textarea.attributes("placeholder")).toBe(
      "分享你期待的新功能或使用體驗改善想法"
    );

    // 切換至 content_correction（衛教內容需要更正）
    await select.setValue("content_correction");
    expect(wrapper.text()).toContain("更正說明");
    expect(textarea.attributes("placeholder")).toBe(
      "請指出有疑慮的衛教文章、數值或章節，以及建議修正內容"
    );

    // 切換至 privacy_request（隱私／帳號資料請求）
    await select.setValue("privacy_request");
    expect(wrapper.text()).toContain("請求內容");
    expect(textarea.attributes("placeholder")).toBe(
      "請說明需要查閱、匯出或刪除的帳號與隱私資料項目"
    );

    // 驗證聯絡信箱標籤不重複包含（選填）
    expect(wrapper.text()).toContain("聯絡信箱");
    expect(wrapper.text()).not.toContain("聯絡信箱（選填）");
  });
});
