# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案

Sunshield Advisor（產品名 UVAlert，中文名「防曬晴報員」）——以防曬乳補擦倒數為核心的 Web／PWA，pnpm monorepo，Vue 3 + Vite + TypeScript。免登入、本機優先；Supabase 後端是選配的同步層，本機倒數不依賴它。

需要 Node >= 24、pnpm >= 11。

## 常用指令

```bash
pnpm install
pnpm check          # typecheck + test，送 PR 前的主要關卡
```

| 指令 | 用途 |
|---|---|
| `pnpm typecheck` | 遞迴跑所有套件的 `tsc` / `vue-tsc` |
| `pnpm test` | vitest 全部跑一次 |
| `pnpm test:watch` | watch 模式 |
| `pnpm build` | 遞迴 build（web 會先產生衛教內容，再 `vue-tsc` → `vite build` → 產生公開 HTML） |

跑單一測試檔或單一測試：

```bash
pnpm vitest run packages/domain/src/reducer.test.ts
```

```bash
pnpm vitest run -t "測試名稱關鍵字"
```

只跑單一套件的 typecheck：

```bash
pnpm --filter @sunshield/web typecheck
```

資料與資產產生器（產出物有些會 commit 進 repo）：

| 指令 | 用途 |
|---|---|
| `pnpm education:generate` | 由 `docs/education/articles/*.md` 產生 Vue 使用的衛教資料 |
| `pnpm region-data:build` | 由官方 NLSC SHP 產生行政區界線與索引 |
| `pnpm region-data:verify` | 驗證上面的產出可重現 |
| `node tools/icon-system/generate-icons.mjs` | 正規化圖示 SVG、重組預覽板、產生 Vue 用的圖示註冊表（冪等，不碰幾何） |
| `node tools/fonts/build-fonts.mjs` | 由完整字型 subset 出自行托管的 woff2（原始字型不進 repo，見 `tools/fonts/README.md`） |

Supabase 本機開發：`pnpm supabase:start`、`pnpm supabase:reset`、`pnpm supabase:functions:serve`。

開發伺服器用 `.claude/launch.json` 的 `web-dev` 設定透過 preview 工具啟動，不要用 Bash 直接跑 vite。

## 架構

### 事件溯源的核心

整個提醒狀態是**事件流經過純 reducer 算出來的投影**，不是可變狀態：

```
SessionEventStreamV1（事件）→ packages/domain reducer → SessionProjection（畫面讀這個）
```

`packages/domain` 是**純的**：不依賴 Vue、Dexie、瀏覽器 global，也**不讀系統時間**——時間一律由 `ReducerClock` 從外面傳進來。這是這個 repo 最重要的約束，動 domain 時不要破壞它（測試也因此不需要 mock 時間，直接傳 clock 即可）。

更正（correction）不是修改歷史事件，而是追加更正事件，由 `corrections.ts` 在 reduce 時解析成有效事件——所以歷史永遠可回溯。

### 套件邊界

| 套件 | 職責 |
|---|---|
| `packages/contracts` | 跨層的版本化 Zod schema。所有層之間傳遞的資料都先過這裡 |
| `packages/domain` | 純 reducer 與規劃邏輯（planning、ordering、water、corrections） |
| `packages/platform` | port 介面（儲存、定位、連線、生命週期、雲端），**只有介面沒有實作** |
| `packages/persistence-web` | Dexie／IndexedDB schema、原子 command transaction、跨分頁 invalidation |
| `packages/ui` | 設計 token（`src/styles.css`），被 `apps/web` 匯入 |
| `packages/test-fixtures` | 跨套件共用測試資料與契約測試 |
| `apps/web` | 唯一可執行應用；`src/adapters/` 是 platform port 的瀏覽器實作 |

依賴方向是單向的：`apps/web` → `platform`／`persistence-web` → `domain` → `contracts`。domain 不知道 persistence 存在。

`apps/web/src/app/createWebAppServices.ts` 是**組裝根**（composition root）——所有 adapter 與 controller 在這裡接起來，透過 `injection.ts` 提供給元件。要理解「某個功能怎麼串起來的」，從這個檔案往下讀最快。

`apps/web/src/features/*/create*Controller.ts` 是各功能的狀態協調層，元件本身盡量不放邏輯。

### 版本化 schema

`packages/contracts/src/versions.ts` 集中所有版本常數（`BODY_ZONE_SCHEMA_VERSION`、`DEFAULT_RULESET_VERSION` 等）。事件與命令都帶版本欄位。

有一個實務上重要的性質：**Zod 預設會 strip 未知欄位**，所以從 schema 移除欄位通常不需要資料遷移，舊資料仍能解析（`user-preferences-v1` 移除 `appearance` 時就是這樣處理的，見 `DESIGN.md` 第十節）。新增必填欄位才需要升版。

### 本機優先與跨分頁

同一裝置只允許一個活動 Session，但多分頁共用同一個。寫入走 `persistence-web` 的原子 transaction，完成後透過 `BroadcastChannel`（`cross-context.ts`）發 invalidation，其他分頁重新讀取投影。`BroadcastChannel` 不支援時會降級成 null notifier，不會爆掉。

