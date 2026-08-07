# 防曬晴報員 P0 Requirement Traceability Matrix

| 文件資訊 | 內容 |
| --- | --- |
| 對應 PRD | `防曬晴報員PRD.md` v3.9 |
| Release Manifest | `P0_RELEASE_MANIFEST.md` v0.3 |
| Screen Inventory | `P0_SCREEN_INVENTORY.md` v0.5 |
| Reminder Rules | `P0_REMINDER_RULE_DECISION_TABLE.md` v0.3 |
| Copy Deck | `P0_COPY_DECK.md` v0.5 |
| Technical Design | `P0_TECHNICAL_DESIGN_DOCUMENT.md` v0.8 |
| 文件版本 | 0.8 |
| 狀態 | P0 規格追蹤基準；已回填 contracts／reducer／IndexedDB foundation、SetupDraft 與 Phase 3 Web Shell／local Setup slice 證據 |
| 建立日期 | 2026-07-29 |
| 最近更新 | 2026-08-07 |

> 本文件追蹤「需求 → 畫面 → 規則 → 文案 → 驗收條件 → 測試／審查證據」。工作區目前已有 contracts、純 reducer、IndexedDB foundation／SetupDraft，以及 Vue Web Shell、首頁、S-03～S-05 local Setup 與 Reminder read-only slice；只有第 8.0 節列出的範圍具有工程證據。Recent／saved-product Setup 分支、可信時間 API、其餘 mutation 流程、PWA、正式 UI E2E、A11Y、Device、內容審查及完整發布驗收仍不得視為已完成。

---

## 1. 追蹤狀態

| 狀態 | 意義 |
| --- | --- |
| `IDENTIFIED` | 已在 PRD 識別，但尚未完成下游規格 |
| `SPECIFIED` | 已有 Manifest、Screen、Rule、Copy 或 Technical Design 規格 |
| `IMPLEMENTED` | 已有可定位的程式碼，尚未完成所有驗證 |
| `VERIFIED` | 已有通過的自動化／手動測試證據 |
| `REVIEW_BLOCKED` | 等待醫療、法律、海洋環境、TFDA 或其他專業審查 |
| `RELEASE_READY` | 實作、測試、審查與發布 Gate 全部通過 |
| `OUT_OF_SCOPE` | 不屬 P0 Core Beta |

狀態只能依證據向前更新，不得因文件寫得完整就直接標為 `IMPLEMENTED` 或 `VERIFIED`。

---

## 2. 證據識別格式

| Prefix | 證據類型 |
| --- | --- |
| `UT-RULE-TV-xxx` | Reminder Decision Table 固定 reducer 測試向量 |
| `UT-VALIDATION-xxx` | Schema、命令與資料驗證單元測試 |
| `IT-CWA-xxx` | CWA adapter／region／freshness 整合測試 |
| `IT-TIME-xxx` | 可信時間 API 與 ClockCalibration 整合測試 |
| `IT-IDB-xxx` | IndexedDB transaction／恢復／多 context 測試 |
| `E2E-P0-xxx` | 手機版端到端流程 |
| `UX-P0-xxx` | 可用性原型／實機任務測試 |
| `A11Y-P0-xxx` | WCAG、螢幕閱讀器、對比與動態效果測試 |
| `SEC-P0-xxx` | 權限、輸入、CSP、日誌與資料邊界測試 |
| `CONTENT-P0-xxx` | Claim Registry、Copy、著作權與發布 Gate |
| `LEGAL-P0-xxx` | 個資、權利、保存、intended use 與法務核准 |
| `MED-P0-xxx` | 健康、產品安全、特殊狀況與急症審查 |
| `MARINE-P0-xxx` | 海洋環境與海邊 Q&A 審查 |
| `DEVICE-P0-xxx` | Android、iPhone、PWA、戶外可讀性與提示能力實測 |
| `TD-*` | Technical Design 的架構、模組、資料、API、PWA 與 Capacitor-ready 設計識別 |

測試實作後，每個 ID 應連到測試檔、測試管理系統、執行紀錄或核准文件，不能只保留名稱。

---

## 3. P0 範圍

### 3.1 P0 Core Beta 適用 AC

本次共有 78 項：

```text
AC-01, AC-02, AC-03, AC-04, AC-05, AC-06, AC-07, AC-09,
AC-12, AC-15, AC-16, AC-17, AC-18, AC-19, AC-20, AC-21,
AC-22, AC-23, AC-26, AC-28, AC-30, AC-31, AC-32, AC-33,
AC-34, AC-35, AC-36, AC-37, AC-38, AC-39, AC-40, AC-41,
AC-42, AC-43, AC-44, AC-45, AC-46, AC-47, AC-48, AC-49,
AC-50, AC-51, AC-52, AC-53, AC-54, AC-55, AC-56, AC-57,
AC-58, AC-59, AC-61, AC-63, AC-64, AC-65, AC-66, AC-67,
AC-68, AC-69, AC-70, AC-71, AC-74, AC-79, AC-80, AC-81,
AC-82, AC-83, AC-85, AC-86, AC-87, AC-88, AC-89, AC-90,
AC-94, AC-96, AC-97, AC-98, AC-99, AC-100
```

`P0／P1` AC 在本矩陣只驗收 P0 Guest 本機路徑；P1 帳號、同步與遠端通知路徑不在本次範圍。

### 3.2 純 P0.5，不阻擋 P0 Core Beta

| AC | 原因 |
| --- | --- |
| AC-60 | 完整 UV知識庫入口與分類 |
| AC-62 | P0.5 衛教卡與趣味內容 |
| AC-72 | 公開索引架構 |
| AC-73 | 公開文章 SEO 模板 |
| AC-75 | 公開結構化資料與 SEO |
| AC-76 | 公開 AEO 與核心任務 |
| AC-77 | P0.5 答案單元 |
| AC-78 | P0.5 AEO 變體限制 |

---

## 4. P0 功能需求追蹤

