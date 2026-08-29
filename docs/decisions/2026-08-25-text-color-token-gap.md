# 文字顏色語意 token 補齊

**日期**：2026-08-25（Asia/Taipei），第二輪同日更新
**狀態**：已完成（第一輪：token 補齊；第二輪：35 處 `--text-secondary`→`--text-body` 重新分類）。**2026-08-26：`--text-tertiary` 與 `--color-muted-soft` 已移除**，文字色階定為 4 級（audit 清單 D4，見下方第二輪末的裁決註記）。
**裁決**：補上 `--text-emphasis`／`--text-body`／`--text-tertiary` 三個語意別名，對齊 `DESIGN.md` 第二節「文字」的 5 級色階；修掉 2 處誤導性的 CSS fallback；第二輪把 35 處「標題／卡片下方導言、通知與警示框內文」從 `--text-secondary` 升級為 `--text-body`。
**影響範圍**：第一輪視覺零變化。**第二輪有實際可見變化**——35 個檔案裡的說明段落文字從 `muted`（#6F5A54）變深成 `body`（#5A4540），對比度從 5.93:1 提升到 8.2:1，兩者都通過 WCAG AA，方向是變深不是變淺。

## 背景

跟 [[2026-08-25-typography-token-consolidation.md]]（字級收斂）同一次盤點裡發現的姊妹問題，形狀一模一樣：`DESIGN.md` 定義了 5 級文字色階（`ink` → `body-strong` → `body` → `muted` → `muted-soft`，見文件第二節「文字」表格），但 `styles.css` 的語意別名只做出兩級——`--text-primary`（→ ink）與 `--text-secondary`（→ muted）。中間三級只有原始色票（`--color-body-strong`／`--color-body`／`--color-muted-soft`），沒有語意名稱。

實測結果：

- `--color-body`（文件定義「預設內文」）：**全 repo 零筆使用**，只有定義沒人套用。
- `--color-muted-soft`（文件定義「說明文字、頁尾細則」）：**全 repo 零筆使用**。
- `--color-body-strong`（文件定義「強調段落與導言」）：只有 4 處，且其中 2 處（`HomeLocationPrompt.vue`、`HomeNightNotice.vue`）寫成 `var(--color-body-strong, var(--text-primary))`——這個 fallback 語法沒有意義，因為 `--color-body-strong` 在 `styles.css` 全域一定有定義，永遠不會退回 `--text-primary`（而且兩者色值不同，#46342F 對 #2E2925，寫成 fallback 容易讓人誤會兩者可互換）。

沒有硬寫死的 hex／rgb 文字顏色——這部分是乾淨的；問題純粹是**語意詞彙不夠**，逼得元件只能在「primary」跟「secondary」兩個選項裡硬選一個，該用「導言」或「預設內文」或「頁尾細則」語氣的地方沒有對應名稱可用。

## 套用的變更

| 位置                                                 | 變更前                                                      | 變更後                                                                                                                                                  |
| ---------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `styles.css`                                         | 只有 `--text-primary`／`--text-secondary`／`--text-inverse` | 新增 `--text-emphasis`（→`--color-body-strong`）、`--text-body`（→`--color-body`）、`--text-tertiary`（→`--color-muted-soft`），對齊 DESIGN.md 用途描述 |
| `HomeLocationPrompt.vue` `.location-prompt__message` | `var(--color-body-strong, var(--text-primary))`             | `var(--text-emphasis)`                                                                                                                                  |
| `HomeNightNotice.vue` `.night-notice__body`          | `var(--color-body-strong, var(--text-primary))`             | `var(--text-emphasis)`                                                                                                                                  |

兩處文案都是空狀態卡片裡「先說明狀況」的單句導言（`HomeLocationPrompt`：「尚未設定地區，所以沒有 UV 資料。」；`HomeNightNotice`：「現在不需要防曬，明早出門前再開始提醒。」），符合 `body-strong` 文件定義的「強調段落與導言」角色，改用新別名純粹是去掉誤導性 fallback，不改變顏色。

## 刻意不動的部分（第一輪）

- `.button--primary[aria-disabled="true"]`（app.css）與 `.bottom-nav__item`（`BottomNavigation.vue`）也直接用 `--color-body-strong`，但角色是「按鈕停用態文字」「底部導覽標籤」，不是段落導言——這是同一個顏色值被拿去做另一種「比 muted 深、比 ink 輕」的 UI 語意用途，兩處都已經是單一、一致的寫法（沒有重複或 fallback 問題），這次不強行套上 `--text-emphasis` 這個語意上對不上的名字，維持直接引用原始色票。

## 第二輪：`--text-secondary` 重新分類（同日）

使用者接著問「哪些 secondary 該升級成 body／哪些該降級成 tertiary」，逐一核對全部 108 處 `--text-secondary` 用法的選取器命名與模板內容（page-heading／flow-heading 導言、卡片內解釋段落、通知與警示框內文、`__helper`／`__note`／`__reason` 說明文字等），依角色分兩桶。

