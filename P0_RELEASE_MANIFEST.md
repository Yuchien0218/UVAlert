# 防曬晴報員 P0 Core Beta Release Manifest

| 文件資訊 | 內容 |
| --- | --- |
| 對應 PRD | `防曬晴報員PRD.md` v3.11 |
| Manifest 版本 | 0.3 |
| 狀態 | 開發範圍基準草案 |
| 適用里程碑 | P0 Core Beta（限定招募、不可公開索引） |
| 建立日期 | 2026-07-29 |
| 最近更新 | 2026-08-07 |

> 本文件只收斂 P0 的實際交付範圍，不取代 PRD。提醒規則、安全邊界、資料模型、文案審查及驗收條件仍以 PRD v3.11 為準。若兩份文件衝突，以 PRD 為準並修正本文件。

---

## 1. P0 交付目標

P0 必須交付一個可在手機瀏覽器實際操作、可選擇安裝為 PWA 的封閉式 Core Beta。使用者不需註冊或提供聯絡資料，即可：

1. 使用定位、手動地區或暫不提供地區進入產品。
2. 查看有來源、時間及資料狀態的 CWA UVI；無有效資料時不顯示假數值。
3. 記錄本次防護情境、追蹤部位、防護方式、產品標示及適用時的塗抹時間。
4. 建立逐部位的本機提醒狀態。
5. 回報游泳、離水、流汗、擦拭、摩擦、洗手及室內外切換。
6. 記錄全部或局部補擦，且只更新最後確認的部位。
7. 關閉頁面後再次開啟，依絕對時間戳恢復正確狀態。
8. 查看、更正及刪除目前裝置上的核心資料。

P0 的提醒只保證 App 開啟期間的前景狀態與重新開啟後的恢復，不保證關閉頁面後準時送達系統通知。

---

## 2. 發布形態與邊界

### 2.1 P0 發布形態

- 限定招募的 Core Beta。
- 手機版優先的響應式 Web App。
- 支援安裝為 PWA，但安裝不是使用條件。
- 預設訪客模式。
- 不公開索引個人操作頁、Session、產品或其他本機資料。
- P0.5 公開內容與 SEO 未完成，不阻擋限定 Core Beta。

### 2.2 P0 資料權威

- Guest 產品、Session、部位狀態、事件、草稿及時鐘校準資料以目前裝置的 IndexedDB 為權威。
- CWA 資料由後端代理、快取及標準化後提供。
- 精確座標只在本次選站期間使用，不保存於 URL、分析、後端資料庫或一般日誌。
- P0 不建立帳號端 Session、NotificationDestination、NotificationJob、NotificationBundle 或 NotificationDelivery。

---

## 3. P0 頁面與 Route 清單

實際 route 名稱可在技術設計階段調整，但不得刪除相應使用者任務。

