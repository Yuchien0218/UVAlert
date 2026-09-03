// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import type { WaterStartFormValue } from "../../features/setup/createSetupController";
import WaterStartPicker from "./WaterStartPicker.vue";

/**
 * 2026-08-31 這個元件被整個改寫（三顆藥丸＋常駐 datetime-local → 「1 分鐘
 * 前」＋「調整時間」＋「不確定」，並加上 80 分鐘上限），而它**先前沒有
 * 任何測試**。
 */
function mountPicker(
  modelValue: WaterStartFormValue | null = null,
  appliedAt: string | null = null
) {
  const wrapper = mount(WaterStartPicker, {
    props: {
      modelValue,
      appliedAt,
      "onUpdate:modelValue": (value: WaterStartFormValue | null) =>
        wrapper.setProps({ modelValue: value })
    }
  });
  return wrapper;
}

function findButton(wrapper: ReturnType<typeof mountPicker>, text: string) {
  const button = wrapper.findAll("button").find((b) => b.text().includes(text));
  expect(button, `找不到按鈕：${text}`).toBeDefined();
  return button!;
}

describe("WaterStartPicker", () => {
  it("採用與塗抹時間相同的兩顆快選", () => {
    const wrapper = mountPicker();

    expect(wrapper.text()).toContain("分鐘前");
    expect(wrapper.text()).toContain("調整時間");
  });

  it("預設快選送出 confirmed 與時間", async () => {
    const wrapper = mountPicker();

    await findButton(wrapper, "分鐘前").trigger("click");

    const value = wrapper.props("modelValue") as WaterStartFormValue;
    expect(value.confidence).toBe("confirmed");
    expect(value.activityStartedAt).not.toBeNull();
  });

  /*
   * 「不確定」是刻意保留的：它對應 confidence: "unknown"，reducer 會走保守
   * 路徑而不猜測入水時間。拿掉它等於逼使用者猜一個時間，那比誠實地說不知道
   * 更糟——所以守的是「選項存在」**與**「送出的是 unknown 且沒有時間」兩件
   * 事，只守其一的話，把它改成送出一個猜測值仍然會綠。
   */
  it("保留「不確定」選項", () => {
    /*
     * 守的是**按鈕存在**，不是頁面上出現「不確定」這三個字——說明文字
     * 「若無法確認，可以選擇不確定」本身就含這三個字，所以
     * `text()).toContain("不確定")` 在按鈕被整個刪掉之後**仍然會綠**
     * （2026-08-31 破壞驗證時實測到，第一版就是這樣寫的）。
     */
    const buttons = mountPicker()
      .findAll("button")
      .map((button) => button.text());

    expect(buttons.some((label) => label.includes("不確定"))).toBe(true);
  });

  it("選不確定時送出 unknown，且不帶時間", async () => {
    const wrapper = mountPicker();

    await findButton(wrapper, "不確定").trigger("click");

    const value = wrapper.props("modelValue") as WaterStartFormValue;
    expect(value.confidence).toBe("unknown");
    expect(value.activityStartedAt).toBeNull();
  });

  /*
   * 超過 80 分鐘**不擋輸入**，改成建議先補擦——那時真正的下一步是補擦，
   * 不是把一個已經失效的時間記進去。硬擋會讓使用者填不出任何值。
   */
  it("入水超過 80 分鐘時提示先補擦，但仍然收下這個值", () => {
    const longAgo = new Date(Date.now() - 100 * 60_000).toISOString();
    const wrapper = mountPicker({
      confidence: "confirmed",
      activityStartedAt: longAgo
    });

    expect(wrapper.text()).toContain("補擦");
    expect(
      (wrapper.props("modelValue") as WaterStartFormValue).activityStartedAt
    ).toBe(longAgo);
  });

  it("80 分鐘以內不提示", () => {
    const wrapper = mountPicker({
      confidence: "confirmed",
      activityStartedAt: new Date(Date.now() - 30 * 60_000).toISOString()
    });

    expect(wrapper.text()).not.toContain("已經失效");
  });

  /* 揭露契約：真的 button ＋ aria-expanded ＋ aria-controls。 */
  it("調整時間是符合揭露契約的展開", async () => {
    const wrapper = mountPicker();
    const toggle = findButton(wrapper, "調整時間");

    expect(toggle.attributes("aria-expanded")).toBe("false");
    expect(toggle.attributes("aria-controls")).toBeDefined();

    await toggle.trigger("click");
    expect(toggle.attributes("aria-expanded")).toBe("true");
    expect(wrapper.find('input[type="datetime-local"]').exists()).toBe(true);
  });

  /* min 讓瀏覽器的選擇器先收窄；打字繞過時由提示接住。 */
  it("調整欄位的 min 對齊 80 分鐘上限", async () => {
    const wrapper = mountPicker();
    await findButton(wrapper, "調整時間").trigger("click");

    const input = wrapper.get('input[type="datetime-local"]');
    const min = Date.parse(input.attributes("min") ?? "");
    const expected = Date.now() - 80 * 60_000;

    expect(Math.abs(min - expected)).toBeLessThan(120_000);
  });
});

