# UVAlert 全站文字整理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 在既有台灣繁體中文文案基礎上，完成現行 UVAlert App／PWA、公開衛教內容與產品規格文件的文字一致性整理，讓使用者能理解狀況、下一步與資料限制。

**Architecture:** 依現有檔案責任直接修改可見文字與文件內容，不新增 i18n 層、不改資料模型或流程邏輯。介面沿用「防曬氣象管家 × 防曬生活編輯部」的溫和、清楚語氣；衛教文章維持既有 Markdown、slug、來源與健康主張，只改善台灣用語、標題、摘要和閱讀提示。

**Tech Stack:** Vue 3、TypeScript、Vitest、Vite、Markdown、pnpm workspace。

## Global Constraints

- 只修改目前使用中的 `apps/web/src`、`docs/education/articles`、`docs/education`、`docs/decisions`、`docs/design`，以及為同步現行規格而需要調整的研究／superpowers 文件；不得修改 `docs/archive/`。
- 使用台灣繁體中文；直接稱呼「你」，採句首大寫的自然中文句型，不使用責備、戲劇化或安全保證。
- 核心詞彙固定為「提醒／補擦倒數／記錄補擦／補擦紀錄／防曬裝備／換新的一瓶／其他部位／儲存／登入／地區」。
- CTA 必須能獨立說明動作；錯誤訊息必須包含目前狀況與可採取的下一步；設定開關使用「開啟後會發生什麼」的正向描述。
- 不改提醒計算、UV/SPF/抗水數字、健康主張、路由 slug、文章 slug、API、資料庫、資料保存策略或已確認的資訊架構。
- 不提交 `.claude/settings.local.json`、`防曬晴報員設計系統.md` 或其他與本任務無關的未追蹤檔案。

## File Map

### 現行 App／PWA 介面

- Review/Modify: `apps/web/src/**/*.vue`、`apps/web/src/features/**/*.ts`、`apps/web/src/router/index.ts` 中的使用者可見標題、按鈕、標籤、提示、錯誤、空狀態與 aria 文本。
- Review/Modify: `apps/web/src/features/help/helpTopics.ts`、`apps/web/src/features/feedback`、`apps/web/src/features/settings` 的支援、回報、設定與資料文字。
- Test: 受文案影響的既有 Vitest 測試，不刪除行為斷言。

### 公開衛教與 SEO/AEO/GEO

- Review/Modify: `docs/education/README.md`、`docs/education/sources.md`、`docs/education/articles/*.md` 的公開標題、摘要、分類導讀、來源說明與閱讀限制。
- Preserve: 48 篇文章的 slug、front matter 識別欄位、分類、官方來源、查閱日期、數字、健康主張與醫療限制。

### 產品規格與設計文件

- Review/Modify: `docs/decisions/2026-08-15-redesign-sitemap-userflow-current.md`、`docs/design/README.md`、`docs/design/current-direction.md`、現行 wireframe／後端規格中的介面用詞。
- Preserve: 決策歷史的事實、版本與封存內容；只修正現行文件中會造成誤解的名稱或說明。

---

## Task 1: 建立全域文字盤點與詞彙基線

**Files:** `apps/web/src`、`docs/education`、`docs/decisions`、`docs/design`。

- [x] Step 1: 執行現行文字掃描，列出所有淘汰詞、英文殘留、孤立「確認／完成／儲存」CTA、模糊錯誤訊息與過長標題。
- [x] Step 2: 逐項判斷是使用者可見文字、程式註解、測試敘述、官方引用或歷史文件；只將使用者可見且仍需改善的項目納入修改。
- [x] Step 3: 把盤點結果整理成 `docs/decisions/2026-08-17-copy-audit.md`，記錄本次統一詞彙、刻意保留的專有名詞與未改動的健康／法務內容。
- [x] Step 4: 以 `git diff --check` 確認盤點文件沒有格式錯誤，提交 `docs: record comprehensive copy audit baseline`。