### 後端

`supabase/functions/` 對應 `/v1/*` API：`sync-manifest`、`sync-read`、`sync-commit`、`sync-delete`、`uv-forecast`（CWA 代理）、`feedback`、`account-delete`。設計細節見 `docs/superpowers/specs/2026-08-17-backend-foundation-design.md`。

前端只使用 `VITE_SUPABASE_URL`、`VITE_SUPABASE_PUBLISHABLE_KEY`、`VITE_API_BASE_URL`；CWA API key、service-role key 與 Google client secret 不得放進 `VITE_*`。

### 產生的檔案

`apps/web/src/generated/*.generated.json`（行政區資料）與衛教內容都是產生出來的，不要手改——改來源再跑對應的產生器。

## 設計與文件

- **設計系統唯一權威是根目錄 `DESIGN.md`**：完整色彩 token、字體、間距、元件規範、圖示風格。第十節「與程式碼的落差」是文件與程式碼差異的唯一對照表，不要在別處另立一份。
- **Claude Design 上有一份由 `DESIGN.md` 產生的 component library**（從 GitHub `main` 同步）。它是下游產物，不是權威——**要改設計先改 `DESIGN.md`**，再讓它重新同步。不要只在 Claude Design 裡調整而沒回寫，否則會多出第四份真相（目前已有 `DESIGN.md`、`styles.css`、`app.css` 三份）。
- **UX／IA 現行基準**：`docs/decisions/2026-08-15-redesign-sitemap-userflow-current.md`
- **圖示系統**：`docs/design/icon-system/README.md`。幾何的真實來源是 Illustrator，不要手改 SVG path；改完跑 `generate-icons.mjs`。
- **畫面的程式碼真實來源**只有 `packages/ui/src/styles.css`（token）與 `apps/web/src/assets/app.css`（共用類別）。文件與程式碼衝突時以程式碼為準。
- `docs/archive/2026-08-pre-redesign/` 是舊版 P0 規格與設計的歸檔，只能用來理解歷史，不可當作現行依據。

### 配色分兩套，範圍不同（最容易搞混）

- **介面**：暖象牙 `#FAF5EC` ＋ 深杏桃 `#9F5E42`（primary／行動色）＋ 深咖啡 `#2E2925`（`DESIGN.md` 第二節）
- **圖示與 Logo**：墨咖 `#33291F` ＋ 琥珀金 `#C1832E`（`DESIGN.md` 第八節）

琥珀金 `#C1832E` 是圖示重點色，**不是**品牌主色；要填 primary token 時用 `#9F5E42`。

目前 App icon／favicon 已套用新 Logo，但 `packages/ui/src/styles.css` 與 `manifest.webmanifest` 仍是舊的中性灰階——icon 換了不等於配色換了。文件裡若出現「配色尚未定案」「icon 尚未套用」，先確認日期與出處。

## Session 衛生（這個 repo 的已知痛點）

這個 repo 經常同時有多個 session 在跑——2026-08-22 一天內最多同時 4 個，並且真的因此弄丟了工作。動手前先跑 `ListAgents` 看看還有誰在。

### 刪任何東西之前：`git status` 乾淨 ≠ 安全

**2026-08-22 的實際事故**：移除殘留的 `.claude/worktrees/sad-aryabhata-1e3e73` 前，已先跑 `git -C <worktree> status` 確認 working tree 乾淨，也取得使用者核准，才執行 `git worktree remove`。但當時有另一個 session 正在那個目錄工作，**它的未 commit 變更全部遺失，無法救回**——未 commit 的檔案不會進 git 物件庫，`git stash list` 與 `git fsck` 都撈不到，只能重做。

所以移除 worktree 或刪除目錄前，**兩件事都要做**：

1. `git status` 確認沒有未 commit 的變更
2. `ListAgents` 確認沒有其他 session 正在那個路徑工作

只做第 1 項不夠——另一個 session 可能正好在你檢查之後、移除之前寫入。

### 其他

- 改設計 token、CSS 或共用元件前，先確認沒有別的 session 在動同一批檔案。
- 起 dev server 前先確認 port 沒被佔。同日另一起事故：preview 工具佔住 5173，把別的 session 的 server 擠到 5174，對方差點為此去改 `.claude/launch.json`。
- `.claude/worktrees/` 或根目錄 `.worktrees/` 底下若有殘留資料夾，通常是舊 session 沒清乾淨的 git worktree（被 `.git/info/exclude` 忽略，`git status` 看不到，但檔案系統掃得到），裡面可能是過期的舊版檔案。不要當作現行參考；清理前先跟使用者確認，並用 `git worktree remove` 而不是直接刪資料夾。
- 工作告一段落就 commit，不要把變更留在 working tree 過夜。同日有兩個 session 結束時留下未 commit 的工作，接手的人得先花力氣判斷「這是誰的、能不能碰」。
- 做出會改變範圍或畫面結構的裁決後，把規劃筆記與原型放進 `docs/decisions/`，並在該資料夾 `README.md` 補一列「裁決 → 回寫落點」，不要只留在 session 暫存目錄。