| 編號 | 建議 route | 頁面／流程 | P0 主要任務 |
| --- | --- | --- | --- |
| P0-01 | `/` | 首頁 | 顯示 UVI 或無資料狀態；開始提醒，或直接執行 active Session 的最高優先操作 |
| P0-02 | `/region` | 地區與定位 | 使用目前位置、手動選地區、暫不提供地區 |
| P0-03 | `/setup/context` | 提醒設定：情境 | 選擇室內、戶外、運動或水上情境 |
| P0-04 | `/setup/timing` 內選用展開區 | 防護方式進階調整 | 自選部位、批次套用方法；不再是必經頁面 |
| P0-05 | `/setup/timing` | 提醒設定：快速提醒、時間與開始提醒 | 確認快速建議組合或展開進階調整；引用產品頁標示、輸入本次時間，並在固定操作列按 `開始提醒` 原子建立 Session |
| ~~P0-06~~ | ~~`/setup/review`~~ | ~~最終確認~~ | **2026-08-06 廢除**，內容併入 P0-05；設定流程改為兩步 |
| P0-07 | `/reminder` | 進行中提醒 | 顯示單一主要狀態、需處理部位、其他部位及事件 |
| P0-08 | `/reminder/reapply` | 記錄已補擦 | 預選建議部位，確認實際部位、產品與時間 |
| P0-09 | `/reminder/report` | 回報狀況 | 回報活動、事件、衣物狀態或產品安全事件 |
| P0-10 | `/reminder/event/:id/correct` | 最近事件更正 | 更正目前 Session 最近提交的事件 |
| P0-11 | `/products` | 我的防曬裝備 | 防曬裝備清單：sunscreen／clothing／eyewear／other_gear 四品類，含購買月份、到期日、備忘與過去用過。目前已有具穩定 ID、名稱與 snapshot 的本機 product catalog |
| P0-12 | `/products/new` | 新增防曬裝備 | 建立本機產品或裝備紀錄 |
| P0-13 | `/products/:id/edit` | 編輯防曬裝備 | 修改、封存、停止使用或刪除 |
| P0-14 | `/more` | 更多 | 說明、特殊狀況、安裝、顯示設定、隱私與資料管理 |
| P0-15 | `/help`；`/help/beach` | Q&A 總覽與海邊防曬 | 總覽列出已核准主題；`/help/beach` 顯示經核准的 `FAQ_BEACH_SUN_V1`。只做 App 內，不做公開索引 |
| P0-16 | `/help/how-it-works` | 運作與倒數說明 | 說明資料、提醒、PWA 與通知限制 |
| P0-17 | `/special-situation` | 特殊狀況 | 停止一般推論並顯示醫療拒答、轉介或急症分流 |
| P0-18 | `/settings/display` | 顯示設定 | 日間高對比、跟隨手機、夜間模式 |
| P0-19 | `/settings/data` | 本機資料管理 | 查看及清除本機產品、Session 與相關資料 |
| P0-20 | `/install` | 安裝到手機 | 依平台能力顯示 Android／iPhone 安裝方式 |

設定精靈與提交流程可以使用 modal、drawer 或巢狀 route，但瀏覽器返回、取消、草稿恢復及錯誤狀態必須符合 PRD。

---

## 4. P0 導覽與主要入口

手機版固定四個底部入口：

1. `首頁`
2. `提醒`
3. `產品`
4. `更多`

導覽列文字以實作為準（`BottomNavigation.vue`）。本文件先前寫成 `防曬品`，與畫面不一致。

規則：

- 無進行中 Session 時，首頁唯一主要 CTA 為 `開始防曬提醒`。
- 有進行中 Session 時，首頁主要 CTA 直接依 `primaryAction.actionKind` 顯示最高優先操作；完整部位、原因與事件由提醒頁承載。
- 提醒頁沒有進行中 Session 時留在原頁，顯示空白狀態及 `開始防曬提醒`。
- 不新增第五個 `UV知識庫` 導覽項目。
- 設定精靈可暫時隱藏底部導覽，但必須提供返回與取消。
- 底部導覽隱藏時（`hideNavigation: true`）允許使用固定底部操作列；
  有底部導覽的頁面不得比照。

---

## 5. P0 功能交付清單

### 5.1 地區與 UVI

- [x] 使用者主動點擊後才要求定位權限；頁面載入與 App Boot 不觸發定位。
- [x] 提供使用官方 NLSC 2025-03-18 行政區索引的手動縣市／地區選擇，離線可用。
- [x] 提供 `暫不提供地區`，以版本化 IndexedDB 偏好保存，且不阻擋提醒。
- [ ] 經後端取得 CWA `O-A0003-001` 有效 UVIndex。
- [ ] 無可用觀測時，使用明確標示的 `F-D0047-091` 區域預報。
- [ ] 顯示資料種類、測站／區域、資料時間、距離及 freshness。
- [ ] 支援 `fresh`、`stale`、`unusable` 與缺測狀態。
- [ ] UVI 不可用時不得顯示 0 或沿用不可用資料冒充目前值。
- [ ] UVI 分級使用 CWA 的低量級、中量級、高量級、過量級、危險級。
- [ ] UVI 只影響環境風險與裝備建議，不改變補擦期限。

### 5.2 提醒設定

