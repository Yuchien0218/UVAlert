// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ApplicationTimePicker from "../../components/setup/ApplicationTimePicker.vue";
import WaterStartPicker from "../../components/setup/WaterStartPicker.vue";

/**
 * 2026-08-31 第七批（§18.5～§18.7）：`/setup` 的表單回饋。
 *
 * 使用者的原話：「確認這次實際的塗抹時間，這邊希望上面有警示顏色的紅框，
 * 並畫面跳過去，不然使用者不知道哪裡沒寫。」
 */

const strip = (source: string): string =>
  source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

describe("塗抹時間的錯誤提示", () => {
  function mountPicker(error: string | null) {
    return mount(ApplicationTimePicker, {
      props: { modelValue: null, error },
      // focus() 只有掛進 document 才有意義——detached 節點 focus 不了。
      attachTo: document.body
    });
  }

  it("沒有錯誤時不顯示警示，也不上紅框", () => {
    const wrapper = mountPicker(null);

    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.get("fieldset").classes()).not.toContain(
      "time-picker--invalid"
    );
  });

  /*
   * 三件事分開斷言。任何一件單獨存在都不夠：只有紅框＝只用顏色傳達資訊
   * （過不了 SC 1.4.1）；只有文字＝掃視時看不見；`aria-describedby` 沒接上
   * ＝螢幕閱讀器讀到欄位時不會帶出原因。
   */
  it("有錯誤時同時給紅框、警示文字與 aria-describedby", () => {
    const wrapper = mountPicker("請確認這次實際的塗抹時間。");
    const fieldset = wrapper.get("fieldset");
    const alert = wrapper.get('[role="alert"]');

    expect(fieldset.classes()).toContain("time-picker--invalid");
    expect(alert.text()).toBe("請確認這次實際的塗抹時間。");
    // 必須指到真的存在的那個節點，否則這個屬性是騙人的。
    expect(fieldset.attributes("aria-describedby")).toBe(alert.attributes("id"));
  });

  /*
   * 訊息在選項**上方**。由上往下讀時要先知道出了什麼事，再看到要操作的
   * 東西；放在下方等於讀完選項才被告知剛剛那個要填。
   */
  it("警示文字排在選項前面", () => {
    const wrapper = mountPicker("請確認這次實際的塗抹時間。");
    const html = wrapper.html();

    expect(html.indexOf('role="alert"')).toBeLessThan(
      html.indexOf("time-picker__quick")
    );
  });

  /*
   * 捲過去還不夠，焦點要跟著移動——否則鍵盤與螢幕閱讀器使用者的位置沒有
   * 改變，只修好了滑鼠那一半。
   */
  it("對外提供 focus()，落點是第一個時間選項", () => {
    const wrapper = mountPicker("請確認這次實際的塗抹時間。");
    (wrapper.vm as unknown as { focus: () => void }).focus();

    expect(document.activeElement?.textContent?.replace(/\s+/g, "")).toBe(
      "1分鐘前"
    );
  });
});

/**
 * 入水時間走同一套（2026-09-03）。
 *
 * 這張卡初始是**兩顆都沒選**，helper 又只講「不確定」、沒講要選——而錯誤
 * 原本只印在頁尾。三件事加起來，使用者按下開始之後看不出哪裡沒填。
 *
 * 斷言逐條對著塗抹時間那組寫：同一頁兩個時間輸入不該有兩種出錯方式。
 */
describe("入水時間的錯誤提示", () => {
  function mountPicker(error: string | null) {
    return mount(WaterStartPicker, {
      props: { modelValue: null, error },
      attachTo: document.body
    });
  }

  it("沒有錯誤時不顯示警示，也不上紅框", () => {
    const wrapper = mountPicker(null);

    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.get("fieldset").classes()).not.toContain(
      "time-picker--invalid"
    );
  });

  it("有錯誤時同時給紅框、警示文字與 aria-describedby", () => {
    const wrapper = mountPicker("請確認實際入水時間，或選擇不確定。");
    const fieldset = wrapper.get("fieldset");
    const alert = wrapper.get('[role="alert"]');

    expect(fieldset.classes()).toContain("time-picker--invalid");
    expect(alert.text()).toBe("請確認實際入水時間，或選擇不確定。");
    expect(fieldset.attributes("aria-describedby")).toBe(alert.attributes("id"));
  });

  it("警示文字排在選項前面", () => {
    const wrapper = mountPicker("請確認實際入水時間，或選擇不確定。");
    const html = wrapper.html();

    expect(html.indexOf('role="alert"')).toBeLessThan(
      html.indexOf("water-start__quick")
    );
  });

  /*
   * **先 blur，再斷言焦點落在「這個」wrapper 裡。**
   *
   * 第一版照抄塗抹時間那條，結果拿掉 `ref="defaultButton"` 之後照樣全綠
   * （2026-09-03 實測）：塗抹時間那條測試先跑，`document` 是共用的，焦點
   * 還停在**它的**「1 分鐘前」上——文字剛好一模一樣，於是兩條測試互相
   * 掩護。這正是 CLAUDE.md 記的那種「守空氣」。
   */
  it("對外提供 focus()，落點是第一個時間選項", () => {
    const wrapper = mountPicker("請確認實際入水時間，或選擇不確定。");
    (document.activeElement as HTMLElement | null)?.blur?.();

    (wrapper.vm as unknown as { focus: () => void }).focus();

    const active = document.activeElement;
    expect(wrapper.element.contains(active)).toBe(true);
    expect(active?.textContent?.replace(/\s+/g, "")).toBe("1分鐘前");
  });

  /*
   * 卡片本身要先講「要選」，不能只講「不確定也可以」。
   *
   * 這是初始狀態唯一的線索——兩顆按鈕都沒選中時，畫面上沒有別的東西
   * 說明這一欄還沒完成。
   */
  it("說明文字先講要選，再講不確定", () => {
    const helper = mountPicker(null).get(".question-card__helper").text();

    expect(helper).toContain("請選擇實際入水時間");
    expect(helper).toContain("不確定");
    expect(helper.indexOf("請選擇")).toBeLessThan(helper.indexOf("不確定"));
  });
});

