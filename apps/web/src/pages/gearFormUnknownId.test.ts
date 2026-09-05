// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { describe, expect, it, vi } from "vitest";
import GearFormPage from "./GearFormPage.vue";

/**
 * 網址帶了不存在的裝備 id（2026-09-04 頁面健檢的發現三）。
 *
 * 在這之前 `/products/<任意亂碼>/edit` 會渲染出一張完整的「編輯防曬裝備」
 * 表單，欄位全空、而且「儲存」是可以按的。對照組是 `/products/<任意亂碼>`
 * ——那條有 redirect，會回到清單。**同一個不存在的 id，兩種處置。**
 */

const ROUTER_SOURCE = readFileSync("apps/web/src/router/index.ts", "utf8");
const FORM_SOURCE = readFileSync(
  "apps/web/src/components/product/GearForm.vue",
  "utf8"
);

/** 掃原始碼前先剝註解——理由見 CLAUDE.md「守門測試：坑一」。 */
const strip = (source: string): string =>
  source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

describe("不存在的裝備 id", () => {
  /*
   * **新增模式不能被誤判成找不到。** 這兩種情況在 GearForm 裡都是
   * `existing === null`，只有 props.productId 分得出來——少了那個判斷，
   * `/products/new` 一載入就會把自己導走。
   */
  it("只有編輯模式才回報找不到，新增模式不會", () => {
    const code = strip(FORM_SOURCE);

    expect(code).toMatch(
      /if \(record === null\) \{[\s\S]{0,120}?props\.productId !== null[\s\S]{0,60}?emit\("notFound"\)/
    );
  });

  /*
   * 頁殼要用 replace 而不是 push：那個網址不該留在返回堆疊裡，否則使用者
   * 按返回會再撞一次同一張空表單。
   */
  it("頁殼收到 notFound 時用 replace 導回清單", () => {
    const code = strip(
      readFileSync("apps/web/src/pages/GearFormPage.vue", "utf8")
    );

    expect(code).toContain('@not-found="handleNotFound"');
    expect(code).toMatch(
      /function handleNotFound[\s\S]{0,160}?router\.replace\(\{ name: "products" \}\)/
    );
  });

  /*
   * `/products/:id` 的 redirect 用字串路徑，不用具名目標。
   *
   * 具名目標會把 `:id` 一起帶過去，而 `products` 不吃參數——vue-router 因此
   * 每次都印 `Discarded invalid param(s) "id"`。行為本來就對，只是一直在
   * 丟警告，而警告多了就沒有人看警告了。
   */
  it("詳情路由的 redirect 不會夾帶 id 參數", () => {
    const code = strip(ROUTER_SOURCE);

    expect(code).toMatch(/path:\s*"\/products\/:id",\s*redirect:\s*"\/products"/);
    expect(code).not.toMatch(
      /path:\s*"\/products\/:id",\s*redirect:\s*\{\s*name:/
    );
  });

  /*
   * 上面三條都是掃字串。這條用真的 router 驗行為：帶著不存在的 id 進編輯
   * 路由，掛載後應該落在清單頁，而且**不能留在返回堆疊裡**。
   */
  it("帶著不存在的 id 進編輯頁，會被導回清單且不留下歷史", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/products/:id/edit", component: GearFormPage },
        { path: "/products", name: "products", component: { template: "<div />" } }
      ]
    });

    await router.push("/products/zzz-not-real/edit");
    await router.isReady();

    mount(GearFormPage, {
      global: {
        plugins: [router],
        stubs: {
          IconButton: true,
          GearForm: {
            props: ["productId"],
            emits: ["saved", "notFound"],
            template: "<div />",
            mounted(this: { productId: string | null; $emit: (e: string) => void }) {
              if (this.productId !== null) this.$emit("notFound");
            }
          }
        }
      }
    });

    await vi.waitUntil(() => router.currentRoute.value.path === "/products", {
      timeout: 1000
    });

    expect(router.currentRoute.value.path).toBe("/products");
  });
});
