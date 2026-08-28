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
    expect(wrapper.get(".education-summary__wave").attributes("aria-hidden")).toBe(
      "true"
    );
  });
});
