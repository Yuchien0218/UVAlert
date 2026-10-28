# 衛教三頁桌面寬版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓防曬衛教首頁、分類頁與文章頁在桌面使用較寬的閱讀外框，同時維持手機版及其他 App 頁面的既有寬度。

**Architecture:** 三個衛教路由以 `meta.wideLayout: true` 宣告版型需求，`AppShell` 將它推導成具名 class，並只在既有 `48rem` 桌面斷點把外框上限由 `--app-shell-max` 切換為 `--content-max`。各衛教頁繼續保有原本的 `42rem`／`44rem` 內容上限，不修改內容元件或資料流。

**Tech Stack:** Vue 3、Vue Router 4、TypeScript、CSS custom properties、Vitest

## Global Constraints

- 寬版範圍只包含 `/education`、`/education/:category`、`/education/articles/:slug`。
- 手機與窄視窗維持 `width: 100%`，不得新增橫向捲動。
- 桌面寬版使用既有 `--content-max: 47rem`，不得加入重複的寬度 magic number。
- 非衛教頁繼續使用 `--app-shell-max: 30rem`。
- BottomNavigation 不在本次修改範圍。
- 不修改衛教資料、文章內容、字級、行高、段落間距或發布閘門。
- 未取得使用者明確授權前，不 commit、不 push。

---

## File Map

- Modify `apps/web/src/router/index.ts`: 為三個衛教路由宣告 `wideLayout: true`。
- Modify `apps/web/src/components/shell/AppShell.vue`: 將 route meta 轉成寬版 class，並在桌面斷點切換外框 token。
- Modify `apps/web/src/components/shell/desktopAppShellLayout.test.ts`: 守住預設窄版、三個衛教路由、桌面限定的寬版規則，以及非衛教路由邊界。
- Reference only `packages/ui/src/styles.css`: 沿用 `--app-shell-max` 與 `--content-max`，不修改 token。

### Task 1: 建立會失敗的寬版路由與外框守門

**Files:**
- Modify: `apps/web/src/components/shell/desktopAppShellLayout.test.ts`
- Read: `apps/web/src/router/index.ts`
- Read: `apps/web/src/components/shell/AppShell.vue`

**Interfaces:**
- Consumes: Vue Router route records中的 `meta`；AppShell scoped CSS 原始碼。
- Produces: 對 `wideLayout` 路由契約與 `.app-shell--wide` 桌面規則的靜態守門。

- [ ] **Step 1: 在測試載入 Router 原始碼**

加入：

```ts
const router = withoutComments(
  readFileSync("apps/web/src/router/index.ts", "utf8")
);
```

- [ ] **Step 2: 新增三個衛教路由必須宣告寬版的測試**

以路徑為邊界擷取三個 route record，斷言各自包含 `wideLayout: true`；另外擷取 `/products`，斷言它不包含此標記。測試不得只計算整個檔案中子字串出現次數，以免其他路由誤標時仍通過。

```ts
function routeRecord(source: string, path: string): string {
  const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(
    `\\{\\s*path:\\s*"${escaped}"[\\s\\S]*?meta:\\s*\\{([^}]*)\\}`
  ).exec(source);
  expect(match, `找不到 ${path} 的路由 meta`).toBeDefined();
  return match![1]!;
}

it("只讓三個衛教路由宣告桌面寬版", () => {
  for (const path of [
    "/education",
    "/education/articles/:slug",
    "/education/:category"
  ]) {
    expect(routeRecord(router, path)).toContain("wideLayout: true");
  }

  expect(routeRecord(router, "/products")).not.toContain("wideLayout: true");
});
```

- [ ] **Step 3: 新增 AppShell 寬版 class 與桌面限定規則測試**

斷言 template 使用 `route.meta.wideLayout === true` 控制 `app-shell--wide`，預設 `.app-shell` 仍使用 `--app-shell-max`，並斷言 `@media (min-width: 48rem)` 內的 `.app-shell--wide` 使用 `--content-max`。

```ts
it("只在路由要求時套用寬版 class", () => {
  expect(appShell).toContain(
    "'app-shell--wide': route.meta.wideLayout === true"
  );
});

it("只在桌面斷點把寬版外框切換為內容上限", () => {
  expect(cssRule(appShell, ".app-shell")).toContain(
    "width: min(100%, var(--app-shell-max));"
  );
  expect(appShell).toMatch(
    /@media \(min-width: 48rem\) \{[\s\S]*?\.app-shell--wide\s*\{[^}]*width:\s*min\(100%, var\(--content-max\)\);/
  );
});
```

- [ ] **Step 4: 執行測試並確認以缺少契約失敗**