| Requirement | PRD 需求 | Screens | Rules／資料 | Copy | AC | Planned evidence | 目前狀態 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F-01 | 訪客優先首頁 | S-01、S-07 | Guest／IDB 邊界 | CP-HOME、CP-REMINDER-EMPTY | 01、19、22、32、55、57、90 | E2E-P0-001、SEC-P0-001 | SPECIFIED |
| F-02 | 定位、手動地區與略過 | S-01、S-02 | NLSC 7441 裝置內界線解析；RegionPreferenceV1；精確座標不保存或傳送 | CP-UVI-001、CP-REGION-* | 01、19、21、32、55、100 | BrowserGeolocation、TaiwanRegionResolver、region-flow integration、RegionPage tests | IMPLEMENTED／PARTIALLY_VERIFIED／LEGAL_REVIEW |
| F-03 | CWA 觀測資料 | S-01、S-02 | O-A0003-001、cache、freshness | CP-UVI-002～007 | 02、03、04、21、30 | IT-CWA-002～006 | SPECIFIED |
| F-04 | UV 風險卡 | S-01 | CWA boundary mapping；不影響期限 | CP-UVI-007～012 | 02、05、38、66、68、69 | IT-CWA-007、A11Y-P0-001 | SPECIFIED／REVIEW_BLOCKED |
| F-05 | 我的防曬品 | S-05、S-11～13 | ProductLabelSnapshotV1、eligibility | CP-PRODUCT-*、CP-SETUP-010～012 | 18、35、43、47、48、50、53、87、97 | UT-VALIDATION-001～004、E2E-P0-003 | IMPLEMENTED（session-only subset）／REVIEW_BLOCKED |
| F-06 | 塗抹紀錄與部位狀態 | S-04～08 | BODY_ZONE_V3、Application group、zone reducer | CP-SETUP-006～016、CP-REMINDER-* | 07、26、34、36、37、52、79、81、82、85、87、88、94 | UT-RULE-TV-001～040、E2E-P0-004 | IMPLEMENTED／PARTIALLY_VERIFIED |
| F-07 | 活動與事件 | S-07～10 | ContextEvent、correction chain | CP-EVENT-* | 06、28、37、39、41、44、45、51、83、85 | UT-RULE-TV-015～029、E2E-P0-005 | SPECIFIED |
| F-08 | 補擦提醒引擎 | S-07～09 | RR-P0-*、primaryAction | CP-REMINDER-*、CP-REAPPLY-* | 05、06、07、16、17、23、31、36、40、51、65、66、82、85～88、97、98 | UT-RULE-TV-001～040 | SPECIFIED／REVIEW_BLOCKED |
| F-09 | 前景計時與狀態恢復 | S-07 | ClockCalibration、absolute timestamps | CP-REMINDER-CLOCK-*、CP-TIME-API-001 | 09、23、40、67、89 | IT-TIME-001～006、IT-IDB-001 | SPECIFIED |
| F-10 | 權限與錯誤降級 | 全部核心頁 | feature detection、transaction result | CP-REGION-*、CP-STORAGE-*、CP-GENERIC-ERROR | 01、12、23、31、32、39、54、89 | E2E-P0-006、SEC-P0-003 | SPECIFIED |
| F-11 | 基本離線降級 | S-01、S-03～20 | App Shell、IDB、WeatherSnapshot | CP-OFFLINE-001、CP-UVI-013 | 09、12、23、40、89 | IT-IDB-002、E2E-P0-007、DEVICE-P0-001 | SPECIFIED |
| F-12 | 基本個資告知 | S-02、S-14、S-19 | ConsentRecord、data lifecycle | CP-REGION-001、CP-PRIVACY-*、CP-DATA-* | 20、22、55、74、90、94、100 | LEGAL-P0-001～004、SEC-P0-004 | SPECIFIED／REVIEW_BLOCKED |
| F-UX-01 | 低摩擦操作框架 | S-03～10 | preset metadata、自動套用至 SetupDraft、Bottom Sheet、batch partition | CP-SETUP-*、CP-REAPPLY-* | 33～45、50～52、57、59、64、65、79、81～83、88 | UX-P0-001～006、E2E-P0-008 | IMPLEMENTED（S-03～S-05 local subset）／PARTIALLY_VERIFIED |
| F-UX-03 | 戶外高對比顯示 | 全部頁面，重點 S-01、S-07、S-18 | Studio Mono Design Tokens、資訊藍 Tracking、presentation types | 所有狀態＋aria templates | 38、54、59、64～71 | UT-WEB-P0-002、A11Y-P0-001～007、DEVICE-P0-002 | IMPLEMENTED／PARTIALLY_VERIFIED |
| F-CONTENT-01 | 最低內容治理 | S-14～17 | Claim Registry、Evidence Link、publish gate | 全 Copy Deck review status | 15、49、56、61、63、98、99 | CONTENT-P0-001～004、MED-P0-001、LEGAL-P0-005 | SPECIFIED／REVIEW_BLOCKED |
| F-CONTENT-02 | 最低海邊 Q&A | S-05、S-09、S-15 | FAQ_BEACH_SUN_V1；不改 Session | CP-BEACH-* | 16、46～49、61、63 | MARINE-P0-001、MED-P0-002、CONTENT-P0-005 | SPECIFIED／REVIEW_BLOCKED |
| F-CONTENT-03 | 最低 PWA 與運行說明 | S-14、S-16、S-20 | App Shell、feature detection | CP-INSTALL-*、CP-HELP-*、CP-NOTIFICATION-LIMIT | 05、09、12、31、32、54、61、63、66 | DEVICE-P0-003、CONTENT-P0-006 | SPECIFIED |

---

## 5. 畫面追蹤

