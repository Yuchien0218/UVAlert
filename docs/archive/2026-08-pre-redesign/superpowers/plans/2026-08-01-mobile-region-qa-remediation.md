# Mobile Region QA Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修正 Samsung Android 真機發現的產品單選、定位拒絕分類、候選 CTA 層級與手動行政區回饋問題。

**Architecture:** 保留現有 page/controller/repository 邊界。產品表單只修正 Vue 深層反應性、radio 原生分組與響應式樣式；定位只在 browser adapter 增加 permission state 判讀；地區子元件只調整呈現與 typed emits，不改 preference transaction。

**Tech Stack:** Vue 3、`<script setup lang="ts">`、Vue Test Utils、Vitest、TypeScript、Vite。

## Global Constraints

- 不修改 IndexedDB schema、contracts、reducer、行政區界線或 UV API。
- 所有功能修改先建立會因缺少該功能而失敗的測試。
- 手機畫面同一狀態只保留一個主要 CTA。
- 專案目前不是 Git repository，因此本計畫不執行 commit。

---

### Task 1: 產品表單單選與手機排版

**Files:**
- Modify: `apps/web/src/pages/ProductsPage.vue`
- Modify: `apps/web/src/components/product/ProductSnapshotEditor.vue`
- Test: `apps/web/src/components/product/ProductSnapshotEditor.test.ts`

**Interfaces:**
- Consumes: `ProductSnapshotFormValue` 與 `defineModel<ProductSnapshotFormValue>()`。
- Produces: 四個原生 radio groups：`claimAnswer`、`waitAnswer`、`intervalAnswer`、`waterResistance`。

- [ ] **Step 1: 新增失敗測試**

新增測試，依序點擊同一題的兩個選項後確認只剩最後一個 checked，並確認不同題使用不同 name：

```ts
it("keeps every product question as an independent single-select group", async () => {
  const wrapper = mountEditor();
  const claimInputs = wrapper.findAll('input[name$="-claim"]');
  await claimInputs[1]!.setValue();
  expect(claimInputs.filter((input) => input.element.checked)).toHaveLength(1);

  const groupNames = new Set(
    wrapper.findAll('input[type="radio"]').map((input) => input.attributes("name"))
  );
  expect(groupNames.size).toBe(4);
});
```

- [ ] **Step 2: 驗證測試以預期原因失敗**

Run: `pnpm test -- apps/web/src/components/product/ProductSnapshotEditor.test.ts`  
Expected: FAIL，因 radio 尚未有 name，或同一題仍可留下多個 checked。

- [ ] **Step 3: 實作最小修正**

- 將 `ProductsPage.vue` 的產品表單改為 `ref<ProductSnapshotFormValue>()`。
- 在 editor 使用 `useId()` 建立 instance prefix，為四題分別設定穩定 name。
- 將通用 label 樣式放在 variant 樣式之前，避免 cascade 覆蓋。
- 預設手機採單欄；於足夠寬度 media query 才啟用三欄／二欄。

- [ ] **Step 4: 驗證 Task 1 通過**

Run: `pnpm test -- apps/web/src/components/product/ProductSnapshotEditor.test.ts`  
Expected: PASS。

### Task 2: Samsung Internet 定位拒絕分類

**Files:**
- Modify: `apps/web/src/adapters/BrowserGeolocation.ts`
- Test: `apps/web/src/adapters/BrowserGeolocation.test.ts`

**Interfaces:**
- Consumes: `GeolocationLike.getCurrentPosition()` 與可選 `PermissionsLike.query({ name: "geolocation" })`。
- Produces: `requestCurrentPosition(): Promise<DevicePosition>`；permission state 為 denied 時拒絕 `DeviceGeolocationError("permission_denied")`。

- [ ] **Step 1: 新增失敗測試**

```ts
it("treats a timeout as permission denied when the browser reports denied permission", async () => {
  const geolocation = makeErrorGeolocation(3);
  const permissions = { query: vi.fn(async () => ({ state: "denied" as const })) };
  const adapter = new BrowserGeolocation(geolocation, permissions);

  await expect(adapter.requestCurrentPosition()).rejects.toMatchObject({
    code: "permission_denied"
  });
});

it("keeps timeout when permission lookup is unavailable", async () => {
  const adapter = new BrowserGeolocation(makeErrorGeolocation(3), null);
  await expect(adapter.requestCurrentPosition()).rejects.toMatchObject({ code: "timeout" });
});
```

- [ ] **Step 2: 驗證測試失敗**

Run: `pnpm test -- apps/web/src/adapters/BrowserGeolocation.test.ts`  
Expected: FAIL，因 constructor 尚未接受 permissions，timeout 仍直接映射。

- [ ] **Step 3: 實作最小修正**

- 注入可選 `PermissionsLike`，預設取用 `navigator.permissions`。
- error callback 改為 async helper；只對 code 2/3 查詢 geolocation permission。
- 查詢結果為 denied 時改判 permission denied；不支援或查詢失敗時保留既有 mapping。

- [ ] **Step 4: 驗證 Task 2 通過**

Run: `pnpm test -- apps/web/src/adapters/BrowserGeolocation.test.ts`  
Expected: PASS。

### Task 3: 定位候選 CTA 層級與保守錯誤文案

**Files:**
- Modify: `apps/web/src/components/region/RegionLocationPanel.vue`
- Create: `apps/web/src/components/region/RegionLocationPanel.test.ts`