Run:

```powershell
pnpm vitest run apps/web/src/components/shell/desktopAppShellLayout.test.ts
```

Expected: FAIL；失敗原因應是缺少 `wideLayout: true` 或 `.app-shell--wide`，不是測試語法錯誤。

- [ ] **Step 5: 檢查第一批 diff**

Run:

```powershell
git diff --check
git diff -- apps/web/src/components/shell/desktopAppShellLayout.test.ts
```

Expected: `git diff --check` exit code 0；diff 只包含第一批測試。

### Task 2: 實作路由驅動的桌面寬版外框

**Files:**
- Modify: `apps/web/src/router/index.ts`
- Modify: `apps/web/src/components/shell/AppShell.vue`
- Test: `apps/web/src/components/shell/desktopAppShellLayout.test.ts`

**Interfaces:**
- Consumes: `route.meta.wideLayout` 布林值、`--app-shell-max`、`--content-max`。
- Produces: `.app-shell--wide`，只在 `min-width: 48rem` 使用 `--content-max`。

- [ ] **Step 1: 為三個衛教路由加入精確 meta**

三個 route record 改為：

```ts
meta: { title: "防曬衛教", hideNavigation: true, wideLayout: true }
```

```ts
meta: { title: "衛教文章", hideNavigation: true, wideLayout: true }
```

```ts
meta: { title: "衛教分類", hideNavigation: true, wideLayout: true }
```

- [ ] **Step 2: 由 AppShell 套用寬版 class**

將外框 class binding 改成同時保留導覽狀態與寬版狀態：

```vue
:class="{
  'app-shell--with-navigation': navigationVisible,
  'app-shell--wide': route.meta.wideLayout === true
}"
```

- [ ] **Step 3: 只在桌面斷點切換寬度 token**

在現有 `@media (min-width: 48rem)` 中加入：

```css
.app-shell--wide {
  width: min(100%, var(--content-max));
}
```

不得修改 `.app-shell` 的預設 `width`，也不得修改 `BottomNavigation.vue`。

- [ ] **Step 4: 執行焦點測試確認通過**

Run:

```powershell
pnpm vitest run apps/web/src/components/shell/desktopAppShellLayout.test.ts apps/web/src/pages/education/educationLayout.test.ts
```

Expected: PASS。

- [ ] **Step 5: 破壞驗證守門強度**

暫時移除 `/education/:category` 的 `wideLayout: true`，重跑 `desktopAppShellLayout.test.ts`；Expected: FAIL，錯誤指出該路由缺少寬版標記。立即還原該行並再次執行；Expected: PASS。

- [ ] **Step 6: 檢查第二批 diff**

Run:

```powershell
git diff --check
git diff -- apps/web/src/router/index.ts apps/web/src/components/shell/AppShell.vue apps/web/src/components/shell/desktopAppShellLayout.test.ts
```

Expected: 無 whitespace error；沒有衛教內容、BottomNavigation 或其他路由行為變更。

### Task 3: 完整驗證與瀏覽器驗收

**Files:**
- Verify only: `apps/web/src/router/index.ts`
- Verify only: `apps/web/src/components/shell/AppShell.vue`
- Verify only: `apps/web/src/components/shell/desktopAppShellLayout.test.ts`

**Interfaces:**
- Consumes: Task 2 完成的寬版外框。
- Produces: 自動化與瀏覽器驗收證據，不新增產品行為。

- [ ] **Step 1: 執行完整專案檢查**

Run:

```powershell
pnpm check
```

Expected: typecheck、全部 Vitest、ESLint、Stylelint exit code 0。

- [ ] **Step 2: 啟動專案既有預覽方式**

依 `.claude/launch.json` 的 `web-dev` 設定啟動，不另改 Vite 設定或固定 port。

- [ ] **Step 3: 驗證 390px**

檢查 `/education`、任一有效分類、任一有效文章：單欄、無橫向捲動、標題與返回操作未裁切。

- [ ] **Step 4: 驗證 768px、1024px、1440px**

三個衛教頁需符合：外框置中；768px 起採 `--content-max` 上限；1024px 與 1440px 的外框不超過 752px；文章正文不超過既有 44rem。

- [ ] **Step 5: 驗證非衛教頁隔離**

在 1440px 檢查 `/products` 或 `/reminder`：AppShell 仍不超過 480px，沒有取得 `app-shell--wide`。

- [ ] **Step 6: 最終工作樹檢查**

Run:

```powershell
git diff --check
git status --short
```

Expected: 只有設計文件、實作計畫、Router、AppShell 與守門測試屬於本次變更；不 commit、不 push。