| Screen | 核心 Requirement | 主要 Rules／資料 | 主要 Copy family | 主要 AC | Planned evidence | 狀態 |
| --- | --- | --- | --- | --- | --- | --- |
| S-01 首頁 | F-01～04 | UVI freshness、active Session、`primaryAction.actionKind` | CP-HOME、CP-UVI | 01～05、19、21、32、36、57、64、65、81 | E2E-P0-001、IT-CWA-*、UT-WEB-HOME-REMINDER-001 | IMPLEMENTED／PARTIALLY_VERIFIED |
| S-02 地區與定位 | F-02、F-12 | function-local coordinate、NLSC 2025-03-18 Polygon／MultiPolygon、RegionPreferenceV1 | CP-REGION、CP-PRIVACY | 01、19、21、32、55、100 | RegionPage、resolver、geolocation、IndexedDB privacy tests；正式法律審查待完成 | IMPLEMENTED／PARTIALLY_VERIFIED／LEGAL_REVIEW |
| S-03 情境 | F-UX-01 | SetupDraft、initialContext | CP-SETUP-001～005 | 33、39、41、42、79 | E2E-P0-008、UX-P0-001 | IMPLEMENTED／PARTIALLY_VERIFIED |
| S-04 防護方式與部位（S-05 Bottom Sheet） | F-06、F-UX-01 | BODY_ZONE_V3、DT-METHOD、focus／scroll lock；收合預設、兩選項＋追問揭露層次 | CP-SETUP-006～009、007a、008a | 26、34、52、79、88、94 | UT-VALIDATION-001、UT-WEB-SETUP-001、UX-P0-002 | IMPLEMENTED／PARTIALLY_VERIFIED；**待修正揭露層次**（現況違反 PRD §5.2.5） |
| S-05 快速提醒、塗抹時間與開始提醒 | F-05、F-06、F-08 | preset 自動套用、S-11 current-product snapshot、`pendingTiming`、ClockCalibration、StartSessionCommandV1、固定操作列 | CP-SETUP-006、013～018 | 05、23、33～35、39～42、50、53、79、85、87、88、97 | UT-WEB-SETUP-001、IT-WEB-SETUP-001、UT-VALIDATION-002、UT-VALIDATION-003、E2E-P0-003、E2E-P0-009 | IMPLEMENTED（current-product subset）／PARTIALLY_VERIFIED／REVIEW_BLOCKED；**待改為兩步** |
| ~~S-06 最終確認~~ | — | — | — | — | — | **2026-08-06 廢除**，併入 S-05 |
| S-07 進行中提醒 | F-08、F-09 | primaryAction、zone／Session summary | CP-REMINDER-* | 05、07、09、12、23、31、36、38、40、51、57、64～67、81、82、85、86、96 | UT-RULE-TV-*、A11Y-P0-002 | SPECIFIED／REVIEW_BLOCKED |
| S-08 記錄已補擦 | F-06～08 | ApplicationConfirmationGroup | CP-REAPPLY-* | 07、28、37、39、40、45、65、82、85、87 | UT-RULE-TV-022、037～039 | SPECIFIED |
| S-09 回報狀況 | F-07、F-08 | ContextEvent、ProductSafetyEvent | CP-EVENT-*、CP-PRODUCT-SAFETY | 06、28、37、39、41、44、51、83、85、97 | UT-RULE-TV-015～029 | SPECIFIED／REVIEW_BLOCKED |
| S-10 更正最近事件 | F-07 | correction leaf、replace／void | CP-EVENT-CORRECT-* | 28、39、44、45、85 | UT-RULE-TV-039、IT-IDB-003 | SPECIFIED |
| S-11 防曬裝備 | F-05 | current-product snapshot；`gearCategory` 四品類、`purchaseMonth`／`expiryDate`／`note`／`archivedAt`；recent sorting 待實作 | CP-PRODUCT-*、CP-PRODUCT-CATEGORY-001～003、CP-PRODUCT-FIELDS-001 | 18、35、43、47、50、53、55、87、97 | Setup controller integration、E2E-P0-003 | IMPLEMENTED（single current-product subset）／PARTIALLY_VERIFIED；**待擴充品類** |
| S-12 新增防曬裝備 | F-05 | ProductLabelSnapshot source；品類選擇與條件式欄位 | CP-PRODUCT-NEW、NOTE、CATEGORY、FIELDS | 18、35、47、48、55 | UT-VALIDATION-004 | SPECIFIED／REVIEW_BLOCKED |
| S-13 編輯防曬品 | F-05 | immutable snapshots、safety restore rules | CP-PRODUCT-* | 43、50、53、87、97 | E2E-P0-010 | SPECIFIED／REVIEW_BLOCKED |
| S-14 更多 | F-CONTENT-01～03 | navigation scope | CP-BEACH、CP-HELP、CP-PRIVACY | 46、58、61、63、80 | UX-P0-003、CONTENT-P0-* | SPECIFIED／REVIEW_BLOCKED |
| S-15 Q&A 總覽與海邊防曬 | F-CONTENT-02 | FAQ state-neutrality；/help 總覽只列已核准主題 | CP-HELP-INDEX-001～002、CP-BEACH-* | 46～49、61、63 | MARINE-P0-001、MED-P0-002 | SPECIFIED／REVIEW_BLOCKED |
| S-16 運作與倒數說明 | F-CONTENT-03 | absolute timestamp semantics | CP-HELP-* | 05、09、12、31、61、63、66 | CONTENT-P0-006 | SPECIFIED／REVIEW_BLOCKED |
| S-17 特殊狀況 | F-CONTENT-01 | redFlagCodes、one-time no-store | CP-SPECIAL-* | 20、56、58、99 | MED-P0-003、LEGAL-P0-006 | REVIEW_BLOCKED |
| S-18 顯示設定 | F-UX-03 | display preference | 顯示設定＋狀態文案 | 38、67～71 | A11Y-P0-003～007、DEVICE-P0-002 | SPECIFIED |
| S-19 本機資料管理 | F-12 | lifecycle、active Session end | CP-DATA-* | 12、22、39、55、74、96、100 | IT-IDB-004、LEGAL-P0-003 | SPECIFIED／REVIEW_BLOCKED |
| S-20 安裝到手機 | F-CONTENT-03 | feature detection、PWA | CP-INSTALL-* | 12、31、32、54、59 | DEVICE-P0-003 | SPECIFIED |

---

## 6. Reminder Rule 追蹤

| Rule group | 工作 ruleIds | Screens | Copy／reason codes | AC | Test vectors | 狀態 |
| --- | --- | --- | --- | --- | --- | --- |
| Eligibility | RR-P0-ELIGIBILITY-001～003 | S-05～07、S-11～13 | PRODUCT_EXPIRED、NO_CLAIM、IDENTITY_UNKNOWN | 18、35、47、48、53、87、97 | TV-005～008、027～029 | VERIFIED／REVIEW_BLOCKED |
| Activation／current app | RR-P0-ACTIVATION-001、CURRENT-APP-001 | S-05、S-07～10 | 無直接使用者代碼；由目前狀態文案呈現 | 07、28、44、85、87、88、97 | TV-006、010～012、026 | VERIFIED |
| General interval | RR-P0-GENERAL-001～004 | S-05～08 | GENERAL_INTERVAL_REACHED | 05、17、18、35、66、86、87、98 | TV-001～007、009～014 | VERIFIED／REVIEW_BLOCKED |
| Label wait | RR-P0-LABEL-WAIT-001～002 | S-05～07 | LABEL_WAIT_ACTIVE | 05、17、66、86、87、98 | TV-013～014 | VERIFIED／REVIEW_BLOCKED |
| Water | RR-P0-WATER-001～004 | S-03、S-05～09 | WATER_START_UNKNOWN、WATER_RESISTANCE_UNKNOWN、WATER_ENDED | 06、16、28、41、46、83、85、86、88、98 | TV-015～021 | VERIFIED／REVIEW_BLOCKED |
| Ordinary causes | RR-P0-CAUSE-001～003、HAND-WASH-001 | S-07～10 | SWEAT、TOWEL、FRICTION、HAND_WASH | 06、28、37、39、44、51、82、83、85、98 | TV-021～026、037 | VERIFIED／REVIEW_BLOCKED |
| Product safety | RR-P0-SAFETY-001～003 | S-07、S-09、S-13 | PRODUCT_ABNORMAL、PRODUCT_DISCOMFORT | 53、85、86、97、98 | TV-027～029 | VERIFIED／REVIEW_BLOCKED |
| Clothing／tracking | RR-P0-CLOTHING-001～002、TRACKING-001 | S-04、S-07、S-09 | CLOTHING_COVERED | 26、34、44、81、85、86、88、98 | TV-009～011、025～026 | VERIFIED／REVIEW_BLOCKED |
| Context／UVI | RR-P0-CONTEXT-001、UVI-001 | S-01、S-03、S-07、S-09 | UVI／室內外一般文案 | 02～05、19、30、41、66、85、98 | TV-030～032 | VERIFIED／REVIEW_BLOCKED |
| Session summary | primaryAction／overallStatus，不另建平行 rule | S-07 | 全 CP-REMINDER | 36、38、57、64～67、81、86 | TV-033～036、040 | VERIFIED |

