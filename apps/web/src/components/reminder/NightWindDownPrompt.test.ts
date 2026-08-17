// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import {
  EVENING_END_HOUR,
  EVENING_START_HOUR,
  getEveningCycleKey,
  isFixedEvening
} from "../../features/uv/uvForecastRules";
import NightWindDownPrompt from "./NightWindDownPrompt.vue";

function at(hour: number): Date {
  return new Date(2026, 7, 8, hour, 0, 0);
}

describe("夜間時段判定", () => {
  it("18:00 之後與 06:00 之前算夜間", () => {
    expect(isFixedEvening(at(EVENING_START_HOUR))).toBe(true);
    expect(isFixedEvening(at(23))).toBe(true);
    expect(isFixedEvening(at(2))).toBe(true);
    expect(isFixedEvening(at(EVENING_END_HOUR - 1))).toBe(true);
  });

  it("白天不算夜間", () => {
    expect(isFixedEvening(at(EVENING_END_HOUR))).toBe(false);
    expect(isFixedEvening(at(12))).toBe(false);
    expect(isFixedEvening(at(EVENING_START_HOUR - 1))).toBe(false);
  });

  it("跨午夜屬於同一個夜間週期，關掉後整晚不再問", () => {
    // 8 日 23:00 與 9 日 02:00 是同一晚。
    const beforeMidnight = getEveningCycleKey(new Date(2026, 7, 8, 23, 0));
    const afterMidnight = getEveningCycleKey(new Date(2026, 7, 9, 2, 0));
    expect(beforeMidnight).toBe(afterMidnight);
    expect(getEveningCycleKey(at(12))).toBeNull();
  });
});

describe("NightWindDownPrompt", () => {
  it("提供結束與保持進行中兩個選項", async () => {
    const wrapper = mount(NightWindDownPrompt, {
      props: { ending: false }
    });

    const [end, keep] = wrapper.findAll("button");
    await end!.trigger("click");
    await keep!.trigger("click");

    expect(wrapper.emitted("end")).toHaveLength(1);
    expect(wrapper.emitted("keep")).toHaveLength(1);
  });

  it("文案明說倒數會繼續，不得暗示已暫停計時", () => {
    const wrapper = mount(NightWindDownPrompt, {
      props: { ending: false }
    });
    const text = wrapper.text();

    // 這是本元件存在的理由：夜間提示收工，但絕不凍結時鐘。
    // 暫停後恢復會讓 12 小時前的防曬顯示成「還有 40 分鐘」。
    expect(text).toContain("倒數會繼續");
    expect(text).not.toContain("已暫停");
    expect(text).not.toContain("停止計時");
  });

  it("結束中時鎖住結束鈕，避免重複送出", () => {
    const wrapper = mount(NightWindDownPrompt, {
      props: { ending: true }
    });
    expect(wrapper.findAll("button")[0]!.attributes("disabled")).toBeDefined();
  });
});
