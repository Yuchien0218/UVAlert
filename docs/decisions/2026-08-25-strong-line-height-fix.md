# strong 標題行的行高修正

**日期**：2026-08-25（Asia/Taipei）
**狀態**：已完成
**用途**：接續今天的行高收斂（見 [[2026-08-25-line-height-consolidation.md]]），修正 `body` 行高改成 1.75 後，一批單獨成行的 `<strong>` 標題文字被連帶拉出過多留白。

## 問題

全站有個重複出現的樣式：一個小圖示旁邊配一個 `<div>`，裡面是 `<strong>標題句</strong>` 接著 `<p>說明句</p>`（警示框、通知框），或是清單卡片裡 `<strong>標題</strong>` 接著 `<small>`／`<p>` 說明（裝備、衛教、更多頁的清單項目）。這些 `<strong>` 沒有自己的 `line-height`，多數也沒有 `display: block`，但因為緊接著的是區塊元素，實際上還是自成一行——行高全部繼承自 `body`。

`body` 行高今天稍早從 1.7 調到 1.75 後，這批單行的粗體標題文字上下留白變得比視覺上該有的還多，讀起來像標題跟底下說明句之間卡了一層看不出理由的空隙。這正是這批 `<strong>` 元素，不是內文段落本身的問題——內文段落用 1.75 沒有問題，行高要撐住多行文字的可讀性；但只有一行的粗體標題不需要那個呼吸空間。

## 套用的變更

統一改成 `line-height: 1.4`（一般粗體標題），或 `1.45`（明確用 `--font-size-title-sm` 的卡片標題，對齊 DESIGN.md「卡片標題 18–22px → 1.45」）：

| 檔案 | 選擇器 |
|---|---|
| `ProductEligibilityNotice.vue` | `.eligibility-notice strong` |
| `SunscreenClaimQuickQuestion.vue` | `.claim-consequence strong` |
| `FiveDayUvCard.vue` | `.uv-forecast__state strong, .uv-forecast__meta strong` |
| `GearForm.vue` | `.no-effect-note strong`（原本沒有 `display: block`，一併補上） |
| `ProductSnapshotEditor.vue` | `.identity-warning strong`（原本完全沒有這條規則，新增） |
| `MorePage.vue` | `.entry strong` |
| `HelpIndexPage.vue` | `.topic-item strong` |
| `ContextSelector.vue` | `.context-choice strong, .context-group strong` |
| `ZoneProtectionForm.vue` | `.zone-group-choice strong` |
| `DataSettingsPage.vue` | `.clear-row div > strong`（原本沒有這條規則，新增） |
| `AccountDataPage.vue` | `.confirm-note strong`（原本沒有這條規則，新增） |
| `EducationCategoryPage.vue` | `.education-article-card strong`（1.45，卡片標題） |
| `EducationIndexPage.vue` | `.education-category-card strong`（1.45，卡片標題） |

## 刻意不動的部分

- 段落內文字流中的 `strong`（例如 `DataSettingsPage.vue` 的 `.caution strong`：「匯出檔案<strong>不包含</strong>裝置識別碼…」）——這是嵌在連續句子裡的強調，跟周圍文字同一行流動，行高本來就該跟段落一致，沒有問題。
- `SyncSettingsPage.vue` 的 `.sync-list strong`——`<li>` 是 `display: flex; justify-content: space-between`，`strong` 跟旁邊的 `span` 是同一行的左右兩端，不是獨立成行的標題，不受這個問題影響。
- 衛教文章內文（`.education-article-body :deep(strong)`）——markdown 轉出來的內文強調，跟 `.caution strong` 一樣是段落內文字流，不受影響。

## 驗證

`pnpm check`（typecheck + 78 個測試檔、466 筆測試）全數通過。**未經瀏覽器視覺驗證**，理由同今天其他幾份文件——本機沒有可用的 preview 工具。