### 6.1 工作 ruleId 完整索引

| Rule group | 完整 ruleIds |
| --- | --- |
| Eligibility | `RR-P0-ELIGIBILITY-001`, `RR-P0-ELIGIBILITY-002`, `RR-P0-ELIGIBILITY-003` |
| Activation／current app | `RR-P0-ACTIVATION-001`, `RR-P0-CURRENT-APP-001` |
| General interval | `RR-P0-GENERAL-001`, `RR-P0-GENERAL-002`, `RR-P0-GENERAL-003`, `RR-P0-GENERAL-004` |
| Label wait | `RR-P0-LABEL-WAIT-001`, `RR-P0-LABEL-WAIT-002` |
| Water | `RR-P0-WATER-001`, `RR-P0-WATER-002`, `RR-P0-WATER-003`, `RR-P0-WATER-004` |
| Ordinary causes | `RR-P0-CAUSE-001`, `RR-P0-CAUSE-002`, `RR-P0-CAUSE-003`, `RR-P0-HAND-WASH-001` |
| Product safety | `RR-P0-SAFETY-001`, `RR-P0-SAFETY-002`, `RR-P0-SAFETY-003` |
| Clothing／tracking | `RR-P0-CLOTHING-001`, `RR-P0-CLOTHING-002`, `RR-P0-TRACKING-001` |
| Context／UVI | `RR-P0-CONTEXT-001`, `RR-P0-UVI-001` |

### 6.2 reasonCode 追蹤索引

| reasonCode | Rule／來源 | Screen | Copy |
| --- | --- | --- | --- |
| `CLOCK_UNTRUSTED` | ClockCalibration Session override | S-05、S-07 | CP-REMINDER-CLOCK-ONLINE-001／CP-REMINDER-CLOCK-OFFLINE-001 |
| `PRODUCT_EXPIRED` | RR-P0-ELIGIBILITY-002 | S-05、S-07、S-13 | CP-PRODUCT-EXPIRED-001 |
| `PRODUCT_ABNORMAL_REPORTED` | RR-P0-SAFETY-001～003 | S-07、S-09、S-13 | CP-PRODUCT-ABNORMAL-001 |
| `PRODUCT_DISCOMFORT_REPORTED` | RR-P0-SAFETY-001～003 | S-07、S-09、S-13 | CP-PRODUCT-DISCOMFORT-001 |
| `PRODUCT_NO_SUNSCREEN_CLAIM` | RR-P0-ELIGIBILITY-001～003 | S-05、S-07 | CP-REMINDER-NO-CLAIM-001 |
| `PRODUCT_IDENTITY_UNKNOWN` | RR-P0-ELIGIBILITY-001～003 | S-05、S-07 | CP-REMINDER-PRODUCT-UNKNOWN-001 |
| `METHOD_UNRECORDED` | legacy／recovery method state | S-07 | CP-REMINDER-UNRECORDED-001 |
| `METHOD_NONE_REPORTED` | legacy／recovery／other topical | S-07 | CP-REMINDER-NONE-001 |
| `METHOD_UNKNOWN` | legacy／recovery method state | S-07 | CP-REMINDER-UNKNOWN-001 |
| `WATER_START_UNKNOWN` | RR-P0-WATER-002 | S-05、S-07、S-09 | CP-REMINDER-WATER-UNKNOWN-001 |
| `WATER_RESISTANCE_UNKNOWN` | RR-P0-WATER-001～004 | S-05、S-07、S-15 | CP-REMINDER-WATER-LABEL-UNKNOWN-001 |
| `WATER_ENDED` | RR-P0-CAUSE-001～003 | S-07～S-10 | CP-EVENT-WATER-END-001 |
| `HEAVY_SWEAT_REPORTED` | RR-P0-CAUSE-001～003 | S-07～S-10 | CP-EVENT-SWEAT-001 |
| `TOWEL_REPORTED` | RR-P0-CAUSE-001～003 | S-07～S-10 | CP-EVENT-TOWEL-001 |
| `FRICTION_REPORTED` | RR-P0-CAUSE-001～003 | S-07～S-10 | CP-EVENT-FRICTION-001 |
| `HAND_WASH_REPORTED` | RR-P0-HAND-WASH-001 | S-07～S-10 | CP-EVENT-HAND-001 |
| `GENERAL_INTERVAL_REACHED` | RR-P0-GENERAL-001～004 | S-07 | CP-REMINDER-DUE-001 |
| `WATER_INTERVAL_REACHED` | RR-P0-WATER-001～004 | S-07 | CP-REMINDER-DUE-001 |
| `LABEL_WAIT_ACTIVE` | RR-P0-LABEL-WAIT-001～002 | S-05～S-07 | CP-REMINDER-LABEL-WAIT-001 |
| `CLOTHING_COVERED` | RR-P0-CLOTHING-001～002 | S-04、S-07、S-09 | CP-REMINDER-CLOTHING-001 |
| `SESSION_ENDED` | SessionEndedEvent | S-07、S-19 | CP-REMINDER-ENDED-001 |

---

## 7. P0 AC 覆蓋矩陣

### 7.1 權限、UVI 與資料來源

| AC | Requirement／Screen | Spec evidence | Planned verification | 目前狀態 |
| --- | --- | --- | --- | --- |
| AC-01 | F-01、F-02；S-01、S-02 | Manifest 5.1；Screen S-01／02；CP-REGION | RegionPage tests、region-flow integration | PARTIALLY_VERIFIED |
| AC-02 | F-03、F-04；S-01 | UVI boundary；CP-UVI-007～012 | IT-CWA-007 | SPECIFIED／REVIEW_BLOCKED |
| AC-03 | F-03；S-01 | freshness matrix；CP-UVI-005 | IT-CWA-003 | SPECIFIED |
| AC-04 | F-03；S-01 | CWA missing fallback；CP-UVI-006 | IT-CWA-004 | SPECIFIED |
| AC-19 | F-01、F-02；S-01、S-03～07 | Guest local Session；TV-032 | E2E-P0-011 | SPECIFIED |
| AC-21 | F-02、F-03；S-02 | official TOWNCODE、manual region copy、forecast refresh | region controller／UV controller tests | PARTIALLY_VERIFIED |
| AC-30 | F-03；S-01 | forecast validFrom／validTo／freshness | IT-CWA-005 | SPECIFIED |
| AC-32 | F-01、F-02；S-01、S-02 | permission just-in-time；CP-REGION-001 | BrowserGeolocation、RegionPage tests；LEGAL-P0-001 待完成 | PARTIALLY_VERIFIED／LEGAL_REVIEW |

### 7.2 提醒語義、計時與離線