- [ ] 提供 `沿用最近設定` 與 `快速開始`。
- [ ] 最近設定只重用情境、部位、方法與產品，不重用時間或期限。
- [ ] 快速開始採**兩個畫面**：情境 → 快速提醒／產品與時間／開始提醒；防護方式為第二畫面的選用展開區。（2026-08-06 裁決，原為三畫面）
- [ ] 進入快速提醒／時間畫面時，自動將一組可理解的情境建議部位寫入 SetupDraft 並顯示摘要。
- [ ] `自己選擇部位` 為次要入口。
- [ ] 自動套用不得建立 Application 或 Session；第二畫面仍須揭露完整部位摘要並由使用者按下 `開始提醒`。
- [ ] 部位摘要以單行呈現（`追蹤 N 個部位：⋯　調整`），不強迫捲過完整列表；符合 AC-34 的「已揭露」要求。
- [ ] 產品／標示警示排在版面最前，沒有警示時不佔版位。
- [ ] 主要操作固定於底部，內容捲動時不移動。
- [ ] 產品身分未確認時 CTA 顯示 `開始提醒（不建立倒數）`，明示不會建立產品期限。
- [ ] 使用 `BODY_ZONE_V3` 及版本化 preset／group mapping。
- [ ] 新 Session 的方法只接受已確認的合法組合。
- [ ] 主要方法為 `已擦防曬產品` 或 `被衣物完整遮住`。
- [ ] `其他外用產品` 放在次要入口。
- [ ] 防護方式展開區預設收合，收合狀態下**沒有任何常駐可見的單選鈕**；每個部位群組只顯示一行狀態文字。（2026-08-06 裁決，修正實作與 PRD §5.2 第 5 點 的層級落差）
- [ ] `衣物下方也有擦防曬產品` 只在選擇 `被衣物完整遮住` 後以選填追問出現，不得在第一層並列。
- [ ] 衣物覆蓋的狀態文字不得使用 untimed 語意色。
- [ ] 無法確認任何合法方法時允許返回／離開，不建立 Session。
- [ ] 只有實際外用產品部位才詢問塗抹時間。
- [ ] 全部衣物覆蓋時不要求或偽造塗抹時間。
- [ ] 提交前確認區顯示群組摘要；群組內有差異時展開原子部位。
- [ ] 使用 `StartSessionCommandV1` 原子建立 Session。
- [ ] 任何驗證或儲存失敗不得留下空 Session 或部分事件。

### 5.3 我的防曬裝備

2026-08-06 裁決：本頁由「提醒用產品主檔」擴為「防曬裝備清單」。

- [x] 本機 product catalog 保存穩定 productId、顯示名稱、目前 snapshot／fingerprint 與 active／stopped 狀態。
- [x] 既有「目前使用產品」snapshot 以中性名稱匯入 catalog，不捏造品牌或防曬宣稱。
- [ ] 支援四個品類：`sunscreen`、`clothing`、`eyewear`、`other_gear`。
- [ ] `sunscreen` 進 reducer；`clothing` 為 methodComponent（覆蓋期間不倒數）；`eyewear` 與 `other_gear` 為純紀錄，不影響提醒。
- [ ] UI 明示哪些欄位會影響倒數；記錄純紀錄類裝備不得讓使用者以為提醒行為改變。
- [ ] 新增 `purchaseMonth`（購買月份）、`expiryDate`（到期日）、`note`（備忘）、`archivedAt`（過去用過）。
- [ ] 除 `expiryDate` 外，上述新欄位皆不進 reducer。
- [ ] `expiryDate` 取代／補充既有 `expiryStatus`，並保留「過期產品不建立期限」行為與舊資料 migration 路徑。
- [ ] 已被 active Session 或既有事件引用的 `sunscreen` 不得改為純紀錄品類。
- [ ] 顯示 `目前使用` 與 `過去紀錄`。
- [ ] 新增、編輯、封存、停止使用及刪除產品。
- [x] 支援 `這次先不保存產品` 的 Session-only snapshot。
- [ ] 保存產品身分、SPF、PA、廣效文字、曝曬前等待、一般補擦標示及耐水標示。
- [ ] SPF、PA 與 broad-spectrum 分欄，不互相推定。
- [ ] 同一未修改產品不重問產品身分。
- [ ] 未知標示可提交，但採保守狀態。
- [ ] 無防曬／SPF 標示或身分未知的產品不得產生 120／40／80 分鐘期限。
- [ ] 過期、異常或使用後不適產品不得建立新期限。
- [ ] 私人備註只留本機，不進入分析、通知或 Session snapshot。