/*
 * **入水不得早於塗抹**（2026-09-02 使用者回報）。
 *
 * 這個元件原本不知道塗抹時間，於是選得出「塗抹 4 分鐘前 ＋ 入水 59 分鐘
 * 前」——物理上不可能，而且會讓耐水扣減算在一段還沒擦防曬的時間上。
 *
 * 表單層只是讓它選不到；真正擋住手動打字的是控制器的 validateWaterStart，
 * 那一層另有測試。兩層都要。
 */
/*
 * **「現在」不能凍結在掛載那一刻**（2026-09-02）。
 *
 * 改動前是 `const referenceNow = new Date()`，於是頁面開著愈久偏得愈多：
 * 「1 分鐘前」變成「開頁前一分鐘」，`max` 也停在開頁那一刻——**選不了比開頁
 * 更晚的時間**。
 *
 * 用假時鐘把時間往前推，再檢查互動之後有沒有跟上。
 */
describe("WaterStartPicker 的現在", () => {
  /** 把時間往前推 `offsetMs`，回傳還原函式。 */
  function installClock(offsetMs: number): () => void {
    const RealDate = globalThis.Date;
    const base = RealDate.now();
    class FakeDate extends RealDate {
      constructor(...args: [] | ConstructorParameters<typeof RealDate>) {
        if (args.length === 0) super(base + offsetMs);
        else super(...args);
      }
      static now(): number {
        return base + offsetMs;
      }
    }
    globalThis.Date = FakeDate as unknown as DateConstructor;
    return () => {
      globalThis.Date = RealDate;
    };
  }

  function withClock(offsetMs: number, run: () => void): void {
    const restore = installClock(offsetMs);
    try {
      run();
    } finally {
      restore();
    }
  }

  /*
   * 掛載之後過了十分鐘才按「1 分鐘前」，送出的應該是**按下去前一分鐘**，
   * 不是開頁前一分鐘。
   */
  it("快選用按下去當下的時間，不是掛載時的", async () => {
    const wrapper = mountPicker();
    const mountedAt = Date.now();

    withClock(10 * 60_000, () => {
      void findButton(wrapper, "分鐘前").trigger("click");
    });
    await wrapper.vm.$nextTick();
    const emitted = wrapper.emitted(
      "update:modelValue"
    ) as WaterStartFormValue[][];
    const sent = emitted.at(-1)?.[0];

    const chosen = Date.parse(sent?.activityStartedAt ?? "");
    // 掛載後十分鐘按下去 → 選到的時間應該在掛載時間之後
    expect(chosen).toBeGreaterThan(mountedAt);
  });

  /*
   * 同理：展開調整面板時 `max` 要是展開當下的現在，否則使用者選不到
   * 「比開頁更晚」的任何時間。
   */
  it("展開調整面板時 max 跟上當下時間", async () => {
    const wrapper = mountPicker();
    const mountedAt = Date.now();

    withClock(10 * 60_000, () => {
      void findButton(wrapper, "調整時間").trigger("click");
    });
    await wrapper.vm.$nextTick();

    const max = Date.parse(
      wrapper.get('input[type="datetime-local"]').attributes("max") ?? ""
    );

    expect(max).toBeGreaterThan(mountedAt);
  });

  /*
   * **反向：沒有互動時不得自己漂移。**
   *
   * 這條擋住「乾脆用每秒跳動的 ticker」——那會讓使用者選了「1 分鐘前」之後
   * 什麼都沒做，畫面卻自己變成「已調整為 2 分鐘前」、選取高亮還跳到另一顆。
   */
  /*
   * **守的是「這個元件沒有計時器」這個決定本身。**
   *
   * 第一版想直接觀察漂移：等 60 毫秒再比對文字。那守不住——標籤以分鐘為單位，
   * 60 毫秒跨不過任何顯示邊界。第二版改成推進假時鐘再強制重繪，也守不住——
   * Vue 的 computed 會快取，沒有依賴變動就不會重算。兩版都用會漂移的實作實測
   * 過，照樣全綠。
   *
   * 所以改成斷言機制：**掛載時不得建立 interval**。這是實作形狀的斷言，但它
   * 正好對應那個刻意的取捨——用 ticker 會讓使用者選了「1 分鐘前」之後什麼都
   * 沒做，畫面卻自己變成「2 分鐘前」、選取高亮還跳到另一顆。
   *
   * 跟上面兩條合起來才完整：那兩條證明互動時「現在」會跟上，這條證明沒有
   * 互動時不會有東西自己跑。
   */
  it("不使用計時器，畫面不會自己動", () => {
    const spy = vi.spyOn(globalThis, "setInterval");
    try {
      mountPicker();
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });
});

describe("WaterStartPicker 的塗抹時間下限", () => {
  it("塗抹時間比 80 分鐘上限晚時，min 用塗抹時間", async () => {
    const appliedAt = new Date(Date.now() - 10 * 60_000).toISOString();
    const wrapper = mountPicker(null, appliedAt);
    await findButton(wrapper, "調整時間").trigger("click");

    const min = Date.parse(
      wrapper.get('input[type="datetime-local"]').attributes("min") ?? ""
    );

    // 進位到下一分鐘，所以允許一分鐘內的差距。
    expect(min).toBeGreaterThanOrEqual(Date.parse(appliedAt) - 1000);
    expect(min - Date.parse(appliedAt)).toBeLessThan(60_000);
  });

  /*
   * 反向也要守：塗抹很久以前時，下限仍然是 80 分鐘上限而不是塗抹時間
   * ——否則耐水上限會被塗抹時間架空。兩個方向分開守，才不會變成「A 或 B」。
   */
  it("塗抹時間早於 80 分鐘上限時，min 維持上限", async () => {
    const appliedAt = new Date(Date.now() - 120 * 60_000).toISOString();
    const wrapper = mountPicker(null, appliedAt);
    await findButton(wrapper, "調整時間").trigger("click");

    const min = Date.parse(
      wrapper.get('input[type="datetime-local"]').attributes("min") ?? ""
    );

    expect(Math.abs(min - (Date.now() - 80 * 60_000))).toBeLessThan(120_000);
  });

  /*
   * 塗抹不到一分鐘前時，「1 分鐘前」入水在字面上就不可能。快選夾到塗抹
   * 當下（＝擦完就下水），而不是送出一個控制器一定會退回的值。
   */
  it("塗抹不到一分鐘前時，快選夾到塗抹時間", async () => {
    const appliedAt = new Date(Date.now() - 10_000).toISOString();
    const wrapper = mountPicker(null, appliedAt);

    await findButton(wrapper, "分鐘前").trigger("click");

    const emitted = wrapper.emitted(
      "update:modelValue"
    ) as WaterStartFormValue[][];
    const sent = emitted.at(-1)?.[0];

    expect(sent?.confidence).toBe("confirmed");
    expect(Date.parse(sent?.activityStartedAt ?? "")).toBeGreaterThanOrEqual(
      Date.parse(appliedAt) - 1000
    );
  });
});
