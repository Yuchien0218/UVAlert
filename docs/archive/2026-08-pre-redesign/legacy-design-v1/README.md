# 舊版存檔 v1 — 重新設計 wireframe 與配色之前

這個資料夾是 **2026-08-08 重新設計之前的完整存檔**。目的只有一個：等新版 wireframe 與配色定案後，還能回頭對照舊版長什麼樣、當初為什麼那樣決定。

對應的 commit：`26dc10a`（分支 `claude/pre-redesign-p0-work`）。

> 截圖已於 2026-08-08 重拍。第一版拍攝時 S-09、S-10、產品頁改版與本機資料管理都還沒實作，那份存檔少了五個畫面、且產品頁與 `/settings/data` 拍到的是舊版與 placeholder。這一版是 sitemap 缺口全部補完後的真實狀態。

---

## 一、`screenshots/` — 重畫前的實際畫面

用 headless Chrome 以 375×812 @2x（iPhone 尺寸）對真實 dev server 拍攝，全頁截圖，**不是 mockup，是當時跑起來的樣子**。

| 檔名 | 畫面 | 狀態條件 |
|---|---|---|
| `01-home.png` | 首頁 `/` | 提醒進行中 |
| `02-reminder.png` | 目前提醒 `/reminder` | 提醒進行中，倒數 120 分鐘 |
| `02b-reminder-recent-events.png` | 同上，最近事件已展開 | S-10 前置的純文字清單 |
| `02c-reminder-end-confirm.png` | 結束提醒的二次確認 | — |
| `03-reminder-reapply.png` | S-08 記錄實際補擦 `/reminder/reapply` | 完整表單，8 個部位 |
| `03b-reapply-success.png` | S-08 提交後的成功狀態 | — |
| `04-products.png` | S-11 我的防曬裝備 `/products` | 一件防曬產品＋一副太陽眼鏡，可看出品類差異與「不影響倒數」標示 |
| `04a-products-empty.png` | 同上，空白狀態 | 完全沒有裝備 |
| `04b-product-new.png` | S-12 新增防曬裝備 `/products/new` | 防曬品類，含購買月份與到期日 |
| `04c-product-edit.png` | S-13 編輯防曬裝備 `/products/:id/edit` | 既有防曬產品，品類已鎖定不可改為純紀錄 |
| `05-more.png` | 更多設定 `/more` | — |
| `06-help-index.png` | 常見問題總覽 `/help` | 內容被審查閘門擋住 |
| `07-help-beach.png` | 海邊防曬 Q&A | 「內容正在審查」狀態 |
| `08-help-how-it-works.png` | 運作說明 | 「內容正在審查」狀態 |
| `09-special-situation.png` | 特殊狀況 | 「此功能尚未開放」狀態 |
| `10-settings-display.png` | 顯示設定 `/settings/display` | — |
| `11-settings-data.png` | S-19 本機資料管理 `/settings/data` | 摘要、匯出與三段清除 |
| `12-install.png` | 安裝到手機 `/install` | — |
| `13-region.png` | 地區設定 `/region` | 未設定地區 |
| `14-setup-context.png` | 設定步驟 1：情境 `/setup/context` | 已選「一般戶外」 |
| `15-setup-protection-sheet.png` | 調整追蹤部位 sheet | 兩步流程後 `/setup/protection` 已無入口，改為步驟 2 的原地 sheet |
| `16-setup-timing.png` | 設定步驟 2：塗抹時間與開始提醒 | 含送出前摘要（AC-34 規定不得摺疊） |
| `17-not-found.png` | 找不到頁面 | — |
| `18-reminder-report.png` | S-09 回報狀況 `/reminder/report` | 第一層事件選擇；沒有可關閉的水上活動時不顯示離水 |
| `18b-report-water-start.png` | 同上，第二層確認 | 已選「游泳／下水」，含水上 interval 狀態與部位預選 |
| `18c-report-success.png` | S-09 提交後的成功狀態 | — |
| `19-event-correct.png` | S-10 更正最近事件 `/reminder/event/:id/correct` | 更正入水事件；此例尚無配對離水，部位可調整 |

**所有 sitemap 上的畫面都已實作並拍到。** 這一版沒有缺席的畫面。

**截圖裡有一個已知缺陷**：`01-home.png` 的「戶外資訊」區塊，「目前未設定地區…」那段文字被壓成直排。這是待修的版面 bug，不是設計意圖，已有另一個 session 在 worktree `claude/sad-aryabhata-1e3e73` 上處理。

---

## 二、`docs/` — 舊版設計與規格文件快照

從根目錄與 `docs/` 複製過來的當時版本。**這些是複本，不是正本**；正本仍在原位並會繼續更新，這裡的用途是保留重畫當下的樣貌。

| 檔案 | 內容 |
|---|---|
| `2026-08-06-sitemap-userflow.html` | **Sitemap 與核心 User Flow 的視覺圖**（瀏覽器開啟） |
| `2026-08-07-sitemap-branch-flows.md` | **Sitemap 分支流程的逐條實現狀態**（✅／⏳／⚠️ 標記） |
| `2026-08-06-p0-04-05-mockup.html` | S-04／S-05 的舊版 mockup |
| `2026-08-07-spec-gaps-analysis.md` | 規格缺口分析 |
| `2026-08-07-session-summary.md` | 開發過程的階段性總結（寫於工作中途，非最終狀態） |
| `DESIGN_SYSTEM.md` | 舊版設計系統 |
| `DESIGN_CONSTRAINTS_P0.md` | **重畫前必讀**：哪些是 P0 驗收條件、哪些只是美感偏好 |
| `P0_SCREEN_INVENTORY.md` | 畫面清單 |
| `P0_COPY_DECK.md` | 文案 |
| `P0_REMINDER_RULE_DECISION_TABLE.md` | 提醒規則決策表 |
| `P0_REQUIREMENT_TRACEABILITY_MATRIX.md` | 需求追溯矩陣（AC 編號的出處） |
| `P0_RELEASE_MANIFEST.md` | 發布清單 |
| `P0_TECHNICAL_DESIGN_DOCUMENT.md` | 技術設計 |
| `防曬晴報員PRD.md` | PRD |

> 重畫配色之前，先讀 `DESIGN_CONSTRAINTS_P0.md`。裡面列的 AC-66～71 是驗收條件不是品味問題——例如不得以綠色表示安全、狀態不能只靠顏色區分——照著漂亮的直覺畫很容易做出一版過不了 P0 的稿。

---

## 三、`session-transcript-2026-08-07.md` — 開發過程逐字稿

那段開發對話的完整紀錄（約 167 KB）。**git 歷史裡沒有這些東西**：每個決策的理由、被否決的方案、你當時提出的取捨。

例如「為什麼刪掉逐部位的防護方式選項」、「S-04 揭露層次為何改成一次一組」、「為什麼三步流程併成兩步」——這些重畫時很可能會重新踩一次的坑，理由都在裡面。

工具呼叫壓縮成單行摘要，工具回傳結果已省略。原始 JSONL 在
`~/.claude/projects/C--Users-yu-Coding-Projects-UVAlert/8213f565-3e63-4e9b-95a3-b907c423a17a.jsonl`（2726 筆）。
