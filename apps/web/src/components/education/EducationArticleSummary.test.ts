// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import EducationArticleSummary from "./EducationArticleSummary.vue";

describe("EducationArticleSummary", () => {
  it("renders one labelled takeaway without a visible template heading", () => {
    const wrapper = mount(EducationArticleSummary, {
      props: { html: "<p>先依今天的 UV 安排防護。</p>" }
    });

    expect(wrapper.get("section").attributes("aria-label")).toBe("文章摘要");
    expect(wrapper.text()).toContain("先依今天的 UV 安排防護。");
    expect(wrapper.text()).not.toContain("先說結論");
    expect(wrapper.find("h2").exists()).toBe(false);
    /*
     * 2026-08-29：拿掉裝飾波浪，只保留色塊。摘要靠底色與位置就足以跟
     * 正文分開；波浪留給正文裡「文章本體到此為止」的那條分隔線。
     */
    expect(wrapper.find(".education-summary__wave").exists()).toBe(false);
  });
});