| AC | Requirement／Screen | Spec evidence | Planned verification | 目前狀態 |
| --- | --- | --- | --- | --- |
| AC-05 | F-04、F-08；S-01、S-07、S-16 | Copy 禁用語、primaryAction、無假時間 | UT-RULE-TV-034、UX-P0-004 | SPECIFIED／REVIEW_BLOCKED |
| AC-09 | F-09、F-11；S-07 | absolute timestamps、恢復矩陣 | IT-IDB-001、E2E-P0-007 | SPECIFIED |
| AC-12 | F-11；全頁 | offline matrix、CP-OFFLINE-001 | E2E-P0-007、DEVICE-P0-001 | SPECIFIED |
| AC-23 | F-09；S-05、S-07 | CLOCK_UNTRUSTED、CP-REMINDER-CLOCK | IT-TIME-003、UT-RULE-TV-036 | SPECIFIED |
| AC-31 | F-09、F-10；S-07、S-18、S-20 | 前景視覺、聲音／震動明確啟用與降級 | DEVICE-P0-004 | SPECIFIED |
| AC-40 | F-09；S-05、S-07～09 | trustedNow、relative＋absolute copy | IT-TIME-001～006 | SPECIFIED |
| AC-66 | F-08、F-UX-03；S-07、S-16 | due card／timed ring、禁用安全語 | A11Y-P0-002、UX-P0-004 | SPECIFIED／REVIEW_BLOCKED |
| AC-67 | F-UX-03；S-07、S-18 | aria templates、reduced motion | A11Y-P0-003 | SPECIFIED |
| AC-86 | F-08；S-07 | DT-TIMING、primaryAction、CP untimed | TV-005、009、018、027、034～036 | SPECIFIED |
| AC-89 | F-09；S-05、S-07 | `/v1/time` nonce、no-store | IT-TIME-001～002 | SPECIFIED |

### 7.3 Session、部位、產品與提醒規則

| AC | Requirement／Screen | Spec evidence | Planned verification | 目前狀態 |
| --- | --- | --- | --- | --- |
| AC-06 | F-07、F-08；S-05、S-07～09 | DT-WATER、RR-P0-WATER | TV-015～021 | SPECIFIED／REVIEW_BLOCKED |
| AC-07 | F-06、F-08；S-08 | Application group partition | TV-037～038 | SPECIFIED |
| AC-16 | F-05、F-08；S-05、S-07、S-15 | water label unknown copy／rule | TV-019 | SPECIFIED／REVIEW_BLOCKED |
| AC-17 | F-05、F-08；S-05～07 | DT-LABEL；CP-REMINDER-LABEL | TV-013～014 | SPECIFIED／REVIEW_BLOCKED |
| AC-18 | F-05；S-05、S-12 | snapshot 欄位分離、未知可繼續 | UT-VALIDATION-002 | SPECIFIED／REVIEW_BLOCKED |
| AC-26 | F-06、F-UX-01；S-04 | DT-METHOD、BODY_ZONE_V3 | UT-VALIDATION-001 | SPECIFIED |
| AC-28 | F-07；S-08～10 | effectiveOccurredAt、stable order | TV-022、039 | SPECIFIED |
| AC-33 | F-UX-01；S-03～06 | recent setting 不沿用時間 | E2E-P0-008 | SPECIFIED |
| AC-34 | F-06、F-UX-01；S-04～05 | preset 自動套用、group mapping、batch method、最終確認 | UT-WEB-SETUP-001、UX-P0-002 | IMPLEMENTED／PARTIALLY_VERIFIED |
| AC-35 | F-05、F-UX-01；S-05、S-11～13 | session-only snapshot、unknown value | UT-VALIDATION-002、E2E-P0-003 | SPECIFIED |
| AC-37 | F-06、F-07；S-08、S-09 | 預選不提交；final confirmation | E2E-P0-005 | SPECIFIED |
| AC-41 | F-07；S-03、S-09 | water preparing／active／unknown | TV-018～021 | SPECIFIED |
| AC-42 | F-01、F-06；S-03、S-05、S-07 | one active Session、conflict copy | E2E-P0-012 | SPECIFIED |
| AC-43 | F-05；S-05、S-11 | 90-day／top-3 deterministic sorting | UT-VALIDATION-005 | SPECIFIED |
| AC-44 | F-06、F-07；S-09、S-10 | immutable method correction | IT-IDB-003 | SPECIFIED |
| AC-45 | F-07；S-10 | unique correction leaf | TV-039 | SPECIFIED |
| AC-47 | F-05、F-CONTENT-02；S-05、S-12、S-15 | no_sunscreen_claim eligibility | TV-005；CONTENT-P0-005 | SPECIFIED／REVIEW_BLOCKED |
| AC-48 | F-05、F-CONTENT-02；S-05、S-15 | finished product vs ingredient copy | CONTENT-P0-005、MED-P0-002 | REVIEW_BLOCKED |
| AC-50 | F-05；S-05、S-11～13 | saved product reuse | E2E-P0-003 | SPECIFIED |
| AC-51 | F-07、F-08；S-09 | RR-P0-HAND-WASH | TV-022～023 | SPECIFIED／REVIEW_BLOCKED |
| AC-52 | F-UX-01；S-04 | ears independently removable | UX-P0-002 | SPECIFIED |
| AC-53 | F-05；S-11～13 | product state filtering／safety restore | TV-027～029、E2E-P0-010 | SPECIFIED／REVIEW_BLOCKED |
| AC-79 | F-UX-01；S-03～06 | three-stage flow、推薦自動套用、Bottom Sheet、contextual fields、final confirmation | UT-WEB-SETUP-001、UX-P0-001 | IMPLEMENTED／PARTIALLY_VERIFIED |
| AC-81 | F-06、F-UX-01；S-07 | one primary action＋group summary | UX-P0-004 | SPECIFIED |
| AC-82 | F-06、F-08；S-08 | only confirmed zones reset | TV-037～038 | SPECIFIED |
| AC-83 | F-07；S-09 | event preset final confirmation | E2E-P0-005 | SPECIFIED |
| AC-85 | F-06～08；S-07～10 | activation、strict later cause | TV-010～012、022、025～026 | SPECIFIED |
| AC-87 | F-05、F-08；S-05～08、S-13 | immutable snapshot、shorter label | TV-002、004、006 | SPECIFIED／REVIEW_BLOCKED |
| AC-88 | F-06；S-04～06 | StartSessionCommand atomicity | UT-VALIDATION-003、IT-IDB-005 | SPECIFIED |
| AC-94 | F-06；S-04、S-07 | BODY_ZONE_V3 custom privacy | UT-VALIDATION-006、SEC-P0-005 | SPECIFIED |
| AC-96 | F-06；S-07、S-19 | SessionEndedEvent、EndSessionCommand transaction、二次確認與失敗保留 active Session | TV-040、UT-WEB-P0-005、IT-IDB-006 end subset、E2E-P0-013 | IMPLEMENTED／PARTIALLY_VERIFIED |
| AC-97 | F-05、F-08；S-05、S-07、S-09、S-13 | eligibility＋ProductSafetyEvent | TV-005～008、027～029 | SPECIFIED／REVIEW_BLOCKED |
| AC-98 | F-CONTENT-01、F-08 | 27 working ruleIds＋Evidence Link gate | CONTENT-P0-002 | REVIEW_BLOCKED |

