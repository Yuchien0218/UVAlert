# P0 Specification Consistency Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將已核准的「推薦部位自動套用」與「首頁直接提供最高優先操作」同步到完整 P0 文件鏈，並更新現有測試證據。

**Architecture:** PRD 維持最高產品權威，Release Manifest 收斂 P0 交付範圍，Screen Inventory、Copy Deck、TDD 與 RTM 分別承接畫面、文案、工程及追溯描述。所有文件使用同一套行為語義，不修改 reminder reducer 的期限公式或安全邊界。

**Tech Stack:** Markdown、PowerShell、ripgrep。

## Global Constraints

- 推薦部位可在進入 S-05 時寫入 `SetupDraft`，但這不等於使用者已確認塗抹、也不建立 Session 或 Application。
- S-06 必須清楚呈現實際部位、防護方式、產品與時間，只有使用者按下 `開始提醒` 才提交 `StartSessionCommandV1`。
- 首頁有 active Session 時，直接依 `primaryAction.actionKind` 顯示目前最高優先操作；提醒頁保留完整部位與事件資訊。
- 不修改 UVI 不參與補擦期限、沒有可信期限不顯示倒數等安全規則。
- 工程證據更新為 22 個測試檔、134 項測試通過。

---

### Task 1: 同步推薦部位自動套用規格

**Files:**
- Modify: `防曬晴報員PRD.md`
- Modify: `P0_RELEASE_MANIFEST.md`
- Modify: `P0_SCREEN_INVENTORY.md`
- Modify: `P0_COPY_DECK.md`
- Modify: `P0_TECHNICAL_DESIGN_DOCUMENT.md`
- Modify: `P0_REQUIREMENT_TRACEABILITY_MATRIX.md`

**Interfaces:**
- Consumes: S-03 已確認的情境、版本化 `BODY_ZONE_PRESET_V3`。
- Produces: 含預設 zones 的 `SetupDraft`；最終提交前仍非 Session 真值。

- [ ] **Step 1: 修改 PRD 流程與驗收語義**

將「必須先按使用這組」改為「進入 S-05 自動套用，清楚顯示並允許調整；S-06 最終確認」。

- [ ] **Step 2: 修改 Manifest、Screen、Copy 與 TDD**

移除仍要求額外接受推薦組合的 CTA／狀態，保留調整入口和最終確認。

- [ ] **Step 3: 更新 RTM**

將 AC-34、AC-79 與 Setup 證據描述改為自動套用後仍須最終確認。

### Task 2: 同步首頁最高優先操作規格

**Files:**
- Modify: `防曬晴報員PRD.md`
- Modify: `P0_RELEASE_MANIFEST.md`
- Modify: `P0_SCREEN_INVENTORY.md`
- Modify: `P0_COPY_DECK.md`
- Modify: `P0_TECHNICAL_DESIGN_DOCUMENT.md`
- Modify: `P0_REQUIREMENT_TRACEABILITY_MATRIX.md`

**Interfaces:**
- Consumes: reducer 產生的 `primaryAction.actionKind`。
- Produces: 首頁唯一主要 CTA；完整狀態仍由 `/reminder` 顯示。

- [ ] **Step 1: 修改首頁 CTA 規則**

無 active Session 顯示 `開始防曬提醒`；有 active Session 直接映射目前 `primaryAction` 的主要操作。

- [ ] **Step 2: 明定提醒頁角色**

首頁負責快速操作，提醒頁負責完整部位、原因、事件及次要管理。

- [ ] **Step 3: 同步追溯關係**

更新相關 Screen、Copy 與 AC-36、AC-64、AC-65、AC-81 描述。

### Task 3: 更新工程證據

**Files:**
- Modify: `P0_TECHNICAL_DESIGN_DOCUMENT.md`
- Modify: `P0_REQUIREMENT_TRACEABILITY_MATRIX.md`

**Interfaces:**
- Consumes: 已完成的 Bottom Sheet、`pendingTiming`、Process Banner 測試結果。
- Produces: 與目前 repository Gate 一致的文件證據。

- [ ] **Step 1: 更新 Gate 數字**

將 21 個測試檔、123 項測試改為 22 個測試檔、134 項測試。

- [ ] **Step 2: 補列新增證據範圍**

記錄 Bottom Sheet、推薦部位自動套用、`pendingTiming` 保存／恢復及產品頁 Process Banner。

### Task 4: 一致性驗證

**Files:**
- Verify: 全部七份 P0 核心 Markdown 文件。

**Interfaces:**
- Consumes: Tasks 1–3 的文件變更。
- Produces: 無已知相反敘述的規格鏈。

- [ ] **Step 1: 搜尋舊流程字句**

Run:

```powershell
rg -n "使用這組並繼續|尚未確認建議組合|查看目前提醒|21 test files|123 tests" *.md
```

Expected: 只保留歷史修訂紀錄或明確說明，不再作為現行行為。

- [ ] **Step 2: 搜尋新流程字句**

Run:

```powershell
rg -n "自動套用|最終確認|primaryAction.actionKind|22 test files|134 tests" *.md
```

Expected: PRD、Manifest、Screen、Copy、TDD 與 RTM 均具有對應描述。

- [ ] **Step 3: 檢查 Markdown 變更**

Run:

```powershell
rg -n "\{[^}]+\}|TBD|TODO|<<<<<<<|=======|>>>>>>>" 防曬晴報員PRD.md P0_*.md
```

Expected: 文案模板變數只存在於 Copy Deck／技術範例；沒有合併衝突標記或新增未決 placeholder。
