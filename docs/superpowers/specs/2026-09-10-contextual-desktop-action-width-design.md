# Contextual Desktop Action Width Design

## Goal

修正桌面版主流程按鈕被 `--control-max` 截斷後留下大片空白的問題；按鈕的寬度與對齊必須由所在容器的工作語意決定，而不是用共用規則把所有按鈕置中或拉滿。

## Decisions

- 保留 `apps/web/src/assets/app.css` 的共用 `.button { max-width: var(--control-max); }`。它仍是緊湊控制項與非主操作的預設，不負責決定版面對齊。
- 不新增「所有桌面按鈕置中」或「所有按鈕滿寬」的全域規則。
- 文字連結型按鈕維持各容器的既有語意；例如 `.submit-actions__cancel` 的置中、地區頁備援連結的靠左與重新定位連結的置中均不改變。
- 不調整色彩、字級、44px 觸控目標、`.button-group` 的並排行為，也不改變任何路由、事件或資料流。

## Layout Contracts

### 1. 主流程欄位動作

下列容器的主要按鈕是目前工作流程的唯一提交／前進動作，桌面與手機都應填滿其可用欄寬：`width: 100%; max-width: none;`。

- `.submit-actions .button`：補擦、回報與事件修正頁的主要送出動作。取消按鈕仍是 `.submit-actions__cancel` 文字連結，維持它自己的置中規則。
- `.setup-shell__actions > .button`：`/setup` 的「開始防曬提醒」。容器仍保留 `flex-wrap` 與既有間距；此規則只影響由具名 actions slot 放入的主按鈕。
- `.location-prompt__cta`：首頁「尚未設定地區」卡片的唯一下一步。它是主流程入口，填滿提示卡的可用寬度，而不是在內容欄左側留下 416px 寬的孤島。

這些規則是局部容器契約，不依賴桌面媒體查詢：小螢幕原本已是單欄，規則只消除大螢幕的通用上限截斷。

### 2. 表單卡片控制項

`.form-control-stack` 是「欄位與其主要動作共同填滿表單欄」的既有契約：文字輸入、選單、文字區與 `.button--primary` 都使用 `width: 100%; max-width: none;`。

將此 class 僅加入真正的地區表單／選擇卡：

- `RegionLocationPanel`：定位與確認候選地區的主要按鈕填滿定位卡。
- `RegionManualSelector`：縣市、鄉鎮選單與「儲存這個地區」對齊為同一欄寬。

`/settings/data` 不是單一表單欄：它包含匯出、具確認狀態的清除、同步預覽與 `.button-row` 並排確認／取消。為避免將危險操作及並排次要操作誤拉滿，本次不把整頁或每張資料卡套入 `.form-control-stack`。該頁既有 `.clear-row`、`.sync-block`、`.button-row` 的容器語意維持不變。

### 3. 次要操作

其他非主操作保持原容器決定的寬度與對齊，包括設定頁同步按鈕、清除動作、產品空狀態動作、返回圖示、文字連結與 `.button-group`。這避免在卡片的左側閱讀軸中放入無理由置中的按鈕。

## File Boundaries

- `apps/web/src/assets/app.css`：補上 `.submit-actions .button` 的解除上限規則；不更改 `.button` 本身。
- `apps/web/src/components/setup/SetupStepShell.vue`：以 scoped `.setup-shell__actions > .button` 定義 setup 行動區的欄寬契約。
- `apps/web/src/components/home/HomeLocationPrompt.vue`：以自身 `.location-prompt__cta` 定義唯一入口的滿寬行為。
- `apps/web/src/components/region/RegionLocationPanel.vue`、`apps/web/src/components/region/RegionManualSelector.vue`：在正確的卡片根節點 opt in `form-control-stack`；不改事件、驗證或儲存流程。
- `apps/web/src/assets/desktopFormLayout.test.ts`：擴充來源守門，確認地區元件 opt in、共用表單契約仍完整，以及共用 `.button` 上限未被移除。
- 新增一個針對主流程容器寬度的 Vitest 來源守門測試：確認 submit、setup 與首頁地區入口各自有 `width: 100%`、`max-width: none`，並反向確認文字取消連結與通用 `.button` 沒有被當成滿寬規則處理。

## Verification

1. 先讓新增／擴充的 Vitest 守門測試在實作前失敗，再以最小 CSS／class 修改使其通過。
2. 執行聚焦測試與 `pnpm check`。
3. 在桌面寬度確認首頁無地區卡、`/setup`、補擦／回報／修正頁、地區定位與手動選擇的主要按鈕填滿內容欄或卡片欄。
4. 在手機寬度確認按鈕仍可點擊、觸控高度仍至少 44px，並確認 `.button-group`、資料設定的並排確認／取消與文字連結沒有被改成滿寬或強制置中。

## Out of Scope

- 不重新設計所有現有按鈕。
- 不變更 UV 地圖、推播、登入、同步或資料庫功能。
- 不修改遠端 `main` 的全臺 UV 分布更新；本分支在開始此設計時已基於 `a93d6a9`。
