# 裁決紀錄

這個資料夾保存**裁決當下的原始產物**：規劃筆記與互動原型。它們是規格回寫的依據，
不是規格本身。正式規格一律以根目錄的 P0 文件為準。

保留原因：這些檔案原本只存在於 session 的暫存目錄，對話紀錄刪除後幾乎無法追回。
裁決理由跟著 git 走，才不會在幾輪之後變成「當初為什麼這樣決定」的無頭公案。

## 2026-08-06：P0 範圍四項裁決與 S-04／S-05 版面

| 檔案 | 內容 |
| --- | --- |
| `2026-08-06-p0-scope-decisions-notes.md` | 四項裁決的規劃筆記（帳號、Q&A、設定步驟、產品頁） |
| `2026-08-06-sitemap-userflow.html` | Sitemap 與核心 User Flow，已納入四項裁決 |
| `2026-08-06-p0-04-05-mockup.html` | S-04 揭露層次與 S-05 固定操作列的可操作原型 |

兩份 HTML 直接用瀏覽器開啟即可，無外部相依。

### 裁決摘要與回寫落點

| 裁決 | 內容 | 已回寫到 |
| --- | --- | --- |
| 帳號 | P0 不做登入，改以 PWA 安裝＋本機資料管理＋誠實告知 | Screen Inventory S-14、Release Manifest §8 |
| Q&A | 只做 App 內，不做 SEO／GEO；`/help` 加總覽層 | Screen Inventory S-15、Copy Deck §18、Release Manifest §5.12 |
| 設定步驟 | 三步併兩步，S-06 廢除併入 S-05 | Screen Inventory S-05／S-06、Release Manifest §5.2、TDD §7.4 |
| 產品頁 | 改為防曬裝備清單，四品類＋四個新欄位 | Screen Inventory S-11～13、Release Manifest §5.3、TDD §12.2、Rule Table §7 |
| S-04 揭露層次 | 收合預設、0 個常駐單選鈕、兩選項＋追問 | Screen Inventory S-04、Copy Deck CP-SETUP-007a／008a |
| S-05 固定操作列 | 底部固定、警示前置、CTA 明示不建立倒數 | Screen Inventory S-05、Copy Deck CP-SETUP-015a／015b |

### 尚未裁決

1. **本機匯出是否進 P0**——「不想註冊」的使用者目前沒有備份手段。
2. **S-07 四個次要 CTA 的目的地**——`查看已保存紀錄`、`查看處理說明`、
   `更新防護紀錄`、`更新防護方式` 仍無對應畫面，見 `P0_SCREEN_INVENTORY.md` S-07。

這兩項未寫入交付清單，不得因為原型裡畫了就當作已決定。