### 5.4 逐部位提醒

- [ ] 每個 zone instance 各自保存最後 Application、期限、狀態與原因。
- [ ] 首屏只顯示一個主要狀態元件。
- [ ] `primaryAction` 與 `sessionNextDueAt` 分開衍生。
- [ ] 只有可信、非空且可解釋的期限可顯示時間型提醒環。
- [ ] 已到期改用靜態到期卡，不顯示負數或閃爍 `00:00`。
- [ ] 無可信期限使用非時間型行動卡。
- [ ] 其他部位依 `需要處理`、`即將需要處理`、`其他狀態` 分組。
- [x] 局部補擦只更新最後確認的部位；不同部位可選不同產品／immutable snapshot。
- [x] 補擦以單一 IndexedDB transaction 原子寫入 confirmation group、ApplicationEvents、projection、Session revision、client sequence 與 receipt。
- [x] 提交後顯示部位與時間摘要，並保留更正所需 group ID；完整更正 transaction 尚未實作。
- [ ] 提醒頁提供最近事件清單：純文字，預設只顯示最新一筆，其餘收合可展開。（2026-08-07 裁決；PRD v3.11 已將「時間軸」放寬為清單）
- [ ] 每列可點擊進入 S-10 更正該筆事件——這是更正流程的**唯一入口**，缺了它 §5.11 的「更正本機資料」無法達成。
- [ ] 只顯示已發生事實，不得把推測狀態畫成事件。
- [ ] 時鐘不可信時仍顯示清單並標明時間可能不準，不隱藏。
- [ ] 所有時間文案明示這是檢查／補擦提醒，不是安全曝曬時間。

### 5.5 活動與事件

- [ ] 開始／結束戶外活動。
- [ ] 開始／結束水上活動。
- [ ] 大量流汗。
- [ ] 擦毛巾。
- [ ] 明顯摩擦。
- [ ] 洗手，預設只選目前外露的手背。
- [ ] 進入室內／返回戶外。
- [ ] 部位衣物覆蓋／重新外露。
- [ ] 使用產品後感到不適。
- [ ] 所有預選在提交前均可修改且必須確認。
- [ ] 事件保存有效發生時間與穩定排序資料。
- [ ] 只有嚴格晚於一般事件原因的合格 Application 才能解除原因。
- [ ] 事件更正追加不可變更正紀錄，不直接覆寫原事件。

### 5.6 水上活動

- [ ] `準備下水` 不建立耐水期限。
- [ ] `已在水中` 要求確認受影響部位。
- [ ] 可信入水起點搭配有效 40／80 分鐘標示時才建立水上期限。
- [ ] 入水起點未知時建立 `WATER_START_UNKNOWN` 無時間行動，不以提交時間製造倒數。
- [ ] 同一 Session 最多一個未關閉水上區間。
- [ ] `water_end` 必須與起點部位集合一致。
- [ ] 離水、擦拭或摩擦後顯示應處理狀態。
- [ ] 未確認重新塗抹前再次入水，不得取得新的 40／80 分鐘期限。

### 5.7 時間與狀態恢復

- [ ] 保存絕對時間戳，不以背景 interval 作真值。
- [ ] `/v1/time` 使用 nonce、UTC 時間及不可快取回應。
- [ ] 以 wall-clock 中點估算 offset，以 monotonic clock 測 RTT 及偵測跳變。
- [ ] 時鐘不可信時不得延長期限。
- [ ] `CLOCK_UNTRUSTED` 為 Session 層級最高優先狀態。
- [ ] 合法補擦、事件更正或期限重建後重設比較基準。
- [ ] 頁面回到前景或重新開啟時重新計算狀態。

### 5.8 PWA 與離線

