// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import QuickTimePicker from "./QuickTimePicker.vue";

describe("QuickTimePicker", () => {
  it("預設 heading／idPrefix／summaryLabel 維持 ReapplyPage 原本的文字與 id", () => {
    const wrapper = mount(QuickTimePicker, {
      props: {
        appliedAt: "2026-08-25T10:00:00.000Z",
        referenceNow: "2026-08-25T10:00:00.000Z",
        error: undefined
      }
    });
    expect(wrapper.get("h2").text()).toBe("實際何時補擦？");
    expect(wrapper.get("h2").attributes("id")).toBe("reapply-time-title");
    expect(wrapper.get("input").attributes("id")).toBe("reapply-time");
    expect(wrapper.text()).toContain("確認時間：");
  });

  it("可傳入 heading／idPrefix／summaryLabel 覆寫", () => {
    const wrapper = mount(QuickTimePicker, {
      props: {
        appliedAt: "2026-08-25T10:00:00.000Z",
        referenceNow: "2026-08-25T10:00:00.000Z",
        error: undefined,
        heading: "實際什麼時候發生？",
        idPrefix: "report-time",
        summaryLabel: "更正後："
      }
    });
    expect(wrapper.get("h2").text()).toBe("實際什麼時候發生？");
    expect(wrapper.get("h2").attributes("id")).toBe("report-time-title");
    expect(wrapper.get("input").attributes("id")).toBe("report-time");
    expect(wrapper.text()).toContain("更正後：");
  });

  it("點快選按鈕 emit quick，對應的按鈕會是 aria-pressed=true", async () => {
    const wrapper = mount(QuickTimePicker, {
      props: {
        appliedAt: "2026-08-25T10:00:00.000Z",
        referenceNow: "2026-08-25T10:00:00.000Z",
        error: undefined
      }
    });
    const buttons = wrapper.findAll("button");
    expect(buttons[0]!.attributes("aria-pressed")).toBe("true");
    await buttons[1]!.trigger("click");
    expect(wrapper.emitted("quick")).toEqual([[15]]);
  });

  it("改自訂時間 emit change 帶 ISO 字串", async () => {
    const wrapper = mount(QuickTimePicker, {
      props: {
        appliedAt: "2026-08-25T10:00:00.000Z",
        referenceNow: "2026-08-25T10:00:00.000Z",
        error: undefined
      }
    });
    const input = wrapper.get("input");
    (input.element as HTMLInputElement).value = "2026-08-25T12:30";
    await input.trigger("change");
    const emitted = wrapper.emitted("change");
    expect(emitted).toHaveLength(1);
    expect(new Date(emitted![0]![0] as string).toISOString()).toBe(
      new Date("2026-08-25T12:30").toISOString()
    );
  });

  it("有 error 時顯示錯誤文字並用 aria-describedby 連結輸入框", () => {
    const wrapper = mount(QuickTimePicker, {
      props: {
        appliedAt: "2026-08-25T10:00:00.000Z",
        referenceNow: "2026-08-25T10:00:00.000Z",
        error: "時間格式不正確"
      }
    });
    const errorParagraph = wrapper.get('[role="alert"]');
    expect(errorParagraph.text()).toBe("時間格式不正確");
    expect(wrapper.get("input").attributes("aria-describedby")).toBe(errorParagraph.attributes("id"));
  });
});
