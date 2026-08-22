# CLAUDE.md

給 AI 助理的專案指引。完整技術文件以 [README.md](README.md) 為主，這份檔案只補充「動手前一定要知道」的現況與眉角。

## 專案是什麼

Sunshield Advisor（產品名 UVAlert，中文名「防曬晴報員」）—— Web／PWA first、Capacitor-ready 的 pnpm monorepo，Vue 3 + Vite。唯一可執行應用是 `apps/web`，其餘 `packages/*` 是共用的 domain／contracts／persistence／platform／ui／test-fixtures 套件。後端在 `supabase/`，免登入本機提醒不依賴它。

## 動手前必讀

- **設計系統唯一權威**：根目錄 `DESIGN.md`——完整色彩 token、字體、間距、元件規範、圖示風格。要改任何視覺相關的東西，先讀這份。
- **UX／IA 唯一現行基準**：`docs/decisions/2026-08-15-redesign-sitemap-userflow-current.md`
- **圖示系統**：`docs/design/icon-system/README.md`（幾何真實來源是 Illustrator，不要手改 SVG path）
- **畫面真實來源只有兩個檔案**：`packages/ui/src/styles.css`（設計 token）與 `apps/web/src/assets/app.css`（共用樣式）。文件與程式碼衝突時以程式碼為準。
- **`docs/archive/2026-08-pre-redesign/`** 是舊版 P0 規格、舊設計系統、舊 mockup 與截圖的歸檔，只能用來理解「當初為什麼這樣決定」，不可當作目前開發或設計依據。

## 設計現況：文件是目標，程式碼還沒跟上

`DESIGN.md` 的色彩與字體是**目標方向**，尚未套用到程式碼。**完整且維護中的落差對照表在 `DESIGN.md` 第十節「與程式碼的落差」——以那份為準，不要在別處另立一份。**

兩件最容易搞混的事：

1. **配色分兩套，範圍不同，不要混用**
   - **介面**用暖象牙 `#FAF5EC` ＋ 深杏桃 `#9F5E42`（primary／行動色）＋ 深咖啡 `#2E2925`（DESIGN.md §二）
   - **圖示與 Logo** 用墨咖 `#33291F` ＋ 琥珀金 `#C1832E`（DESIGN.md §八）
   - 琥珀金 `#C1832E` 是圖示重點色，**不是**品牌主色。要填 primary token 時用 `#9F5E42`。

2. **Logo／icon 已上線，介面配色沒有**
   - App icon／favicon／apple-touch-icon 已套用 06 播報印記（commit `8355d11`）。
   - 但 `packages/ui/src/styles.css` 仍是舊的中性灰階（`#f9f9f9`／`#121212`），`manifest.webmanifest` 的 `theme_color` 也還是 `#f9f9f9`。icon 換了不等於配色換了。

若在文件裡看到「配色尚未定案」「icon 尚未套用」之類的敘述，先確認日期與出處，很可能是還沒更新的舊敘述。

## Session 衛生（這個專案的已知痛點）

- 這個 repo 常常同時有多個 session／worktree 在跑，彼此改同一批檔案會互相覆蓋。動手前，尤其是要改設計 token、CSS 或共用元件時，先確認沒有別的 session 正在動同一批檔案。
- 如果在 `.claude/worktrees/` 或根目錄 `.worktrees/` 底下發現殘留的資料夾，那通常是舊 session 沒清乾淨留下的 git worktree（`.git/info/exclude` 忽略，`git status` 看不到，但檔案系統掃描看得到），裡面可能裝著已經過期的舊版檔案（包含舊 icon／舊文件）。不要把裡面的內容當作現行參考來源；要清理前先跟使用者確認，用 `git worktree remove` 而不是直接刪資料夾。
- 做出會改變範圍或畫面結構的裁決後，把規劃筆記與原型複製進 `docs/decisions/`，並在該資料夾 `README.md` 補一列「裁決 → 回寫落點」，不要只留在 session 的暫存目錄。