- [ ] 可安裝的 manifest、圖示及 Service Worker。
- [ ] 快取 App Shell 與已核准的最低靜態說明內容。
- [ ] 離線可查看本機產品、Session、事件與最後氣象快照。
- [ ] 最後氣象快照明示時間與過期狀態。
- [ ] 離線不承諾最新 CWA、遠端通知或關閉頁面後準時提醒。
- [ ] IndexedDB 寫入、revision compare-and-swap 與 active-session key 使用同一 transaction。
- [ ] 多分頁／PWA context 使用 BroadcastChannel 或等效機制同步重讀。
- [ ] 儲存失敗時顯示未保存，不能先顯示成功。
- [ ] SetupDraft 只留本機、24 小時到期，不保存未確認塗抹時間或精確座標。

### 5.9 前景提示

- [ ] 固定提供視覺狀態。
- [ ] 短提示音及震動預設關閉。
- [ ] 使用者明確啟用後才執行 feature detection 與裝置測試。
- [ ] 不支援、被阻擋或裝置不允許時安靜降級。
- [ ] 不提供自訂鈴聲、循環播放、持續震動或保證發聲。
- [ ] P0 不要求瀏覽器系統通知權限。

### 5.10 特殊狀況與產品安全

- [ ] 提供一次性特殊狀況入口。
- [ ] 不蒐集疾病名稱、病理、處方、照片、病史或症狀自由文字。
- [ ] 個別醫療問題停止一般推論，改為依醫囑／詢問醫師。
- [ ] 急症 red flag 優先顯示經審查的 119／緊急就醫指引。
- [ ] 產品異常／不適只保存必要的粗粒度安全狀態。
- [ ] 回報後停止同產品期限及相關待處理提示，不診斷原因。
- [ ] 離線 App Shell 包含最低必要急症分流文字。

### 5.11 本機資料與隱私

- [ ] 定位前提供分層告知與替代流程。
- [ ] Guest 不要求 Email、電話、姓名、生日、性別或支付資料。
- [ ] 提供查看、更正及清除本機資料入口。
- [ ] 提供本機匯出：使用者主動觸發，匯出產品、Session、事件與偏好為單一版本化檔案。（2026-08-07 裁決納入 P0）
- [ ] 匯出不上傳、不經後端、不進分析；不含金鑰、精確座標或裝置識別碼。
- [ ] 清除前提示可先匯出；匯出失敗不得阻擋清除，也不得顯示為成功。
- [ ] 匯入不在 P0 範圍；不得把匯出描述為雲端備份或跨裝置同步。
- [ ] 清除前顯示影響範圍並要求確認。
- [ ] 不在 LocalStorage 保存 access token、健康資料、精確位置或長效憑證。
- [ ] 分析不接收實際部位、產品、提醒時間線、自訂文字或搜尋原文。
- [ ] 分析 flowId 為單一流程、24 小時到期且不可跨裝置連結。

### 5.12 最低內容

- [ ] 經核准的產品用途與限制。
- [ ] 經核准的 UVI 分級與一般防護文案。
- [ ] `FAQ_BEACH_SUN_V1`。
- [ ] `/help` Q&A 總覽，只列出已通過審查且可發布的主題；未核准主題不佔位。
- [ ] 每則 Q&A 具備 Copy Deck 審查狀態（`CONTENT_REVIEW`／`MEDICAL_REVIEW`／`MARINE_REVIEW`）。
- [ ] Android／iPhone 安裝方式。
- [ ] 產品運作原理。
- [ ] 倒數／期限運作原理。
- [ ] 特殊狀況拒答、轉介及急症分流文字。
- [ ] 隱私告知、本機資料保存與刪除說明。
- [ ] 每項健康／科學文案具有 Claim Registry、審查日期及發布狀態。
- [ ] 每個啟用中的期限規則具有 ReminderRuleEvidenceLink。

---

## 6. P0 後端交付範圍

P0 不需要帳號後端，但以下公共後端能力仍為必做：

