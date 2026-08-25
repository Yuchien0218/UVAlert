// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import EmptyStateCard from "./EmptyStateCard.vue";

describe("EmptyStateCard", () => {
  it("預設用 h2，沒有 role", () => {
    const wrapper = mount(EmptyStateCard, {
      props: { title: "還沒有任何裝備", body: "把常用的防曬乳與裝備記在這裡。" }
    });
    expect(wrapper.find("h2").text()).toBe("還沒有任何裝備");
    expect(wrapper.find("h1").exists()).toBe(false);
    expect(wrapper.attributes("role")).toBeUndefined();
    expect(wrapper.get("p").text()).toBe("把常用的防曬乳與裝備記在這裡。");
  });

  it("titleTag=h1 與 role=alert 可覆寫，用於錯誤狀態", () => {
    const wrapper = mount(EmptyStateCard, {
      props: {
        title: "找不到這件裝備",
        body: "這筆裝備紀錄可能已被刪除，或是網址有誤。",
        titleTag: "h1",
        role: "alert"
      }
    });
    expect(wrapper.find("h1").text()).toBe("找不到這件裝備");
    expect(wrapper.find("h2").exists()).toBe(false);
    expect(wrapper.attributes("role")).toBe("alert");
  });

  it("actions slot 會渲染在 body 之後", () => {
    const wrapper = mount(EmptyStateCard, {
      props: { title: "標題", body: "說明" },
      slots: { actions: '<button type="button">新增</button>' }
    });
    expect(wrapper.get("button").text()).toBe("新增");
  });
});