### 7.4 UX、畫面與無障礙

| AC | Requirement／Screen | Spec evidence | Planned verification | 目前狀態 |
| --- | --- | --- | --- | --- |
| AC-36 | F-UX-01；S-07 | Screen S-07 information order | UX-P0-004 | SPECIFIED |
| AC-38 | F-UX-03；全部狀態頁 | Copy 白話映射、非顏色提示 | A11Y-P0-001 | SPECIFIED |
| AC-39 | F-UX-01；S-03、S-08～10 | SetupDraft＋immutable correction | IT-IDB-003、E2E-P0-014 | SPECIFIED |
| AC-54 | F-UX-03；全部核心頁 | 360／390／430、keyboard safe area | DEVICE-P0-002、E2E-P0-015 | SPECIFIED |
| AC-57 | F-01；S-07 | reminder empty state | E2E-P0-001 | SPECIFIED |
| AC-58 | F-CONTENT-01；S-14、S-17 | special situation route placement | UX-P0-003 | SPECIFIED |
| AC-59 | F-UX-01、F-UX-03；全部 | one primary CTA、plain copy | UX-P0-001～004 | SPECIFIED |
| AC-64 | F-UX-01；S-07 | primary state → cause → action → zones | UX-P0-004 | SPECIFIED |
| AC-65 | F-UX-01；S-07～09 | one primary button＋final confirmation | E2E-P0-005、A11Y-P0-004 | SPECIFIED |
| AC-68 | F-UX-03；全部 | day high-contrast tokens | A11Y-P0-005 | SPECIFIED |
| AC-69 | F-UX-03；全部狀態 | text＋icon＋border＋color | A11Y-P0-001 | SPECIFIED |
| AC-70 | F-UX-03；S-18 | three display modes | A11Y-P0-006 | SPECIFIED |
| AC-71 | F-UX-03；S-01、S-07、S-18 | outdoor device test matrix | DEVICE-P0-002 | SPECIFIED |

### 7.5 內容、特殊狀況與法務

| AC | Requirement／Screen | Spec evidence | Planned verification | 目前狀態 |
| --- | --- | --- | --- | --- |
| AC-15 | F-CONTENT-01；S-14～17 | Copy review states、Claim Registry gate | CONTENT-P0-001 | REVIEW_BLOCKED |
| AC-20 | F-CONTENT-01；S-17 | one-time no-store special flow | MED-P0-003、SEC-P0-006 | REVIEW_BLOCKED |
| AC-22 | F-01、F-12；S-19 | Guest local-only boundary | SEC-P0-001、LEGAL-P0-003 | SPECIFIED／REVIEW_BLOCKED |
| AC-46 | F-CONTENT-02；S-05、S-09、S-15 | Q&A contextual entry、state-neutrality | CONTENT-P0-005 | REVIEW_BLOCKED |
| AC-49 | F-CONTENT-01～02；S-15 | marine claim fields＋publish gate | MARINE-P0-001、CONTENT-P0-005 | REVIEW_BLOCKED |
| AC-55 | F-01、F-12；S-01、S-02、S-19 | no mandatory personal data | SEC-P0-001、LEGAL-P0-001 | SPECIFIED／REVIEW_BLOCKED |
| AC-56 | F-CONTENT-01；S-17 | medical refusal／referral copy | MED-P0-003、LEGAL-P0-006 | REVIEW_BLOCKED |
| AC-61 | F-CONTENT-02～03；S-05、S-09、S-15、S-16 | content does not mutate state | E2E-P0-016、CONTENT-P0-005 | SPECIFIED／REVIEW_BLOCKED |
| AC-63 | F-CONTENT-01～03；S-14～16 | source、review、copyright gate | CONTENT-P0-001～006 | REVIEW_BLOCKED |
| AC-74 | F-12；全部 Session／產品頁 | non-index／access boundary | SEC-P0-007 | SPECIFIED |
| AC-80 | 全 P0 | no ads／affiliate／paid ranking | UX-P0-005、CONTENT-P0-007 | SPECIFIED |
| AC-90 | F-01、F-12 | Guest creates no remote Session／notification | SEC-P0-008、IT-IDB-006 | SPECIFIED |
| AC-99 | F-CONTENT-01；S-17 | BLOCKED redFlag／119 copy、offline gate | MED-P0-004、LEGAL-P0-006 | REVIEW_BLOCKED |
| AC-100 | F-12；S-02、S-19 | rights copy、24h flowId boundary | LEGAL-P0-001～004、SEC-P0-009 | REVIEW_BLOCKED |

---

## 8. Planned 測試與證據目錄

### 8.0 已產生的工程證據（2026-07-30）