| 能力 | P0 要求 |
| --- | --- |
| `GET /v1/time` | 回傳可信 UTC 時間、echo nonce；禁止 CDN、Service Worker 及瀏覽器快取 |
| `GET /v1/regions` | 回傳可手動選擇的 CWA 行政區 |
| `POST /v1/uv/lookup` | 使用暫存座標完成本次行政區與測站選擇；不得記錄座標 |
| `GET /v1/uv/current?regionCode=` | 依手動地區回傳代表觀測或區域預報 |
| CWA adapter | 保管 CWA key、抓取、快取、缺值處理、freshness 與 fallback |
| RegionUvMapping | 版本化行政區、代表站與預報區域映射 |
| 公共錯誤處理 | 不洩漏金鑰、堆疊、座標或內部資訊 |
| 健康檢查與監控 | CWA 成功率、資料過期率、fallback 及 API 錯誤率 |

P0 Session、產品、事件及提醒 reducer 在瀏覽器本機執行，但命令 schema、驗證器與測試向量須設計為未來可與 P1 後端共用。

---

## 7. P0 本機資料集合

P0 IndexedDB 至少包含：

- `SunscreenProducts`
- `ProtectionSessions`
- `ProtectionZoneStates`
- `SessionStartedEvents`
- `ZoneTrackingEvents`
- `ZoneMethodEvents`
- `ApplicationConfirmationGroups`
- `ApplicationEvents`
- `ProductSafetyEvents`
- `ContextEvents`
- `SessionEndedEvents`
- `WeatherSnapshots`
- `ClockCalibration`
- `SetupDrafts`
- `ConsentRecords`
- `LocalReminderPresentationPreferences`

P1 專用的 User、Identity、Notification、OfflineOperations 伺服器資料表不在 P0 建置範圍。

---

## 8. 明確不納入 P0

以下項目不得因資料模型已有描述而被誤排入 P0：

- 帳號註冊、登入及密碼流程。
  （2026-08-06 重新確認。使用者問卷顯示「不想註冊直接使用」與
  「想註冊保留產品資訊」兩種需求並存。P0 以 PWA 安裝＋本機資料管理＋誠實告知
  回應後者，不把 P1 帳號體系提前。S-14 的帳號項目只做說明，不建立假入口，
  且不得暗示 P0 能跨裝置同步。）
- Google／LINE OAuth。
- Guest 資料上傳與帳號合併。
- 跨裝置同步。
- 帳號歷史及帳號資料匯出。（**注意**：P0 提供的是不需帳號的本機匯出，見 §5.11；此處排除的是帳號端的歷史與匯出。）
- 本機資料**匯入**與還原。P0 只保證匯出檔案版本化且可讀，恢復能力留待 P1 與帳號遷移政策一併設計。
- Web Push、LINE、Email 遠端通知。
- NotificationJob／Bundle／Destination／Delivery 後端排程。
- Quiet hours 與多裝置通知。
- AI 防曬標籤辨識。
- 相機權限與圖片上傳。
- 前景感測／自動交通工具辨識。
- 背景持續定位或 geofencing。
- Siri、Google App Actions、Widget、Live Activities。
- PWA 圖示逐分鐘倒數。
- 兒童模式、家庭模式、隊友模式。
- `general_unlocalized` 整體提醒模式。
- P1 人體部位圖與自訂常用組合。
- 完整內容治理後台。
- P0.5 完整 UV知識庫。
- 公開 SEO／AEO、公開文章、sitemap 與內容索引。
  （2026-08-06 重新確認。Q&A 只做 App 內；SPA 要做 SEO 需加 SSG／預渲染，
  屬架構層級變更，留待 P0.5 另立 ADR。`/help` 總覽是 App 內導覽，不是公開索引。）
- 廣告、業配、聯盟連結、產品排名或購買推薦。
- 公開社群分享、遊戲化及排名。

---

## 9. P0 必須支援的核心狀態

每個狀態都需要正常、loading、empty、error、offline 及必要的儲存失敗呈現。