**Interfaces:**
- Consumes: `phase`、`error`、`candidate`、`approximateAccuracyMeters` props。
- Produces: `locate` 與 `confirm` emits。

- [ ] **Step 1: 建立失敗元件測試**

```ts
it("shows one primary confirm action after a candidate is resolved", () => {
  const wrapper = mount(RegionLocationPanel, { props: candidateProps });
  expect(wrapper.findAll(".button--primary")).toHaveLength(1);
  expect(wrapper.get(".button--primary").text()).toBe("確認並使用此地區");
  expect(wrapper.get('[data-testid="relocate"]').text()).toBe("重新定位");
});

it("uses a non-misleading timeout message", () => {
  const wrapper = mountPanel({ error: "timeout" });
  expect(wrapper.get('[role="alert"]').text()).toContain("確認定位權限");
});
```

- [ ] **Step 2: 驗證測試失敗**

Run: `pnpm test -- apps/web/src/components/region/RegionLocationPanel.test.ts`  
Expected: FAIL，候選狀態目前有兩個 primary buttons，且 timeout 文案未涵蓋權限。

- [ ] **Step 3: 實作最小修正**

- `candidate === null` 時才顯示原主要定位按鈕。
- candidate panel 保留確認 primary，加入 `data-testid="relocate"` 的次要文字按鈕並 emit locate。
- timeout 改為「無法取得位置。請確認定位權限，或移到訊號較好的地方重試；你也可以手動選擇地區。」

- [ ] **Step 4: 驗證 Task 3 通過**

Run: `pnpm test -- apps/web/src/components/region/RegionLocationPanel.test.ts`  
Expected: PASS。

### Task 4: 手動行政區兩層下拉與驗證回饋

**Files:**
- Modify: `apps/web/src/components/region/RegionManualSelector.vue`
- Create: `apps/web/src/components/region/RegionManualSelector.test.ts`

**Interfaces:**
- Consumes: `directory`、`phase` props。
- Produces: `save(regionCode: string)` emit。

- [ ] **Step 1: 建立失敗元件測試**

```ts
it("validates the cascading selects before saving", async () => {
  const wrapper = mountSelector();
  expect(wrapper.find('input[type="search"]').exists()).toBe(false);

  await wrapper.get('[data-testid="save-manual-region"]').trigger("click");
  expect(wrapper.get('[role="alert"]').text()).toBe("請先選擇縣市");
  expect(wrapper.emitted("save")).toBeUndefined();

  await wrapper.get("#region-county").setValue("63000");
  await wrapper.get('[data-testid="save-manual-region"]').trigger("click");
  expect(wrapper.get('[role="alert"]').text()).toBe("請選擇鄉鎮市區");
});
```

```ts
it("emits only the selected district code", async () => {
  const wrapper = mountSelector();
  await wrapper.get("#region-county").setValue("63000");
  await wrapper.get("#region-town").setValue("63000010");
  await wrapper.get('[data-testid="save-manual-region"]').trigger("click");
  expect(wrapper.emitted("save")).toEqual([["63000010"]]);
});
```

- [ ] **Step 2: 驗證測試失敗**

Run: `pnpm test -- apps/web/src/components/region/RegionManualSelector.test.ts`  
Expected: FAIL，搜尋框仍存在且空值時按鈕無法觸發驗證。

- [ ] **Step 3: 實作最小修正**

- 移除 `searchQuery`、搜尋 input 與搜尋過濾。
- towns 只按 selected county 過濾。
- 鄉鎮市區 select 始終呈現，未選 county 時 disabled。
- 使用 `shallowRef` 保存 field error，使用 `useTemplateRef` 聚焦錯誤欄位。
- 保存按鈕只在 `phase === "saving"` 時 disabled。
- 以 `aria-invalid`、`aria-describedby` 與 `role="alert"` 關聯錯誤。

- [ ] **Step 4: 驗證 Task 4 通過**

Run: `pnpm test -- apps/web/src/components/region/RegionManualSelector.test.ts`  
Expected: PASS。

### Task 5: 完整驗證與真機複驗準備

**Files:**
- Update generated build output only through `pnpm build` if tracked by the workspace.

**Interfaces:**
- Consumes: Tasks 1–4 的完成結果。
- Produces: 可由現有 Cloudflare tunnel 真機複驗的開發版本。

- [ ] **Step 1: 執行相關測試集合**

Run:

```powershell
pnpm test -- apps/web/src/components/product/ProductSnapshotEditor.test.ts apps/web/src/adapters/BrowserGeolocation.test.ts apps/web/src/components/region/RegionLocationPanel.test.ts apps/web/src/components/region/RegionManualSelector.test.ts
```

Expected: 全部 PASS。

- [ ] **Step 2: 執行完整驗證**

```powershell
pnpm typecheck
pnpm test
pnpm build
```

Expected: 三個命令 exit code 0；可保留既有大型行政區 chunk warning，但不得新增錯誤。

- [ ] **Step 3: 確認 tunnel 仍可載入**

Run: 對現有 trycloudflare `/region` 執行 HTTP GET。  
Expected: HTTP 200，並由 Vite HMR 提供最新程式。

- [ ] **Step 4: 交付真機複驗清單**

- 產品同一題連續點兩個答案，只有最後一個保持選取。
- 封鎖定位時顯示權限提示或不誤導的通用提示。
- 定位成功後只有「確認並使用此地區」是黑色主要按鈕。
- 手動流程只有兩層下拉，空值保存會顯示錯誤。