| Evidence | 實作位置 | 執行結果 | 證明範圍 |
| --- | --- | --- | --- |
| UT-RULE-TV-001～040 | `packages/test-fixtures/src/reducer.test.ts` | `passed` | Decision Table 40 個固定向量；純 reducer、current app、water、causes、safety、primaryAction |
| UT-VALIDATION-001～003、006 | `packages/test-fixtures/src/contracts.test.ts` | `passed` | StartSession method、ProductLabelSnapshot、Application partition、BODY_ZONE uniqueness |
| IT-IDB-005 foundation | `packages/test-fixtures/src/persistence-web.test.ts` | `passed` | transaction commit／abort、idempotency、active lock、revision CAS、client sequence、並行衝突、invalidation payload |
| UT-WEB-P0-001 | `apps/web/src/app/createAppBootController.test.ts` | `3 tests passed` | concurrent App Boot、foreground／cross-context refresh、storage error |
| IT-IDB-001 restore subset | `apps/web/src/app/appBoot.integration.test.ts` | `2 tests passed` | 真實 repository projection restore、atomic local visitor ID |
| UT-WEB-P0-002 | `apps/web/src/components/reminder/PrimaryReminderPanel.test.ts` | `3 tests passed` | Timed／Soon／Due／Untimed 呈現與 typed action emit |
| UT-WEB-P0-003 | `apps/web/src/components/reminder/ReminderEmptyState.test.ts` | `1 test passed` | S-07 空白文案與 Setup route |
| UT-WEB-P0-004 | `apps/web/src/router/index.test.ts` | `1 test passed` | Vue Router 等待 App Boot 與 route title |
| UT-WEB-P0-005 | `apps/web/src/components/session/SessionEndControl.test.ts` | `3 tests passed` | 停止入口、影響說明、二次確認、取消、寫入失敗時明示提醒仍在運作 |
| IT-IDB-006 end subset | `apps/web/src/features/session/createSessionControlController.integration.test.ts` | `1 test passed` | EndSession command、真實 repository transaction、ended reason、active lock 移除及 App Boot refresh |
| UT-UV-RULE-001 | `apps/web/src/features/uv/uvForecastRules.test.ts` | `4 tests passed` | 18:00～05:59、跨午夜 dismissal cycle、過期預報與 CWA 等級 |
| UT-WEB-UV-001 | `apps/web/src/features/uv/createUvForecastController.test.ts` | `3 tests passed` | 無地區不查 API、晚間一次提示、network→IndexedDB snapshot fallback |
| UT-WEB-UV-002 | `apps/web/src/components/uv/UvForecastComponents.test.ts` | `3 tests passed` | 五日白日時段、無地區不顯示假數值、晚間 view／dismiss |
| IT-IDB-UV-001 | `packages/test-fixtures/src/persistence-web.test.ts` | `passed` | RegionSelection 與 FiveDayUvForecast snapshot 本機保存／讀取 |
| UT-WEB-SETUP-001 | `apps/web/src/components/setup/SetupFlowComponents.test.ts` | `2 tests passed` | S-03 水上情境真值、S-04 preset 展開為 V3 原子部位且不靜默加入頭皮／嘴唇 |
| IT-IDB-SETUP-001 | `packages/test-fixtures/src/persistence-web.test.ts` | `passed` | SetupDraft 保存／24 小時到期／取消刪除、已確認時間以 pendingTiming 持久化、全衣物不建立 Application |
| IT-WEB-SETUP-001 | `apps/web/src/features/setup/createSetupController.integration.test.ts` | `5 tests passed` | SetupDraft → StartSession transaction、session-only snapshot、時間重確認、water preparing／active |
| UT-WEB-SETUP-002 | `apps/web/src/components/setup/SetupFlowComponents.test.ts` | `passed` | 推薦部位自動套用後仍可調整；ProtectionAdjustmentSheet dialog 語意、關閉事件與 Teleport 邊界 |
| UT-WEB-PRODUCT-001 | `apps/web/src/components/product/SetupProcessBanner.test.ts` | `passed` | 未完成 SetupDraft 的產品頁 Process Banner 與返回設定事件 |
| IT-WEB-SETUP-002 | `apps/web/src/features/setup/createSetupController.integration.test.ts` | `passed` | `pendingTiming` 在沒有產品時保存、IndexedDB 重新載入後恢復，且不建立 Application 或 Session |
| MANUAL-WEB-SETUP-001 | 本機 in-app browser `S-03 → S-05（含選用 S-04）→ S-06 → S-07` | `passed；console 0 errors` | 真實 IndexedDB projection、active Session guard、三畫面路由與最終提醒呈現。**此紀錄對應改為兩步之前的實作**，改版後需重跑為 `S-03 → S-05 → S-07` |
| TypeScript boundary | root `pnpm typecheck` | `passed` | contracts、domain、persistence-web、platform、ui、test-fixtures、web strict TypeScript |
| Web production build | root `pnpm build` | `passed` | `vue-tsc`＋Vite production bundle |
| MANUAL-WEB-SESSION-END-001 | 本機 in-app browser 首頁 | `passed` | 停止入口、alertdialog 影響說明及取消；為保留既有 Session，最終結束由隔離的 integration test 驗證 |
| MANUAL-WEB-UV-001 | 本機 in-app browser 首頁無地區狀態 | `passed` | 不顯示 UV 數字、原提醒仍存在、573px viewport 無橫向溢出 |
| UT-WEB-HOME-REMINDER-001 | `homeReminderClockPresentation.test.ts`＋`HomeReminderSummary.test.ts` | `9 tests passed` | 到期時間不同時顯示優先部位；全部 active 計時部位時間一致時顯示全面補擦；單一／到期／未計時混合邊界、圓環進度及 action event |
| MANUAL-WEB-HOME-REMINDER-001 | 本機 in-app browser 首頁真實 Session | `passed；console 0 errors` | 8 個同時到期部位顯示單一全面補擦提醒環；標題／卡片無溢位，圓內文字下移 4px 且仍完整位於圓環內 |
| Full local Gate | root `pnpm test` | `22 test files, 134 tests passed` | foundation＋目前 Web Shell／local Setup／Bottom Sheet／pendingTiming／Process Banner／Session end／Five-day UV／首頁提醒範圍判斷自動測試集合 |

上述證據不包含可重跑的正式 UI E2E、真實瀏覽器 multi-context、recent／
saved-product Setup 分支、DB migration／quota、CWA、可信時間 API、PWA、Accessibility、Device 或專業審查；fake-indexeddb
restore test 不得替代 E2E-P0-007。

### 8.1 Rule／validation

| ID | 內容 | 覆蓋 |
| --- | --- | --- |
| UT-RULE-TV-001～040 | Decision Table 固定事件流 | 一般、水上、因果、安全、primaryAction |
| UT-VALIDATION-001 | StartSession method combinations | AC-26、34、88 |
| UT-VALIDATION-002 | ProductLabelSnapshotV1 | AC-18、35、87、97 |
| UT-VALIDATION-003 | StartSession atomicity／idempotency | AC-42、88 |
| UT-VALIDATION-004 | Product form schema | AC-18、35、47、48 |
| UT-VALIDATION-005 | Recent product deterministic sorting | AC-43、53 |
| UT-VALIDATION-006 | BODY_ZONE_V3 uniqueness／custom | AC-94 |

### 8.2 Integration／E2E

| ID | 內容 | 覆蓋 |
| --- | --- | --- |
| IT-CWA-001～007 | regions、station、fallback、freshness、boundaries | AC-02～04、21、30 |
| IT-TIME-001～006 | nonce、no-cache、RTT、jump、baseline reset | AC-23、40、89 |
| IT-IDB-001～006 | restore、offline、correction、clear、atomicity、Guest boundary | AC-09、12、22、39、45、88、90、96 |
| E2E-P0-001 | Guest home／reminder empty | AC-01、32、55、57 |
| E2E-P0-002 | location deny／manual／skip | AC-01、19、21、32 |
| E2E-P0-003 | saved／session-only product | AC-35、43、50、53 |
| E2E-P0-004 | BODY_ZONE_V3 setup／local reapply | AC-07、26、34、52、82、94 |
| E2E-P0-005 | event presets／final confirmation | AC-06、37、51、83 |
| E2E-P0-006 | permission／API／storage failure | AC-01、12、31、32 |
| E2E-P0-007 | offline open／restore | AC-09、12、23、40 |
| E2E-P0-008 | reuse／draft／three-stage setup | AC-33、39、79 |
| E2E-P0-009 | atomic final confirmation | AC-35、42、88 |
| E2E-P0-010 | archive／restore blocked product | AC-50、53、97 |
| E2E-P0-011 | no-region Session | AC-19 |
| E2E-P0-012 | existing active Session conflict | AC-42 |
| E2E-P0-013 | end Session／old route | AC-96 |
| E2E-P0-014 | correction audit | AC-39、44、45 |
| E2E-P0-015 | mobile widths／keyboard | AC-54、59、65 |
| E2E-P0-016 | contextual content returns without mutation | AC-46、61 |