| 領域 | 必須支援的狀態 |
| --- | --- |
| 地區 | 未詢問、定位中、允許、拒絕、不支援、手動地區、暫不提供 |
| UVI | fresh observation、stale observation、valid forecast、unusable、missing、offline snapshot |
| Session | 無 Session、DRAFT、TRACKING、ATTENTION_REQUIRED、ENDED |
| 部位方法 | sunscreen、clothing、sunscreen＋clothing、other topical、舊資料 unknown／none／unrecorded |
| 提醒 | LABEL_WAIT、TRACKING、REAPPLY_SOON、REAPPLY_DUE、untimed action、not applicable |
| 時鐘 | trusted、expired、CLOCK_UNTRUSTED、離線保守狀態 |
| 水上 | preparing、active confirmed、active unknown start、ended |
| 產品 | confirmed sunscreen、not sunscreen、identity unknown、expired、abnormal、discomfort、archived |
| 儲存 | saved、pending transaction、transaction failed、quota unavailable、data cleared |
| 網路 | online、offline、CWA failure、time API failure |

---

## 10. P0 驗收範圍

### 10.1 必須通過

- PRD 中所有標示為 `P0` 的 AC。
- 標示為 `P0／P1` 的 AC 中，本機 Guest 路徑。
- PRD 第 20.1 節 P0 Core Beta 門檻。

### 10.2 不阻擋 P0

- 只標示 `P0.5`、`P1` 或 `P2` 的 AC。
- P1 通知與帳號後端。
- P0.5 公開內容與搜尋索引。
- P2 AI 或感測能力。

### 10.3 固定測試群組

至少建立下列自動化或固定輸入測試：

1. UVI 0、2、3、5、6、7、8、10、11 與缺值。
2. CWA fresh、stale、unusable 與預報 fallback。
3. 無地區仍可建立提醒。
4. 全部衣物覆蓋且沒有 Application。
5. 一般 120 分鐘與較短產品標示。
6. 不合格產品沒有期限。
7. 局部補擦不更新其他部位。
8. 洗手只影響手背。
9. 水上 40／80 分鐘、未知入水時間、離水及再次入水。
10. 一般事件原因只能由嚴格較晚的合格 Application 解除。
11. 移除／重新加入方法不得復活舊 Application。
12. 衣物覆蓋期間原因暫不適用，重新外露後正確恢復。
13. 產品過期、異常及使用後不適。
14. Session 原子建立、重送冪等及部分失敗回滾。
15. Session 結束後舊操作不能重開。
16. 時鐘向前／向後跳、nonce 不符、快取時間回應及 RTT 超標。
17. IndexedDB transaction 失敗與多 context 競爭。
18. 無可信期限時不製造倒數。
19. 自訂部位文字不進分析、通知或一般日誌。
20. 360、390、430 CSS px 與鍵盤、返回、離線、權限拒絕。

---

## 11. Definition of Done

一項 P0 功能只有同時符合以下條件才算完成：

1. 功能行為符合 PRD 與本 Manifest。
2. 正常、錯誤、離線、權限拒絕及儲存失敗狀態已處理。
3. 不依賴帳號、遠端通知、AI 或其他 P1／P2 能力。
4. 文案沒有安全曝曬、保證送達或防護充分暗示。
5. 相關 P0 AC 有可重現測試證據。
6. 鍵盤、觸控、螢幕閱讀器、文字放大與對比完成驗證。
7. 360、390、430 CSS px 無橫向捲動或被遮住的必要控制項。
8. 分析與日誌不包含精確位置、實際部位、產品、健康內容、搜尋原文或提醒時間線。
9. 需要健康、海洋環境、法務或法規審查的內容已核准；未核准內容由發布 gate 阻擋。
10. 相關技術文件、測試向量與變更紀錄已更新。

---

## 12. 後續文件

完成本 Manifest 後，仍需依序產出：

1. P0 Screen Inventory 與畫面狀態矩陣。
2. Reminder Rule Decision Table 與固定測試向量。
3. P0 Copy Deck 與內容審查清單。
4. CWA RegionUvMapping 初始資料及串接驗證紀錄。
5. Technical Design Document。
6. 需求－AC－測試追蹤矩陣。
7. Core Beta 測試、監控、回滾及 Go／No-Go 計畫。
