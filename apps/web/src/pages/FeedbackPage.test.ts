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
});