**升級成 `--text-body`（35 處，已套用）**：凡是「標題或卡片標題正下方、使用者進畫面第一句要讀的說明句」，或「`role="alert"`／`role="status"` 通知框、警示框（`.caution`、`.danger-zone`、`.load-error`、`.eligibility-notice`、`.identity-warning`、`.claim-consequence`、`.clock-warning`、`.notice--ok` 等）裡的內文」，一律從 `--text-secondary` 換成 `--text-body`。完整檔案清單：`app.css`（`.page-heading__body`）、`ProductsPage.vue`、`DataSettingsPage.vue`（2 處）、`EventCorrectionPage.vue`（2 處）、`ReapplyPage.vue`、`ReportContextEventPage.vue`、`SetupPage.vue`（2 處）、`SetupStepShell.vue`、`ZoneProtectionForm.vue`（`.preset-card__body`，與 `.preset-card__note` 拆開）、`AccountDataPage.vue`（2 處）、`SyncSettingsPage.vue`（2 處）、`FeedbackPage.vue`、`EducationArticlePage.vue`、`ContentUnderReview.vue`（主段落，`__meta`／`__note` 拆開維持 secondary）、`ProductEligibilityNotice.vue`、`ProductSnapshotEditor.vue`（2 處）、`RecentEventsList.vue`、`RegionLocationPanel.vue`（`.location-panel__body`，與 `.location-panel__candidate p` 拆開）、`RegionManualSelector.vue`、`SessionEndControl.vue`、`SunscreenClaimQuickQuestion.vue`、`InstallPage.vue`（3 處）、`ProductDetailPage.vue`、`RegionPage.vue`、`HelpIndexPage.vue`、`GearFormPage.vue`、`NotificationSettingsPage.vue`。

**降級成 `--text-tertiary`：找到候選但沒有套用——重要發現**。`__helper`／`__note`／`__reason`／`review-note`／`uv-forecast__source` 這類「補充說明、頁尾細則」命名的文字（約 25 處候選）語意上完全符合 `--text-tertiary` 該有的角色，但實測色值後發現：

> `--color-muted-soft`（`--text-tertiary` 指向的色票）對暖象牙底色 `--color-canvas` 算出來的對比度只有 **4.42:1**，低於 WCAG AA 一般文字要求的 **4.5:1**。DESIGN.md 定義這個 token 的候選用途（說明文字、頁尾細則）全部是一般字級（12–16px），沒有一處大到能套用「大字級 3:1」那個例外。

也就是說 **`DESIGN.md` 這個文字色階裡的第 5 級，色值本身就不能直接用在真正的文字上**——這解釋了為什麼它先前全 repo零筆使用。所有「降級」候選維持 `--text-secondary`（5.93:1，通過 AA）。

> **2026-08-26 裁決（audit 清單 D4）：砍掉第 5 級，不調色票。** 使用者確認：要過 4.5:1 只能壓線，要有安全 margin 就得調到很接近 `--color-muted`（5.93:1），第 5 級失去意義；對健康 App，「多一個踩 AA 邊界的顏色」的代價大於「頁尾細則稍微淡一點」。已移除 `styles.css` 的 `--text-tertiary` 與 `--color-muted-soft`，`DESIGN.md` 第二節文字色階改成 4 級（ink / body-strong / body / muted），並註明「刻意不設更淺的文字色」。上面這 ~25 處「降級候選」**確定維持 `--text-secondary`**，不再是待辦。

## 驗證

`pnpm check`（typecheck + 78 個測試檔、466 筆測試）全數通過。第二輪的 35 處改動是實際可見的顏色加深（見上方對比度數字，方向上更安全不是更冒險），~~但**沒有經過瀏覽器視覺驗證**~~——**2026-08-29 已補驗，見下節。**

## 2026-08-29 視覺驗證結果：通過

抽查 `/products`、`/setup`、`/settings/data` 與衛教文章頁，加深後的內文（`--color-body` #5A4540）在暖象牙底與兩種卡片底色上都讀得清楚。

**當初只算過對 canvas 的對比度，沒人算過對卡片底色的。** 這次補算：

| 前景 → 背景 | 對比度 |
| --- | --- |
| `body` → `canvas` | 8.19:1 |
| `body` → `surface-soft` | 7.69:1 |
| `body` → `surface-card` | 6.99:1 |
| `muted` → `canvas` | 5.92:1 |
| `muted` → `surface-soft` | 5.56:1 |
| `muted` → `surface-card` | **5.05:1** |

最差的一組是 `muted` 疊在 `surface-card` 上的 5.05:1，仍然通過 WCAG AA 的 4.5:1。**沒有意外問題。**

（順帶一提：這也再次確認了砍掉第 5 級文字色是對的——`muted-soft` 對 canvas 就只有 4.42:1，疊在卡片上會更低，一定過不了。）