describe("SetupPage 送出失敗時把使用者帶到欄位", () => {
  const SOURCE = strip(
    readFileSync("apps/web/src/pages/setup/SetupPage.vue", "utf8")
  );

  it("捲動與 focus 兩件都做", () => {
    expect(SOURCE).toContain("scrollIntoView");
    expect(SOURCE).toContain("picker.focus()");
  });

  /*
   * 同一句話不可以同時出現在欄位旁與頁尾——讀起來像兩個不同的問題。
   * 這條守的是「把錯誤搬到欄位旁邊之後忘了從頁尾拿掉」。
   */
  it("塗抹時間的錯誤交給欄位，不再落到頁尾", () => {
    // 換行寫法不比對（這個 repo 的檔案是 CRLF），比對那一段的三個動作。
    const branch = /if \(applicationTime\.value === null[\s\S]*?\n {2}\}/.exec(
      SOURCE
    )?.[0];

    expect(branch, "找不到塗抹時間的錯誤分支").toBeDefined();
    expect(branch).toContain("applicationTimeError.value = localError.value;");
    expect(branch, "同一句不可以同時留在頁尾").toContain(
      "localError.value = null;"
    );
    expect(branch).toContain("focusApplicationTime();");
  });

  it("錯誤透過 error prop 傳給選擇器", () => {
    expect(SOURCE).toContain(':error="applicationTimeError"');
  });

  /*
   * 入水時間那一筆同理。`SetupPage` 原本的註解寫著「其他兩種仍走頁尾」，
   * 2026-09-03 還掉入水時間這一筆——所以頁尾的清單裡不可以再有它。
   */
  it("入水時間的錯誤交給欄位，不再落到頁尾", () => {
    // 換行寫法不比對（這個 repo 的檔案是 CRLF），只框出那一段分支。
    const branch = /if \(needsWaterStart\.value && waterStart\.value === null\)[\s\S]*?focusWaterStart\(\);/.exec(
      SOURCE
    )?.[0];

    expect(branch, "找不到入水時間的錯誤分支").toBeDefined();
    expect(branch).toContain("waterStartError.value = localError.value;");
    expect(branch, "同一句不可以同時留在頁尾").toContain(
      "localError.value = null;"
    );
    expect(branch).toContain("focusWaterStart();");
    expect(SOURCE).not.toContain("setup.fieldErrors.value.waterStart ?? []");
  });

  it("入水時間的錯誤透過 error prop 傳給選擇器", () => {
    expect(SOURCE).toContain(':error="waterStartFieldError"');
  });
});

describe("草稿狀態", () => {
  const SHELL = strip(
    readFileSync("apps/web/src/components/setup/SetupStepShell.vue", "utf8")
  );

  /*
   * 2026-08-31 使用者裁決：儲存成功不再常駐顯示（存成功是預期結果，不是
   * 消息），**但失敗仍然要說**。不對稱是刻意的，所以兩個方向都要守——
   * 只守前者的話，把整段刪掉也會過。
   */
  it("儲存成功不顯示", () => {
    expect(SHELL).not.toContain("草稿已儲存");
  });

  it("儲存失敗仍然常駐顯示", () => {
    expect(SHELL).toContain("草稿未儲存");
    expect(SHELL).toContain("saveStatus === 'error'");
  });
});

describe("部位摘要展開後只留一段文字", () => {
  const SOURCE = strip(
    readFileSync(
      "apps/web/src/components/setup/QuickProtectionSummary.vue",
      "utf8"
    )
  );

  /*
   * 收斂前有三段，其中兩段是同一份資訊的兩種寫法（預設組合簡稱 vs 實際
   * 會建立的部位全名）。留全名那一份。
   */
  it("不再重述預設組合的簡稱", () => {
    expect(SOURCE).not.toContain("preset.summary");
  });

  it("不再重述下方 CTA 已經說過的流程", () => {
    expect(SOURCE).not.toContain("才會建立正式提醒");
  });

  /* 刪到只剩零段就不是精簡而是弄丟資訊了——實際部位清單必須還在。 */
  it("實際會套用的部位清單保留", () => {
    expect(SOURCE).toContain('zoneLabels.join("、")');
  });
});
