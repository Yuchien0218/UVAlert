# P0 S-08 Reapplication Implementation Plan

**Goal:** 完整實作 `/reminder/reapply`，讓使用者可只更新最後確認的部位、為不同部位指定不同產品 snapshot，並以單一 IndexedDB transaction 原子提交。

**Architecture:** 由 contracts 定義版本化 command 與產品目錄資料；domain 將 command 規劃成一個 confirmation group、互斥的 ApplicationEvents 與新 projection；persistence 在同一 Dexie transaction 驗證 revision、owner、sequence、產品 snapshot 並提交全部資料；Vue controller 管理草稿、驗證、重試與成功狀態，page/components 只負責呈現與導覽。

**Tech Stack:** TypeScript、Zod、Vue 3 Composition API、Vue Router 4、Dexie/IndexedDB、Vitest、Vue Test Utils。

---

## 稽核基準

- 已核准設計：`docs/superpowers/specs/2026-08-01-p0-s08-reapplication-design.md`
- 畫面：`P0_SCREEN_INVENTORY.md` S-08
- 文案：`P0_COPY_DECK.md` CP-REAPPLY-001～005
- 追蹤：F-06～08、AC-07／28／37／39／40／45／65／82／85／87
- 現況：已有 Application group/event schema、reducer、Start/End Session transaction；缺少 Reapply command、product catalog、reapply transaction、controller、route 與 UI。

## Task 1：補齊產品目錄與 Reapply contracts

**Files:**
- Modify: `packages/contracts/src/versions.ts`
- Modify: `packages/contracts/src/product.ts`
- Modify: `packages/contracts/src/commands.ts`
- Modify: `packages/contracts/src/records.ts`
- Modify: `packages/contracts/src/index.ts`
- Test: `packages/contracts/src/reapply-command.test.ts`
- Test: `packages/contracts/src/product-catalog.test.ts`

1. 先寫失敗測試：單產品／多產品 partition 可通過；空 applications、空 zone、重複 zone／event ID、group ID 衝突、非法時間與 revision 被拒絕。
2. 先寫失敗測試：產品 record 必須有穩定 ID、trimmed displayName、current snapshot/fingerprint、時間與 active/stopped 狀態。
3. 新增 `ReapplyCommandV1Schema`、`ProductCatalogRecordV1Schema` 與型別。
4. 執行 focused tests，確認綠燈。

## Task 2：新增 domain reapplication planning

**Files:**
- Modify: `packages/domain/src/planning.ts`
- Modify: `packages/domain/src/index.ts`
- Test: `packages/domain/src/reapplication-planning.test.ts`
- Modify: `packages/test-fixtures/src/index.ts`

1. 寫失敗測試：不同 product/snapshot 建立同一 group 下多個互斥 ApplicationEvents。
2. 測試只更新選中部位、未選部位期限不變、不合格 snapshot 不製造倒數、水中既有 deadline 不被虛構重設。
3. 實作 `planReapplication`，用既有 reducer 重播成 revision + 1 projection。
4. 執行 focused tests。

## Task 3：建立完整本機產品目錄

**Files:**
- Modify: `packages/platform/src/index.ts`
- Modify: `packages/persistence-web/src/db/database.ts`
- Add: `packages/persistence-web/src/repositories/local-product-catalog-repository.ts`
- Modify: `packages/persistence-web/src/index.ts`
- Test: `packages/persistence-web/src/repositories/local-product-catalog-repository.test.ts`
- Modify: `apps/web/src/features/product/createProductSettingsController.ts`
- Modify: `apps/web/src/pages/ProductsPage.vue`

1. 寫失敗測試：create/read/update/list/stop；修改 current snapshot 不會改寫舊 event snapshot。
2. Dexie 升版，將 `SunscreenProducts` 改為完整 record；保留既有 AppMetadata current snapshot 路徑並以中性名稱匯入一次。
3. 新增 catalog repository 與 controller API；產品頁能保存具 displayName 的目錄項目，同時維持 Setup current snapshot 相容性。
4. 執行 focused tests 與 Vue typecheck。

## Task 4：實作原子 IndexedDB reapply transaction

**Files:**
- Modify: `packages/platform/src/index.ts`
- Modify: `packages/persistence-web/src/repositories/local-session-repository.ts`
- Test: `packages/persistence-web/src/repositories/local-session-repository.reapply.test.ts`

1. 寫失敗整合測試：group/events/zones/session revision/sequence/receipt 一次提交。
2. 測試相同 idempotency key 回傳同一 receipt。
3. 測試 revision、sequence、owner、ended session、非法 zone、非 topical zone、stale product snapshot 衝突。
4. 注入 transaction 中途失敗，驗證所有 store 均無部分資料。
5. 實作 `LocalSessionRepository.reapply()`，僅在 commit 後發布跨分頁 invalidation。
6. 執行 focused tests。

## Task 5：實作 Reapplication controller

**Files:**
- Add: `apps/web/src/features/reapplication/createReapplicationController.ts`
- Add: `apps/web/src/features/reapplication/createReapplicationController.test.ts`
- Modify: `apps/web/src/app/createWebAppServices.ts`

1. 寫失敗測試：due/soon 預選、affected-zone fallback、全部／自訂、不同產品 assignment 保留。
2. 測試空部位、缺產品、未來時間、穩定 idempotent retry、revision conflict、ended session、commit 後 refresh 失敗。
3. 實作 readonly controller state 與明確 actions；持久化錯誤重試沿用同一 command。
4. 執行 focused tests。

## Task 6：建立 `/reminder/reapply` 手機 UI 與路由

**Files:**
- Add: `apps/web/src/pages/ReapplyPage.vue`
- Add: `apps/web/src/components/reapplication/ReapplicationForm.vue`
- Add: `apps/web/src/components/reapplication/ReapplicationZoneSelector.vue`
- Add: `apps/web/src/components/reapplication/ReapplicationProductAssignments.vue`
- Add: `apps/web/src/components/reapplication/ApplicationTimeSelector.vue`
- Add: `apps/web/src/components/reapplication/ReapplicationReview.vue`
- Add: `apps/web/src/pages/ReapplyPage.test.ts`
- Modify: `apps/web/src/router/index.ts`
- Modify: `apps/web/src/router/index.test.ts`
- Modify: `apps/web/src/pages/ReminderPage.vue`
- Modify: `apps/web/src/pages/HomePage.vue`

1. 先寫 route/action、空 Session guard、取消、成功與基本可存取性測試。
2. 實作資訊順序、建議／全部／自訂、逐部位產品、快速／自訂時間、最終摘要、安全提示。
3. 隱藏底部導覽；360／390／430px 不產生橫向捲動；觸控區符合 `--tap-target`。
4. `record_reapplication` 從首頁與提醒頁導向此 route，其餘 action 行為不變。
5. 執行 focused tests、Vue typecheck。

## Task 7：文件同步與完整驗證

**Files:**
- Modify: `P0_REQUIREMENT_TRACEABILITY_MATRIX.md`
- Modify: `P0_RELEASE_MANIFEST.md`

1. 將 S-08/F-06～08 更新為已實作／自動化驗證，保留尚未實作的更正 route 限制。
2. 執行 `pnpm typecheck`。
3. 執行 `pnpm test`。
4. 執行 `pnpm build`。
5. 檢查 feature branch diff、無意外產物與工作樹狀態，建立小型邏輯 commits。