### 8.3 UX／Accessibility／Device

| ID | 內容 | 覆蓋 |
| --- | --- | --- |
| UX-P0-001 | first setup ≤30s hypothesis | AC-54、59、79 |
| UX-P0-002 | presets、groups、ear removal | AC-34、52、79 |
| UX-P0-003 | bottom navigation／special situation placement | AC-57～59 |
| UX-P0-004 | primaryAction comprehension | AC-05、36、64、66、81、86 |
| UX-P0-005 | commercial neutrality review | AC-80 |
| UX-P0-006 | reuse setup ≤10s hypothesis | AC-33、79 |
| A11Y-P0-001～007 | contrast、non-color、ring、focus、modes、zoom | AC-38、54、59、64～71 |
| DEVICE-P0-001 | PWA offline matrix | AC-09、12 |
| DEVICE-P0-002 | outdoor Android／iPhone readability | AC-54、68～71 |
| DEVICE-P0-003 | install instructions／feature detection | AC-31、32、54、59 |
| DEVICE-P0-004 | foreground audio／vibration opt-in | AC-31 |

### 8.4 Review／security

| ID | 內容 | 覆蓋 |
| --- | --- | --- |
| CONTENT-P0-001～007 | claim gate、rule evidence、Q&A、copyright、neutrality | AC-15、46、49、61、63、80、98 |
| MED-P0-001～004 | health copy、beach content、medical refusal、red flags | AC-05、15～18、46～49、56、97、99 |
| MARINE-P0-001 | FAQ_BEACH_SUN_V1 marine review | AC-48、49 |
| LEGAL-P0-001～006 | location notice、rights、lifecycle、TFDA、medical／emergency copy | AC-20、22、32、49、55、56、63、99、100 |
| SEC-P0-001～009 | Guest boundary、coordinates、storage、custom labels、noindex、analytics | AC-01、19、22、55、74、90、94、100 |

---

## 9. 發布阻擋項目

| Blocker | 影響 Requirement／AC | 目前證據 | 解除條件 |
| --- | --- | --- | --- |
| 正式健康文案尚未核准 | F-04、F-08、F-CONTENT-01～03；AC-05、15～18、46～49、56、63、97～99 | Copy Deck 為 draft | MED-P0 與 Claim Registry 核准 |
| 急症 redFlagCodes／119 文字仍為 BLOCKED | F-CONTENT-01；AC-99 | CP-SPECIAL-005 | 台灣醫療＋法務核准，離線包驗證 |
| 皮膚破損／起泡照護文案仍為 BLOCKED | F-CONTENT-01；AC-56、99 邊界 | CP-SPECIAL-004 | 醫療＋法務核准 |
| 正式個資告知缺蒐集者／聯絡方式 | F-12；AC-22、32、55、100 | Copy Deck 列出缺欄位 | LEGAL-P0-001～004 核准 |
| FAQ_BEACH_SUN_V1 尚未填核准日期 | F-CONTENT-02；AC-46～49、61、63 | PRD status=draft | 醫療＋海洋＋法務核准 |
| 27 個工作 ruleId 尚未連 Evidence | F-08、F-CONTENT-01；AC-98 | Decision Table registry | ReminderRuleEvidenceLink 全數 approved |
| TFDA intended use 尚未評估 | 全 P0 對外定位 | PRD 要求 | TFDA 法規專業評估完成 |
| Phase 3 只有 Web Shell／local Setup／Reminder projection＋Session end mutation＋F-17 前端切片；Phase 4～6 尚未開始 | 全 P0＋使用者核准的 F-17 uplift | contracts／reducer／IDB foundation＋Web Shell／S-03～S-07 local slice＋Bottom Sheet／pendingTiming／Process Banner＋FiveDayUvForecast UI／首頁優先與全面補擦呈現已有 134 tests；CWA forecast API、S-02、recent／saved-product、可信時間、其餘 mutation、PWA、正式 UI E2E、A11Y、Device 尚無完整證據 | 完成 CWA／S-02 與其餘 Planned evidence、專業審查及發布 Gate |

---

## 10. 覆蓋完整性規則

自動檢查至少驗證：

1. PRD 的 78 個 P0 Core Beta AC 全部出現在第 7 節。
2. 純 P0.5 AC 不得被標為 P0 發布阻擋。
3. Manifest 的 17 個 P0 Requirements 全部出現在第 4 節。
4. S-01～S-20 全部出現在第 5 節。
5. Decision Table 的 27 個工作 `ruleId` 全部隸屬第 6 節某個 rule group。
6. Copy Deck 的 21 個 reasonCode 全部有 rule／screen／AC 去向。
7. 每個 P0 AC 至少有一個 Planned verification。
8. `REVIEW_BLOCKED` 項目不得被標為 `RELEASE_READY`。
9. 沒有程式碼位置與測試結果時不得標 `IMPLEMENTED／VERIFIED`。
10. 需求、AC、測試或 copy ID 更名時必須同步更新本矩陣。

---

## 11. 變更控制

每次 PRD、Manifest、Screen、Rule、Copy 或 Technical Design 變更時：

1. 更新來源文件版本。
2. 找出受影響 Requirement、Screen、ruleId、copy_id、AC 與測試。
3. 更新本矩陣對應列。
4. 已有實作時標記需要重跑的測試證據。
5. 若會建立、提前、取消或阻止期限，更新 ruleset 與 Evidence Link。
6. 若涉及健康、海洋或個資文案，重新判斷審查是否仍有效。
7. 不得只修改 UI 文案卻留下錯誤 CTA／reasonCode 映射。

---

## 12. 下一步

本矩陣與 Technical Design 完成後，P0 規格鏈已具備：

```text
PRD
  → P0 Release Manifest
  → Screen Inventory
  → Reminder Rule Decision Table
  → Copy Deck
  → Requirement Traceability Matrix
  → P0 Technical Design Document
```

Phase 0、Phase 1 核心、Phase 2 foundation／SetupDraft，以及 Phase 3
Web Shell／S-01／S-03～S-07 local slice 已建立，實際程式位置與本機測試
結果已回填第 8.0 節。下一步分成兩條：

1. 補齊 Phase 2 hardening：其餘 mutation command、migration、
   quota／unsupported、DB close／reopen replay、真實瀏覽器
   multi-context。
2. 繼續 Phase 3：完成 recent／saved-product Setup、ClockCalibration
   整合、S-02、S-08～S-20 與 UI E2E／Accessibility 證據。

foundation 的 `VERIFIED` 不代表完整 Requirement、Screen 或 P0 Release
已通過；內容、醫療、法律、海洋與 TFDA Gate 仍維持阻擋。