## Task 2: 整理 App／PWA 的所有流程文案

**Files:** `apps/web/src/pages`、`apps/web/src/components`、`apps/web/src/features`、`apps/web/src/router/index.ts`。

- [x] Step 1: 先執行目前相關頁面與元件測試，記錄只因文字不同而失敗的預期值。
- [x] Step 2: 整理提醒、首頁、倒數、部位、事件與夜間狀態；每個狀態依「現在怎麼了 → 為什麼 → 下一步」呈現，並讓主要 CTA 只有一個。
- [x] Step 3: 整理開始提醒、補擦、情境事件、更正、地區與定位流程；統一「下一步／返回／取消／開始提醒／記錄補擦／更正這筆紀錄」的流程詞彙。
- [x] Step 4: 整理裝備、分享、更多、安裝、常見問題、問題回報、特殊狀況、帳戶、資料、同步與外觀設定；清楚區分「本機資料」「雲端資料」「防曬裝備」與「防曬乳」。
- [x] Step 5: 檢查所有 aria-label、role=status、placeholder、頁面 title 與連結文字，使其離開視覺脈絡仍能理解目的；不改 CSS 或互動行為。
- [x] Step 6: 更新受影響測試，執行相關測試與型別檢查，提交 `copy: complete app zh-tw copy audit`。

## Task 3: 整理衛教文章、分類導讀與搜尋內容

**Files:** `docs/education/README.md`、`docs/education/sources.md`、`docs/education/articles/*.md`。

- [x] Step 1: 依六大分類核對文章標題、摘要、primaryQuestion 與分類導讀，讓標題先回答常見問題，摘要不做保證。
- [x] Step 2: 統一「防曬乳／防曬裝備／補擦／抗水／遮蔭／紫外線」等詞彙，清理台灣讀者不自然的直譯詞，但保留引用中的原文與必要專有名詞。
- [x] Step 3: 統一文章內的來源、審閱、限制與相關文章連結說明；公開頁可直接讀到答案、條件、限制與官方來源，不把關鍵資訊藏在 FAQ 互動中。
- [x] Step 4: 執行 slug、front matter、來源、數字與健康主張差異檢查；不修改 URL 或醫療結論。
- [x] Step 5: 提交 `copy: polish education and search copy in zh-tw`。

## Task 4: 整理 Sitemap／User Flow／設計文件文字

**Files:** `docs/decisions/2026-08-15-redesign-sitemap-userflow-current.md`、`docs/design/README.md`、`docs/design/current-direction.md`。

- [x] Step 1: 將現行 sitemap 與 user flow 使用的頁面名稱改成與 App 一致的「提醒／裝備／更多」及六大衛教分類。
- [x] Step 2: 逐頁補足「頁面目的、主要 CTA、下一步」的短句，移除會把封存舊流程誤認成現行規格的文字。
- [x] Step 3: 保留純文字樹狀結構與已確認的資訊架構，不新增頁面或功能；提交 `docs: align current sitemap and user-flow copy`。

## Task 5: 全域文案驗證與交付

- [x] Step 1: 掃描現行檔案的淘汰詞、混用詞、英文使用者可見字串與不完整錯誤訊息；逐項確認剩餘結果是否為程式碼、官方引用或必要專有名詞。
- [x] Step 2: 執行受影響測試、`pnpm check`、`pnpm typecheck`、`pnpm build` 與 `git diff --check`。
- [x] Step 3: 確認 `docs/archive/` 沒有差異、文章 slug 與來源未變、未追蹤檔案沒有被加入提交。
- [ ] Step 4: 以 320px 窄寬檢查主要頁面標題、按鈕、錯誤訊息、衛教標題與分享預覽文字；如超長，優先縮短文字，不改功能。（需在瀏覽器中進行人工視覺檢查。）
- [x] Step 5: 建立交付摘要，列出已處理範圍、刻意保留的健康／法務限制、驗證結果與仍需人工閱讀審查的長文案。
