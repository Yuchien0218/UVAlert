# CLAUDE.md

給 AI 助理的專案指引。完整技術文件以 [README.md](README.md) 為主，這份檔案只補充「動手前一定要知道」的現況與眉角。

## 專案是什麼

Sunshield Advisor（產品名 UVAlert，中文名「防曬晴報員」）—— Web／PWA first、Capacitor-ready 的 pnpm monorepo，Vue 3 + Vite。唯一可執行應用是 `apps/web`，其餘 `packages/*` 是共用的 domain／contracts／persistence／platform／ui／test-fixtures 套件。後端在 `supabase/`，免登入本機提醒不依賴它。

## 動手前必讀

- **UX／IA 唯一現行基準**：`docs/decisions/2026-08-15-redesign-sitemap-userflow-current.md`
- **視覺方向**：`docs/design/current-direction.md`（先讀 `docs/design/README.md` 這份索引）
- **畫面真實來源只有兩個檔案**：`packages/ui/src/styles.css`（設計 token）與 `apps/web/src/assets/app.css`（共用樣式）。文件與程式碼衝突時以程式碼為準。
- **`docs/archive/2026-08-pre-redesign/`** 是舊版 P0 規格、舊設計系統、舊 mockup 與截圖的歸檔，只能用來理解「當初為什麼這樣決定」，不可當作目前開發或設計依據。

## 目前設計現況（2026-08-22，如有變動請更新這段）

- Logo 已定案為「06 播報印記」，配色是暖琥珀金 `#C1832E`、暖黑咖啡 `#33291F`、暖象牙 `#FAF5EC`（見 `docs/design/logo-concepts/README.md`）。
- App icon／favicon／apple-touch-icon **已經**套用新 logo（commit `8355d11`）。
- 但新配色**還沒**套進 `packages/ui/src/styles.css` 的品牌色 token，`apps/web/public/manifest.webmanifest` 的 `theme_color`／`background_color` 也還是舊的中性灰階 `#f9f9f9`。也就是說：icon 已換，配色沒換——不要假設兩者同步完成。
- 若在文件裡看到「配色尚未定案」「icon 尚未套用」之類的敘述，先確認日期，很可能是還沒更新的舊敘述，而不是目前的真實狀態。

## Session 衛生（這個專案的已知痛點）

- 這個 repo 常常同時有多個 session／worktree 在跑，彼此改同一批檔案會互相覆蓋。動手前，尤其是要改設計 token、CSS 或共用元件時，先確認沒有別的 session 正在動同一批檔案。
- 如果在 `.claude/worktrees/` 或根目錄 `.worktrees/` 底下發現殘留的資料夾，那通常是舊 session 沒清乾淨留下的 git worktree（`.git/info/exclude` 忽略，`git status` 看不到，但檔案系統掃描看得到），裡面可能裝著已經過期的舊版檔案（包含舊 icon／舊文件）。不要把裡面的內容當作現行參考來源；要清理前先跟使用者確認，用 `git worktree remove` 而不是直接刪資料夾。
- 做出會改變範圍或畫面結構的裁決後，把規劃筆記與原型複製進 `docs/decisions/`，並在該資料夾 `README.md` 補一列「裁決 → 回寫落點」，不要只留在 session 的暫存目錄。
