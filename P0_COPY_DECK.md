# 防曬晴報員 P0 Copy Deck

| 文件資訊 | 內容 |
| --- | --- |
| 對應 PRD | `防曬晴報員PRD.md` v3.9 |
| 對應畫面規格 | `P0_SCREEN_INVENTORY.md` v0.5 |
| 對應提醒規則 | `P0_REMINDER_RULE_DECISION_TABLE.md` v0.3 |
| 文件版本 | 0.5 |
| 語系 | 繁體中文 `zh-TW` |
| 狀態 | 文案與審查基準草案 |
| 建立日期 | 2026-07-29 |
| 最近更新 | 2026-08-07 |

> 本文件提供 P0 介面文案、CTA、錯誤與狀態模板。標記為 `BLOCKED` 的文案在相應專業審查完成前不得發布。任何文案不得改變 reducer 規則、建立新期限或被用來抵銷誤導性的畫面設計。

---

## 1. 審查狀態

| 狀態 | 意義 | 可否發布 |
| --- | --- | ---: |
| `PRODUCT_DRAFT` | 依 PRD 整理的一般產品文案，待產品／設計核對 | 否 |
| `CONTENT_REVIEW` | 涉及 CWA 資料標示、科學內容或一般衛教內容治理 | 否 |
| `MEDICAL_REVIEW` | 涉及健康、曬後、產品不適或醫療邊界 | 否 |
| `LEGAL_REVIEW` | 涉及個資、權利、資料保存、服務限制或法規屬性 | 否 |
| `MARINE_REVIEW` | 涉及珊瑚、海洋環境、椰子油或 reef-safe | 否 |
| `MULTI_REVIEW` | 需要兩種以上專業共同核准 | 否 |
| `APPROVED` | 已有有效審查人、日期、範圍與下次再審日期 | 是 |
| `RETIRED` | 已撤下或被新版取代 | 否 |
| `BLOCKED` | 缺少必要內容或核准版本 | 否 |

本文件目前所有文案均不自動視為 `APPROVED`。

---

## 2. 文案欄位

每則正式文案至少包含：

```text
copy_id
screen_id
trigger
title
body
primary_cta
secondary_cta
aria_text
review_status
claim_ids[]
version
```

不適用欄位可為 null，但不得用空字串冒充核准內容。

---

## 3. 變數與格式

### 3.1 允許變數

| 變數 | 內容 | 顯示範例 |
| --- | --- | --- |
| `{zone}` | 標準安全部位名稱 | 手背 |
| `{zones}` | 最多兩個標準部位加數量摘要 | 手背、耳朵等 3 個部位 |
| `{relative_time}` | 約略相對時間 | 約 15 分鐘後 |
| `{absolute_time}` | 使用者時區絕對時間 | 15:40 |
| `{event_time}` | 實際事件時間 | 14:20 |
| `{uvi}` | 已驗證可顯示的 UVI | 7 |
| `{uvi_level}` | CWA 中文等級 | 高量級 |
| `{source_name}` | 測站或預報區域安全名稱 | 臺北測站 |
| `{observed_at}` | 觀測時間 | 14:10 |
| `{valid_period}` | 預報有效時段 | 今日 06:00–18:00 |
| `{distance}` | 測站距離 | 約 5 公里 |
| `{product_label_wait}` | 使用者確認的標示分鐘 | 15 分鐘 |
| `{water_minutes}` | 只允許 40 或 80 | 40 分鐘 |
| `{count}` | 非敏感數量 | 3 |

### 3.2 變數安全規則

- `{zone}` 只使用固定 `BODY_ZONE_V3` 安全名稱。
- `custom` 永遠顯示「其他部位」，不得帶入使用者自訂文字。
- 不在文案變數中放產品私人備註、疾病、症狀、精確位置或事件完整時間線。
- 變數缺值時使用對應缺資料文案，不得留下 `{placeholder}` 或猜測數值。
- 時間不可信時不得渲染 `{relative_time}` 作為可延長的期限。
- `{water_minutes}` 不得由產品名稱、油滑感或自由文字推測。

---

## 4. 固定品牌與語氣

### CP-BRAND-001

| 欄位 | 內容 |
| --- | --- |
| 使用位置 | 首頁／品牌介紹 |
| 品牌名稱 | 防曬晴報員 |
| 短稱 | 晴報員 |
| 標語 | 記得防曬，也記得適時補擦 |
| review_status | PRODUCT_DRAFT |

### CP-BRAND-002：產品定位

| 欄位 | 內容 |
| --- | --- |
| title | 了解 UV 風險，記得適時補擦 |
| body | 查看所在地最新可用的紫外線資料，記錄各部位的防護方式與補擦提醒。這不是醫療、診斷或安全曝曬時間計算工具。 |
| review_status | MULTI_REVIEW：產品／醫療／法務 |

### 語氣規則

1. 先說現在的狀況。
2. 再說原因。
3. 最後提供一個主要行動。
4. 使用「建議」「可以」「請留意」，不責備、不恐嚇。
5. 可以輕量使用「晴報員提醒」；資料不足時，直接說明尚未確認的項目。
6. 不用性別、外貌或防曬習慣推定。

### 禁用語

- 精準曬傷倒數
- 安全剩餘時間
- 您現在絕對安全
- 保證不曬傷
- 防曬已完全失效
- 物理全防禦
- UV＝0
- 100% 離線正常
- 絕不外洩
- 現在的太陽更毒
- 一定響鈴
- 一定震動

---

## 5. 共用導覽與操作

| copy_id | 用途 | 文案 | review_status |
| --- | --- | --- | --- |
| CP-NAV-001 | 底部導覽 | 首頁 | PRODUCT_DRAFT |
| CP-NAV-002 | 底部導覽 | 提醒 | PRODUCT_DRAFT |
| CP-NAV-003 | 底部導覽 | 防曬品 | PRODUCT_DRAFT |
| CP-NAV-004 | 底部導覽 | 更多 | PRODUCT_DRAFT |
| CP-HEADER-001 | 頁首狀態 | 本機提醒 | PRODUCT_DRAFT |
| CP-HEADER-002 | 頁首狀態（tracking） | 提醒進行中 | PRODUCT_DRAFT |
| CP-HEADER-003 | 頁首狀態（soon） | 即將需要檢查 | PRODUCT_DRAFT |
| CP-HEADER-004 | 頁首狀態（due） | 建議現在處理 | PRODUCT_DRAFT |
| CP-HOME-SAFETY-001 | 首頁免責聲明 | 防曬提醒是協助你回看紀錄的工具，不是安全曝曬時間或防護效果保證。 | CONTENT_REVIEW |
| CP-ACTION-001 | 返回 | 返回 | PRODUCT_DRAFT |
| CP-ACTION-002 | 取消 | 取消 | PRODUCT_DRAFT |
| CP-ACTION-003 | 繼續 | 下一步 | PRODUCT_DRAFT |
| CP-ACTION-004 | 修改 | 返回修改 | PRODUCT_DRAFT |
| CP-ACTION-005 | 重試 | 再試一次 | PRODUCT_DRAFT |
| CP-ACTION-006 | 展開 | 查看詳細內容 | PRODUCT_DRAFT |
| CP-ACTION-007 | 收合 | 收起詳細內容 | PRODUCT_DRAFT |
| CP-ACTION-008 | 更正 | 更正 | PRODUCT_DRAFT |

---

## 6. 首頁與 UVI

### CP-HOME-001：無進行中提醒

| 欄位 | 內容 |
| --- | --- |
| screen_id | S-01 |
| trigger | 沒有 active Session |
| primary_cta | 開始防曬提醒 |
| review_status | PRODUCT_DRAFT |

### CP-HOME-002：有進行中提醒

| 欄位 | 內容 |
| --- | --- |
| screen_id | S-01 |
| trigger | 有 active Session |
| presentation | 只顯示一個由 `primaryAction` 決定的主要狀態元件；可信時間且適用提醒環時，依部位期限是否一致套用 CP-HOME-REMINDER-PRIORITY-001 或 CP-HOME-REMINDER-ALL-001；due／untimed 則顯示相應靜態行動卡 |
| primary_cta | 依目前 `primaryAction.actionKind` 顯示相符操作，不顯示「查看目前提醒」 |
| review_status | PRODUCT_DRAFT／MEDICAL_REVIEW |

### CP-HOME-REMINDER-PRIORITY-001：優先部位

| 欄位 | 內容 |
| --- | --- |
| screen_id | S-01 |
| trigger | active Session 中至少有一個可信 `zoneDueAt`，且有效計時部位的到期時間不同；只有一個有效計時部位，或另有 active 未計時部位時亦使用本狀態 |
| ring_value | {remaining_minutes} 分鐘 |
| title | 建議優先補擦：{earliest_zone_or_group} |
| supporting_text | 預計 {absolute_time} |
| aria_text | 建議優先補擦：{earliest_zone_or_group}，剩 {remaining_minutes} 分鐘，預計 {absolute_time}。 |
| review_status | PRODUCT_DRAFT／MEDICAL_REVIEW |

### CP-HOME-REMINDER-ALL-001：全部位

| 欄位 | 內容 |
| --- | --- |
| screen_id | S-01 |
| trigger | 至少兩個 active 部位都有可信 `zoneDueAt`，且所有 active 部位的到期時間完全一致 |
| ring_value | {remaining_minutes} 分鐘 |
| title | 建議 {remaining_minutes} 分鐘後進行全面補擦 |
| due_title | 建議現在進行全面補擦 |
| supporting_text | 預計 {absolute_time} |
| aria_text | 建議全面補擦，剩 {remaining_minutes} 分鐘，預計 {absolute_time}。 |
| review_status | PRODUCT_DRAFT／MEDICAL_REVIEW |

### CP-UVI-001：無地區

| 欄位 | 內容 |
| --- | --- |
| title | 目前沒有所在地 UV 資料 |
| body | 你可以使用目前位置、手動選擇地區，或先不提供地區。沒有地區資料仍可使用防曬提醒。 |
| primary_cta | 使用目前位置 |
| secondary_cta | 手動選擇地區 |
| tertiary_link | 暫不提供地區 |
| review_status | PRODUCT_DRAFT／LEGAL_REVIEW |

### CP-UVI-002：有效測站觀測

| 欄位 | 內容 |
| --- | --- |
| eyebrow | 最近測站觀測 |
| title | 紫外線指數 {uvi}・{uvi_level} |
| body | {source_name}，距離約 {distance}，觀測時間 {observed_at}。數值來自代表測站，可能與你所在位置略有差異。 |
| aria_text | 紫外線指數 {uvi}，中央氣象署分級為 {uvi_level}。資料來自 {source_name}，觀測時間 {observed_at}。 |
| review_status | PRODUCT_DRAFT／CONTENT_REVIEW |

### CP-UVI-003：手動地區代表測站

| 欄位 | 內容 |
| --- | --- |
| eyebrow | 所選地區代表測站觀測 |
| body | 資料來自 {source_name}，觀測時間 {observed_at}。這不是你目前位置的直接量測。 |
| review_status | PRODUCT_DRAFT |

### CP-UVI-004：區域預報

| 欄位 | 內容 |
| --- | --- |
| eyebrow | 區域預報 |
| title | 預報紫外線指數 {uvi}・{uvi_level} |
| body | 適用時段：{valid_period}。這是區域預報，不是即時測站觀測。 |
| review_status | PRODUCT_DRAFT／CONTENT_REVIEW |

### CP-UVI-005：觀測較舊

| 欄位 | 內容 |
| --- | --- |
| title | 這筆 UV 資料較舊 |
| body | 最近可用的觀測時間是 {observed_at}，目前環境可能已經不同。請留意資料時間並搭配一般防護。 |
| primary_cta | 重新整理 |
| review_status | PRODUCT_DRAFT／CONTENT_REVIEW |

### CP-UVI-006：資料不可作為目前 UVI

| 欄位 | 內容 |
| --- | --- |
| title | 目前沒有可用的 UV 資料 |
| body | 最近資料已過期或缺測，因此不顯示為目前 UVI。你仍可查看一般防護資訊並使用補擦提醒。 |
| primary_cta | 再試一次 |
| review_status | PRODUCT_DRAFT |

### CP-UVI-007：UVI 0

| 欄位 | 內容 |
| --- | --- |
| title | 紫外線指數 0・低量級 |
| body | 觀測值為 0，但不代表零風險。請同時留意資料時間、活動時間與個別醫囑。 |
| review_status | MEDICAL_REVIEW／CONTENT_REVIEW |

### CP-UVI-008：低量級

| 欄位 | 內容 |
| --- | --- |
| title | 目前為低量級 |
| body | 一般情況下短時間戶外風險較低，但不是零風險；長時間活動或有醫師避光指示時仍請留意防護。 |
| review_status | MEDICAL_REVIEW |

### CP-UVI-009：中量級

| 欄位 | 內容 |
| --- | --- |
| title | 目前為中量級 |
| body | 建議搭配遮蔭、衣物、帽子、太陽眼鏡，並依產品標示使用防曬。 |
| review_status | MEDICAL_REVIEW |

### CP-UVI-010：高量級

| 欄位 | 內容 |
| --- | --- |
| title | 目前為高量級 |
| body | 可以減少高曝曬時段的停留，增加遮蔽並留意需要補擦的事件。 |
| review_status | MEDICAL_REVIEW |

### CP-UVI-011：過量級

| 欄位 | 內容 |
| --- | --- |
| title | 目前為過量級 |
| body | 優先調整活動時間、尋找遮蔭，並採取多重防護。 |
| review_status | MEDICAL_REVIEW |

### CP-UVI-012：危險級

| 欄位 | 內容 |
| --- | --- |
| title | 目前為危險級 |
| body | 建議儘量降低非必要曝曬；無法避免時，請採取多重防護。 |
| review_status | MEDICAL_REVIEW |

### CP-UVI-013：離線快照

| 欄位 | 內容 |
| --- | --- |
| title | 目前離線 |
| body | 以下是最後一次取得的資料（{observed_at}），可能已與目前環境不同。新的氣象資料暫時無法取得。 |
| review_status | PRODUCT_DRAFT |

### CP-UV5-001：五日預報無地區

| 欄位 | 內容 |
| --- | --- |
| eyebrow | Five-day outlook |
| title | 未來 5 天 UV |
| state_title | 設定地區後即可查看 |
| body | 這裡會顯示中央氣象署未來 5 個白日時段的區域預報；目前不顯示假數值。 |
| review_status | PRODUCT_DRAFT |

### CP-UV5-002：五日預報可用

| 欄位 | 內容 |
| --- | --- |
| title | 未來 5 天 UV |
| source | {source_name}・F-D0047-091・白日時段 |
| limitation | 這是區域預報，不是即時測站觀測；UV 高低不會延長或縮短你的補擦計時。 |
| review_status | PRODUCT_DRAFT／CONTENT_REVIEW |

### CP-UV5-003：五日預報不可用

| 欄位 | 內容 |
| --- | --- |
| title | 五日 UV 暫時無法顯示 |
| network_body | 暫時無法取得中央氣象署五日預報。 |
| offline_body | 目前離線，且這台裝置沒有仍可使用的五日預報。 |
| expired_body | 目前沒有仍在有效時段內的五日 UV 預報。 |
| primary_cta | 再試一次 |
| review_status | PRODUCT_DRAFT |

### CP-UV5-EVENING-001：晚間頁內提示

| 欄位 | 內容 |
| --- | --- |
| trigger | 裝置當地時間 18:00～05:59、有地區、有仍可使用的五日預報、同一晚間區間尚未關閉 |
| title | 晚上先看接下來 5 天 UV |
| body | {region_name} 接下來的白日時段，最高預報為 UVI {uvi}（{uvi_level}）。可以先安排遮蔭、衣物、帽子與防曬用品。 |
| primary_cta | 查看五日 UV |
| dismiss_aria | 今晚不再顯示五日 UV 提醒 |
| review_status | PRODUCT_DRAFT／CONTENT_REVIEW |

---

## 7. 地區與定位

### CP-REGION-001：定位前告知

| 欄位 | 內容 |
| --- | --- |
| screen_id | S-02 |
| title | 使用目前位置 |
| body | 按下按鈕後，系統會短暫取得位置，用來在裝置內配對所在行政區。位置不會被保存、傳送或用於分析；你也可以手動選擇或略過。 |
| primary_cta | 使用目前位置 |
| secondary_cta | 手動選擇地區 |
| tertiary_link | 暫不提供地區 |
| review_status | LEGAL_REVIEW |

### CP-REGION-002：定位中

| 欄位 | 內容 |
| --- | --- |
| title | 正在取得位置 |
| body | 取得後會在這台裝置內配對所在行政區，完成後仍需由你確認。 |
| aria_text | 正在取得目前位置。 |
| review_status | PRODUCT_DRAFT |

### CP-REGION-003：定位拒絕

| 欄位 | 內容 |
| --- | --- |
| title | 沒有取得定位權限 |
| body | 你仍可手動選擇地區，或暫不提供地區並直接使用防曬提醒。 |
| primary_cta | 手動選擇地區 |
| secondary_cta | 暫不提供地區 |
| review_status | PRODUCT_DRAFT／LEGAL_REVIEW |

### CP-REGION-004：定位不支援

| 欄位 | 內容 |
| --- | --- |
| title | 這個瀏覽器無法使用定位 |
| body | 請改用手動地區，或先不提供地區。 |
| primary_cta | 手動選擇地區 |
| secondary_cta | 暫不提供地區 |
| review_status | PRODUCT_DRAFT |

### CP-REGION-005：定位逾時

| 欄位 | 內容 |
| --- | --- |
| title | 暫時無法取得位置 |
| body | 可以再試一次、手動選擇地區，或先不提供地區。 |
| primary_cta | 再試一次 |
| secondary_cta | 手動選擇地區 |
| review_status | PRODUCT_DRAFT |

### CP-REGION-006：略過完成

| 欄位 | 內容 |
| --- | --- |
| title | 已暫不提供地區 |
| body | 暫不顯示所在地紫外線指數（UVI），但補擦提醒仍可使用。之後可隨時設定地區。 |
| review_status | PRODUCT_DRAFT |

### CP-REGION-007：定位配對待確認

| 欄位 | 內容 |
| --- | --- |
| title | 確認所在行政區 |
| body | 系統配對為 {region_name}，這次定位精度約 {accuracy_meters} 公尺。請確認後再保存。 |
| primary_cta | 確認並使用此地區 |
| review_status | PRODUCT_DRAFT／LEGAL_REVIEW |

### CP-REGION-008：行政區邊界或範圍外

| 欄位 | 內容 |
| --- | --- |
| boundary_body | 目前位置可能接近行政區邊界，請手動確認地區。 |
| outside_body | 無法將目前位置配對到臺灣行政區，請改用手動選擇。 |
| review_status | PRODUCT_DRAFT |

### CP-REGION-009：手動選擇

| 欄位 | 內容 |
| --- | --- |
| title | 手動選擇地區 |
| body | 行政區清單已保存在這台裝置，離線時也可以選擇。 |
| primary_cta | 保存手動選擇 |
| review_status | PRODUCT_DRAFT |

---

## 8. 提醒設定

### CP-SETUP-001：入口

| 欄位 | 內容 |
| --- | --- |
| title | 開始這次防曬提醒 |
| body | 依序確認目前情境、防護方式，以及適用部位的產品與塗抹時間。 |
| review_status | PRODUCT_DRAFT |

### CP-SETUP-002：恢復草稿

| 欄位 | 內容 |
| --- | --- |
| title | 繼續未完成的設定？ |
| body | 這份設定尚未建立提醒。你可以接著完成，或重新開始。 |
| primary_cta | 繼續設定 |
| secondary_cta | 重新開始 |
| review_status | PRODUCT_DRAFT |

### CP-SETUP-003：沿用最近設定

| 欄位 | 內容 |
| --- | --- |
| title | 沿用最近設定 |
| body | 可以沿用最近的情境、部位、防護方式與產品。這次的實際塗抹時間仍需要重新確認。 |
| primary_cta | 沿用並確認 |
| secondary_cta | 修改設定 |
| review_status | PRODUCT_DRAFT |

### CP-SETUP-004：情境

| 欄位 | 內容 |
| --- | --- |
| title | 你現在主要在哪種情境？ |
| options | 室內遠離直射陽光／室內近直射窗邊／一般戶外／戶外運動／水上活動 |
| primary_cta | 下一步 |
| review_status | PRODUCT_DRAFT |

### CP-SETUP-005：水上細分

| 欄位 | 內容 |
| --- | --- |
| title | 目前的水上活動狀態 |
| options | 準備下水／已在水中 |
| helper_preparing | 選擇「準備下水」不會提前開始耐水時間。 |
| helper_active | 如果已在水中，請確認實際入水時間；不確定也可以繼續，系統會採保守提醒。 |
| review_status | MEDICAL_REVIEW／PRODUCT_DRAFT |

### CP-SETUP-006：快速提醒

| 欄位 | 內容 |
| --- | --- |
| title | 快速提醒（推薦） |
| body | 已依你選擇的情境套用一組常見追蹤部位。請查看摘要；需要時可以調整，並在最後一步確認完整設定。 |
| primary_cta | null；直接顯示塗抹時間與下一步 |
| secondary_cta | 調整追蹤部位或防護方式 |
| tertiary_link | 自己選擇部位 |
| review_status | PRODUCT_DRAFT |

### CP-SETUP-007：部位方法

| 欄位 | 內容 |
| --- | --- |
| title | 這個部位目前怎麼防護？ |
| option_1 | 已擦防曬產品 |
| option_2 | 被衣物完整遮住 |
| tertiary_link | 其他情況 |
| review_status | PRODUCT_DRAFT |

`option_1`、`option_2` 與 `tertiary_link` 只在群組展開後顯示；收合狀態改用 CP-SETUP-007a。

### CP-SETUP-007a：收合狀態的群組行（2026-08-06 新增）

| 欄位 | 內容 |
| --- | --- |
| template | {groupName}　{methodLabel} |
| method_label_sunscreen | 已擦防曬 |
| method_label_clothing | 被衣物完整遮住 |
| method_label_clothing_with_sunscreen | 被衣物完整遮住 · 下方有擦防曬 |
| method_label_other_topical | 其他外用產品 |
| method_label_none | 尚未選擇 |
| review_status | PRODUCT_DRAFT |

`method_label_clothing` 系列**不得**使用 untimed 語意色（紫）。
衣物覆蓋是中性正常狀態，untimed 在本專案代表「沒有可信期限、需要處理」。
使用次要文字色即可。

### CP-SETUP-008：衣物完整覆蓋說明

| 欄位 | 內容 |
| --- | --- |
| body | 請只在這個部位被衣物、帽子或其他穿戴物完整遮住時選擇。雨傘、建築物或樹蔭不算衣物遮蔽。 |
| optional_label | 衣物下方也有擦防曬產品 |
| review_status | MEDICAL_REVIEW／PRODUCT_DRAFT |

### CP-SETUP-008a：衣物覆蓋的選填追問（2026-08-06 新增）

選擇 `被衣物完整遮住` 後就地顯示，不阻斷流程；選 `已擦防曬產品` 則不出現。

| 欄位 | 內容 |
| --- | --- |
| question | 衣物下方也有擦防曬產品嗎？（選填） |
| confirm_cta | 完成 |
| review_status | MEDICAL_REVIEW／PRODUCT_DRAFT |

本則**不得**改回第一層並列選項。PRD §5.2 第 5 點 明文禁止在第一層另列語義模糊的「兩者都有」。

### CP-SETUP-009：未確認方法

| 欄位 | 內容 |
| --- | --- |
| title | 請先選擇目前已採用的方式 |
| body | 如果無法確認已擦防曬、被衣物完整遮住或使用其他外用產品，可以返回修改或先離開；系統不會建立空的提醒。 |
| primary_cta | 返回修改 |
| secondary_cta | 先離開 |
| review_status | PRODUCT_DRAFT |

### CP-SETUP-010：選擇產品

| 欄位 | 內容 |
| --- | --- |
| title | 這次用了哪一款？ |
| helper | 選擇已保存產品，或只為這次記錄產品標示。 |
| option_session_only | 這次先不保存產品 |
| option_new | 新增防曬產品 |
| review_status | PRODUCT_DRAFT |

設定流程只列出 `gearCategory === "sunscreen"` 的紀錄——這裡要的是能建立倒數的產品，
不是整份裝備清單。`option_new` 進入 S-12 時品類預設為 `sunscreen`。

### CP-SETUP-011：確認產品身分

| 欄位 | 內容 |
| --- | --- |
| title | 包裝有明確的防曬或 SPF 標示嗎？ |
| options | 有／沒有／不確定或看不清楚 |
| helper | 請確認包裝上是否有 SPF、PA 等防曬標示；僅有品牌、成分或「天然」宣稱，無法確認這是防曬產品。 |
| review_status | MEDICAL_REVIEW／PRODUCT_DRAFT |

### CP-SETUP-012：產品身分未知

| 欄位 | 內容 |
| --- | --- |
| title | 目前無法建立產品補擦時間 |
| body | 標示確認前，系統暫時無法建立產品補擦倒數。你仍可保留這次使用紀錄，並查看其他防護方式。 |
| primary_cta | 繼續記錄 |
| secondary_cta | 返回確認標示 |
| review_status | MEDICAL_REVIEW |

### CP-SETUP-013：塗抹時間

| 欄位 | 內容 |
| --- | --- |
| title | 這些部位實際何時塗抹？ |
| options | 剛剛／15 分鐘前／30 分鐘前／1 小時前／自訂時間 |
| helper | 請確認實際時間。系統會保存絕對時間，重新開啟後再計算提醒狀態。 |
| review_status | PRODUCT_DRAFT |

### CP-SETUP-014：未來時間錯誤

| 欄位 | 內容 |
| --- | --- |
| inline_error | 塗抹時間不能晚於目前可信時間，請重新確認。 |
| review_status | PRODUCT_DRAFT |

### CP-SETUP-015：提交前確認（S-05 併頁後）

2026-08-06 裁決：S-06 廢除，本則由獨立確認頁的文案改為 S-05 固定操作列上方的確認區文案。

| 欄位 | 內容 |
| --- | --- |
| title | 確認這次提醒 |
| body | 請檢查情境、追蹤部位、防護方式、產品與實際塗抹時間。送出後仍可更正最近的紀錄。 |
| primary_cta | 開始提醒 |
| secondary_cta | 返回修改 |
| fixed_note | 顯示的時間是檢查／補擦提醒，不代表安全曝曬時間。 |
| review_status | MEDICAL_REVIEW／PRODUCT_DRAFT |

### CP-SETUP-015a：部位摘要單行

| 欄位 | 內容 |
| --- | --- |
| template | 追蹤 {zoneCount} 個部位：{zoneNames} |
| inline_cta | 調整 |
| 說明 | `zoneNames` 以大群組名稱列出，不展開原子部位。AC-34 要求摘要「已揭露」，不要求強迫捲動。 |
| review_status | PRODUCT_DRAFT |

### CP-SETUP-015b：不建立倒數的 CTA 變體

產品身分未確認（`identity_unconfirmed`）時系統不建立倒數，CTA 必須明示。

| 欄位 | 內容 |
| --- | --- |
| primary_cta | 開始提醒（不建立倒數） |
| helper | 這個產品的包裝標示還沒確認，所以不會顯示補擦倒數。你仍可以記錄防護狀態。 |
| review_status | MEDICAL_REVIEW |

**不得**在此情況沿用一般的 `開始提醒`，那會讓使用者以為有倒數。

### CP-SETUP-016：全為衣物覆蓋

| 欄位 | 內容 |
| --- | --- |
| title | 已記錄衣物覆蓋 |
| body | 已記錄為衣物完整遮蔽。目前不會為這個部位顯示產品補擦倒數；遮蔽狀態改變時，請重新回報。 |
| review_status | MEDICAL_REVIEW |

### CP-SETUP-017：建立成功

| 欄位 | 內容 |
| --- | --- |
| title | 提醒已開始 |
| body | 已依你確認的部位、方式與時間建立目前狀態。 |
| review_status | PRODUCT_DRAFT |

### CP-SETUP-018：建立失敗

| 欄位 | 內容 |
| --- | --- |
| title | 提醒尚未建立 |
| body | 資料沒有完整保存，因此這次提醒尚未開始。你的畫面輸入會暫時保留，可以修正後再試一次。 |
| primary_cta | 再試一次 |
| secondary_cta | 返回修改 |
| review_status | PRODUCT_DRAFT |

---

## 9. Session 與提醒狀態

### 共用固定說明

| copy_id | 文案 | review_status |
| --- | --- | --- |
| CP-REMINDER-NOTE-001 | 此時間是防曬檢查／補擦提醒，不代表安全曝曬時間。 | MEDICAL_REVIEW |
| CP-REMINDER-NOTE-002 | 「已記錄塗抹」代表你的自陳紀錄，不是系統驗證已足量、均勻或完整覆蓋。 | MEDICAL_REVIEW |

### CP-REMINDER-EMPTY-001

| 欄位 | 內容 |
| --- | --- |
| screen_id | S-07 |
| title | 目前沒有進行中的防曬提醒 |
| body | 建立提醒後，可以查看各部位狀態並回報洗手、游泳、流汗或擦拭等情況。 |
| primary_cta | 開始防曬提醒 |
| review_status | PRODUCT_DRAFT |

### CP-REMINDER-TRACKING-001

| 欄位 | 內容 |
| --- | --- |
| trigger | TRACKING |
| eyebrow | 提醒進行中 |
| title | {zone}約在 {relative_time}需要檢查 |
| body | 預計時間 {absolute_time}。請依產品標示使用，並搭配遮蔭、衣物、帽子或太陽眼鏡。 |
| primary_cta | 回報狀況 |
| secondary_cta | 記錄已補擦 |
| aria_text | {zone}提醒進行中，約在 {relative_time}需要檢查，預計 {absolute_time}。 |
| review_status | MEDICAL_REVIEW |

### CP-REMINDER-SOON-001

| 欄位 | 內容 |
| --- | --- |
| trigger | REAPPLY_SOON |
| eyebrow | 即將需要檢查 |
| title | {zone}接近建議補擦時間 |
| body | 晴報員提醒：可以準備補擦了。預計時間 {absolute_time}。 |
| primary_cta | 記錄已補擦 |
| secondary_cta | 回報狀況 |
| aria_text | {zone}即將需要檢查或補擦，預計 {absolute_time}。 |
| review_status | MEDICAL_REVIEW |

### CP-REMINDER-DUE-001

| 欄位 | 內容 |
| --- | --- |
| trigger | REAPPLY_DUE |
| eyebrow | 建議現在處理 |
| title | {zone}建議現在補擦 |
| body | 已到建議檢查時間。請依實際情況與產品標示確認是否重新塗抹。 |
| primary_cta | 記錄已補擦 |
| secondary_cta | 回報狀況 |
| aria_text | {zone}已到建議檢查或補擦時間。 |
| review_status | MEDICAL_REVIEW |

### CP-REMINDER-UNRECORDED-001

| 欄位 | 內容 |
| --- | --- |
| trigger | METHOD_UNRECORDED |
| eyebrow | 需要補上紀錄 |
| title | {zone}尚未記錄防護方式 |
| body | 目前沒有可用來建立提醒的防護紀錄。請確認實際採用的方式。 |
| primary_cta | 補上防護紀錄 |
| secondary_cta | 回報狀況 |
| review_status | PRODUCT_DRAFT／MEDICAL_REVIEW |

### CP-REMINDER-UNKNOWN-001

| 欄位 | 內容 |
| --- | --- |
| trigger | METHOD_UNKNOWN |
| eyebrow | 防護方式不確定 |
| title | 請確認{zone}目前的防護方式 |
| body | 防護方式尚未確認，目前會採用保守提醒，暫不顯示補擦倒數。確認防護方式後，即可建立對應的提醒時間。 |
| primary_cta | 確認防護方式 |
| secondary_cta | 回報狀況 |
| review_status | MEDICAL_REVIEW |

### CP-REMINDER-NONE-001

| 欄位 | 內容 |
| --- | --- |
| trigger | METHOD_NONE_REPORTED |
| eyebrow | 目前沒有產品補擦時間 |
| title | {zone}尚未記錄具防曬標示的產品或衣物覆蓋 |
| body | 如果只記錄其他外用產品，系統不會把它視為已記錄防曬。 |
| primary_cta | 查看防護選項 |
| secondary_cta | 更新防護紀錄 |
| review_status | MEDICAL_REVIEW |

### CP-REMINDER-PRODUCT-UNKNOWN-001

| 欄位 | 內容 |
| --- | --- |
| trigger | PRODUCT_IDENTITY_UNKNOWN |
| eyebrow | 無法計算可信時間 |
| title | {zone}使用的產品身分尚未確認 |
| body | 產品的防曬標示尚未確認，暫時無法建立產品補擦倒數。 |
| primary_cta | 查看防護選項 |
| secondary_cta | 更新防護紀錄 |
| review_status | MEDICAL_REVIEW |

### CP-REMINDER-NO-CLAIM-001

| 欄位 | 內容 |
| --- | --- |
| trigger | PRODUCT_NO_SUNSCREEN_CLAIM |
| eyebrow | 沒有產品補擦計時 |
| title | {zone}記錄的產品沒有明確防曬標示 |
| body | 這筆紀錄不會產生 120、40 或 80 分鐘期限。可以改用有清楚標示的防曬產品，或採取衣物與遮蔭等方式。 |
| primary_cta | 查看防護選項 |
| secondary_cta | 更新防護紀錄 |
| review_status | MEDICAL_REVIEW |

### CP-REMINDER-LABEL-WAIT-001

| 欄位 | 內容 |
| --- | --- |
| trigger | LABEL_WAIT_ACTIVE |
| eyebrow | 請依產品標示等待 |
| title | {zone}仍在產品標示等待時間內 |
| body | 依包裝標示等待至 {absolute_time}。期間請搭配衣物或遮蔭；等待結束不代表系統已確認防護效果或可以安全曝曬。 |
| primary_cta | 查看產品標示 |
| secondary_cta | 回報狀況 |
| aria_text | {zone}仍在產品標示等待時間內，標示等待至 {absolute_time}。 |
| review_status | MEDICAL_REVIEW |

### CP-REMINDER-CLOTHING-001

| 欄位 | 內容 |
| --- | --- |
| trigger | CLOTHING_COVERED |
| eyebrow | 已記錄衣物覆蓋 |
| title | {zone}目前被衣物完整遮住 |
| body | 目前不計算產品補擦時間。衣物移開或防護方式改變時，請更新實際狀態。 |
| primary_cta | 回報狀況 |
| secondary_cta | 更新防護方式 |
| review_status | MEDICAL_REVIEW |

### CP-REMINDER-WATER-UNKNOWN-001

| 欄位 | 內容 |
| --- | --- |
| trigger | WATER_START_UNKNOWN |
| eyebrow | 入水時間不確定 |
| title | 無法判斷{zone}剩餘的耐水時間 |
| body | 無法確認你的實際入水時間，因此不會以回報時間代替。你可以補上或更正入水時間；若仍不確定，請依產品標示保守處理。 |
| primary_cta | 處理入水時間 |
| secondary_cta | 記錄已補擦 |
| review_status | MEDICAL_REVIEW |

### CP-REMINDER-WATER-LABEL-UNKNOWN-001

| 欄位 | 內容 |
| --- | --- |
| trigger | WATER_RESISTANCE_UNKNOWN |
| eyebrow | 耐水標示不明 |
| title | 目前不建立水中 40／80 分鐘期限 |
| body | 未看到明確耐水標示，或標示看不清楚時，不能依賴系統判斷水中剩餘防護時間。 |
| primary_cta | 查看海邊防曬常見問題 |
| secondary_cta | 返回目前提醒 |
| review_status | MEDICAL_REVIEW |

### CP-REMINDER-MULTI-001

| 欄位 | 內容 |
| --- | --- |
| trigger | 多種最高優先 actionKind |
| eyebrow | 有多個部位需要處理 |
| title | 不同部位需要不同處理方式 |
| body | 請先查看各部位的原因與下一步。 |
| primary_cta | 查看需要處理的部位 |
| secondary_cta | 回報狀況 |
| review_status | PRODUCT_DRAFT |

### CP-REMINDER-CLOCK-ONLINE-001

| 欄位 | 內容 |
| --- | --- |
| trigger | CLOCK_UNTRUSTED＋online |
| eyebrow | 時間需要重新確認 |
| title | 裝置時間可能不正確 |
| body | 為避免錯誤延長提醒，請重新連線校準。目前採較短的保守狀態。 |
| primary_cta | 重新校準時間 |
| secondary_cta | 查看已保存紀錄 |
| review_status | PRODUCT_DRAFT／MEDICAL_REVIEW |

### CP-REMINDER-CLOCK-OFFLINE-001

| 欄位 | 內容 |
| --- | --- |
| trigger | CLOCK_UNTRUSTED＋offline |
| eyebrow | 目前無法校準時間 |
| title | 裝置時間可能不正確 |
| body | 目前離線，無法確認可信時間。系統不會因此延長期限，請查看保守提醒。 |
| primary_cta | 查看保守提醒 |
| secondary_cta | 查看已保存紀錄 |
| review_status | PRODUCT_DRAFT／MEDICAL_REVIEW |

### CP-REMINDER-ENDED-001

| 欄位 | 內容 |
| --- | --- |
| trigger | Session ended |
| title | 本次提醒已結束 |
| body | 結束不代表已補擦、防護完成或可以安全曝曬。需要時可以重新開始一筆新的提醒。 |
| primary_cta | 開始新的提醒 |
| review_status | MEDICAL_REVIEW |

---

## 10. 事件原因

### CP-EVENT-HAND-001

| 欄位 | 內容 |
| --- | --- |
| trigger | HAND_WASH_REPORTED |
| title | 手背可能因洗手而需要重新塗抹 |
| body | 這次回報只影響你最後確認的手背部位，不會修改臉部、耳朵、頸部或其他部位。 |
| primary_cta | 記錄已補擦 |
| secondary_cta | 更正 |
| review_status | MEDICAL_REVIEW |

### CP-EVENT-WATER-END-001

| 欄位 | 內容 |
| --- | --- |
| trigger | WATER_ENDED |
| title | 離水後請檢查受影響部位 |
| body | 已結束本次水上區間。請依產品標示及是否擦拭，確認相關部位是否需要重新塗抹。 |
| primary_cta | 記錄已補擦 |
| secondary_cta | 更正 |
| review_status | MEDICAL_REVIEW |

### CP-EVENT-SWEAT-001

| 欄位 | 內容 |
| --- | --- |
| trigger | HEAVY_SWEAT_REPORTED |
| title | 大量流汗後請檢查受影響部位 |
| body | 已依你確認的部位提前顯示補擦提醒。 |
| primary_cta | 記錄已補擦 |
| secondary_cta | 更正 |
| review_status | MEDICAL_REVIEW |

### CP-EVENT-TOWEL-001

| 欄位 | 內容 |
| --- | --- |
| trigger | TOWEL_REPORTED |
| title | 擦拭後請檢查受影響部位 |
| body | 毛巾擦拭可能影響已塗抹的產品，請依實際情況與產品標示重新處理。 |
| primary_cta | 記錄已補擦 |
| secondary_cta | 更正 |
| review_status | MEDICAL_REVIEW |

### CP-EVENT-FRICTION-001

| 欄位 | 內容 |
| --- | --- |
| trigger | FRICTION_REPORTED |
| title | 明顯摩擦後請檢查受影響部位 |
| body | 已依你最後確認的部位提前顯示補擦提醒。 |
| primary_cta | 記錄已補擦 |
| secondary_cta | 更正 |
| review_status | MEDICAL_REVIEW |

### CP-EVENT-SUBMIT-001

| 欄位 | 內容 |
| --- | --- |
| title | 回報已更新 |
| body_template | 已更新：{zones}，{event_time}。提醒狀態已依這次回報重新計算。 |
| secondary_cta | 更正 |
| review_status | PRODUCT_DRAFT |

### CP-EVENT-CORRECT-001

| 欄位 | 內容 |
| --- | --- |
| title | 更正這筆回報 |
| body | 原紀錄會保留在稽核歷史；送出後將以更正內容重新計算目前狀態。 |
| primary_cta | 確認更正 |
| secondary_cta | 取消 |
| review_status | PRODUCT_DRAFT |

### CP-EVENT-CORRECTION-CONFLICT-001

| 欄位 | 內容 |
| --- | --- |
| title | 這筆紀錄已經更新 |
| body | 目前畫面不是最新版本。請先查看最新狀態，再重新確認要更正的內容。 |
| primary_cta | 查看最新狀態 |
| review_status | PRODUCT_DRAFT |

---

## 11. 記錄已補擦

### CP-REAPPLY-001：入口

| 欄位 | 內容 |
| --- | --- |
| title | 記錄實際補擦 |
| body | 已預選目前到期或即將到期的部位。請確認實際補擦的部位、產品與時間。 |
| review_status | PRODUCT_DRAFT |

### CP-REAPPLY-001B：入口（首次記錄變體）

`complete_protection_record` 觸發時（`recordStatus === "unrecorded"`）沿用
S-08 表單，但這是**第一次記錄防護，不是補擦**。CP-REAPPLY-001 的
「記錄實際補擦」在此會說錯話，必須改用本則。

| 欄位 | 內容 |
| --- | --- |
| title | BLOCKED：待撰寫的首次記錄標題 |
| body | BLOCKED：待撰寫。須說明這些部位尚未有防護紀錄，正在補登實際使用的產品與時間，而非記錄補擦。 |
| review_status | BLOCKED／PRODUCT_DRAFT |

同理，CP-REAPPLY-003 的 `確認補擦紀錄` 與 CP-REAPPLY-004 的
`補擦紀錄已更新` 在此變體下也需要對應版本。

### CP-REAPPLY-002：選擇範圍

| 欄位 | 內容 |
| --- | --- |
| option_1 | 只選建議部位 |
| option_2 | 選擇所有本次追蹤部位 |
| option_3 | 自行調整 |
| review_status | PRODUCT_DRAFT |

### CP-REAPPLY-003：最終確認

| 欄位 | 內容 |
| --- | --- |
| title | 確認這次實際補擦 |
| body | 只有這次最後確認的部位會更新；其他部位的時間與狀態不會改變。 |
| primary_cta | 確認補擦紀錄 |
| secondary_cta | 返回修改 |
| review_status | PRODUCT_DRAFT／MEDICAL_REVIEW |

### CP-REAPPLY-004：成功

| 欄位 | 內容 |
| --- | --- |
| title | 補擦紀錄已更新 |
| body_template | 已更新：{zones}，{event_time}。其他未選部位保持原本狀態。 |
| secondary_cta | 更正 |
| review_status | PRODUCT_DRAFT |

### CP-REAPPLY-005：沒有選擇部位

| 欄位 | 內容 |
| --- | --- |
| inline_error | 請至少選擇一個實際補擦的部位。 |
| review_status | PRODUCT_DRAFT |

---

## 12. 產品狀態與我的防曬裝備

2026-08-06 裁決：S-11 由「提醒用產品主檔」擴為「防曬裝備清單」，
含 `sunscreen`／`clothing`／`eyewear`／`other_gear` 四品類。

### CP-PRODUCT-EMPTY-001

| 欄位 | 內容 |
| --- | --- |
| title | 還沒有保存的防曬裝備 |
| body | 可以新增常用的防曬產品或裝備，之後快速重用。建立提醒時也可以選擇這次先不保存產品。 |
| primary_cta | 新增防曬裝備 |
| review_status | PRODUCT_DRAFT |

### CP-PRODUCT-NEW-001

| 欄位 | 內容 |
| --- | --- |
| title | 新增防曬裝備 |
| helper | 先選擇種類。防曬乳需要確認包裝標示；品牌、名稱與其他資料可以稍後補充。 |
| primary_cta | 儲存 |
| secondary_cta | 取消 |
| review_status | PRODUCT_DRAFT |

### CP-PRODUCT-CATEGORY-001：品類選擇（2026-08-06 新增）

| 欄位 | 內容 |
| --- | --- |
| label | 這是什麼？ |
| option_sunscreen | 防曬乳／防曬產品 |
| option_clothing | 防曬衣物 |
| option_eyewear | 太陽眼鏡 |
| option_other_gear | 其他防曬裝備 |
| review_status | PRODUCT_DRAFT |

### CP-PRODUCT-CATEGORY-002：純紀錄品類說明（2026-08-06 新增）

選擇 `eyewear` 或 `other_gear` 時必須顯示，避免使用者以為記錄裝備會改變提醒。

| 欄位 | 內容 |
| --- | --- |
| body | 這筆紀錄只保存在你的裝備清單，不會建立或改變補擦提醒。 |
| review_status | MEDICAL_REVIEW |

### CP-PRODUCT-CATEGORY-003：衣物品類說明（2026-08-06 新增）

| 欄位 | 內容 |
| --- | --- |
| body | 防曬衣物可以在設定提醒時選為防護方式。被衣物完整遮住的部位不顯示補擦倒數。 |
| review_status | MEDICAL_REVIEW |

### CP-PRODUCT-FIELDS-001：新增欄位（2026-08-06 新增）

| 欄位 | 內容 |
| --- | --- |
| label_purchase_month | 購買月份 |
| label_expiry_date | 到期日 |
| label_note | 備忘 |
| label_archived | 過去用過 |
| helper_expiry_date | 只有到期日會影響提醒：過期的防曬產品不會建立補擦倒數。 |
| review_status | MEDICAL_REVIEW／PRODUCT_DRAFT |

`helper_expiry_date` 是本次擴充的關鍵安全文案——四個新欄位中只有到期日進 reducer，
其餘為純紀錄，UI 必須讓使用者分得出來。

### CP-PRODUCT-NOTE-001

| 欄位 | 內容 |
| --- | --- |
| label | 私人備註 |
| helper | 請不要輸入疾病、症狀、用藥、聯絡方式或其他敏感個資。P0 備註只保存在目前裝置。 |
| review_status | LEGAL_REVIEW |

### CP-PRODUCT-EXPIRED-001

| 欄位 | 內容 |
| --- | --- |
| trigger | PRODUCT_EXPIRED |
| title | 這項產品已超過記錄的有效期限 |
| body | 此產品已過期，無法用來建立新的補擦提醒。請改用標示可確認且未過期的產品，或採取衣物遮蔽。 |
| primary_cta | 改用其他防護 |
| secondary_cta | 查看產品資料 |
| review_status | MEDICAL_REVIEW／LEGAL_REVIEW |

### CP-PRODUCT-ABNORMAL-001

| 欄位 | 內容 |
| --- | --- |
| trigger | PRODUCT_ABNORMAL_REPORTED |
| title | 已停止使用這項產品建立提醒 |
| body | 你回報產品有異常，因此相關部位不再顯示同一產品的補擦期限。請停止使用並依包裝警語處理；需要時可詢問藥師或醫療專業人員。 |
| primary_cta | 改用其他防護 |
| secondary_cta | 查看處理說明 |
| review_status | MEDICAL_REVIEW／LEGAL_REVIEW |

### CP-PRODUCT-DISCOMFORT-001

| 欄位 | 內容 |
| --- | --- |
| trigger | PRODUCT_DISCOMFORT_REPORTED |
| title | 已停止使用這項產品建立提醒 |
| body | 你回報使用後感到不適。請停止使用並依包裝警語處理；需要時尋求醫療協助。系統不會判斷不適原因，也不會要求輸入症狀、照片或病史。 |
| primary_cta | 改用其他防護 |
| secondary_cta | 查看處理說明 |
| review_status | MEDICAL_REVIEW／LEGAL_REVIEW |

### CP-PRODUCT-SAFETY-CONFIRM-001

| 欄位 | 內容 |
| --- | --- |
| title | 確認停止使用這項產品？ |
| body | 送出後，相關部位使用同一產品的目前期限會失效，產品也不會再出現在快速選擇中。這不會刪除既有使用紀錄。 |
| primary_cta | 確認停止使用 |
| secondary_cta | 取消 |
| review_status | MEDICAL_REVIEW／LEGAL_REVIEW |

### CP-PRODUCT-RESTORE-BLOCKED-001

| 欄位 | 內容 |
| --- | --- |
| title | 這項產品不能直接恢復 |
| body | 曾回報異常或使用後不適的產品無法直接恢復。你可以改用其他產品；若為明確不同配方，可建立新的獨立紀錄。系統不判定產品是否適合個人使用。 |
| review_status | MEDICAL_REVIEW／LEGAL_REVIEW |

### CP-PRODUCT-DELETE-001

| 欄位 | 內容 |
| --- | --- |
| title | 刪除這項產品？ |
| body | 刪除後，它不會再出現在產品清單或最近設定中。既有 Session 的產品標示快照不會因此改寫。 |
| primary_cta | 刪除產品 |
| secondary_cta | 取消 |
| review_status | PRODUCT_DRAFT／LEGAL_REVIEW |

---

## 13. 離線、儲存與系統錯誤

### CP-OFFLINE-001

| 欄位 | 內容 |
| --- | --- |
| title | 目前離線 |
| body | 你可以查看本機保存的產品與提醒狀態。新的氣象資料、遠端通知與同步暫時不可用。 |
| review_status | PRODUCT_DRAFT |

### CP-STORAGE-001：一般儲存失敗

| 欄位 | 內容 |
| --- | --- |
| title | 這次變更尚未保存 |
| body | 本機儲存沒有成功，因此目前狀態尚未更新。請保留此頁並再試一次。 |
| primary_cta | 再試一次 |
| secondary_cta | 查看本機資料 |
| review_status | PRODUCT_DRAFT |

### CP-STORAGE-002：空間不足

| 欄位 | 內容 |
| --- | --- |
| title | 裝置無法保存更多資料 |
| body | 本機儲存空間可能不足，這次變更尚未保存。你可以釋放裝置空間後重試；清理本機資料前，請先確認不再需要其中的提醒紀錄。 |
| primary_cta | 查看本機資料 |
| secondary_cta | 返回 |
| review_status | PRODUCT_DRAFT |

### CP-STORAGE-003：IndexedDB 不支援

| 欄位 | 內容 |
| --- | --- |
| title | 這個瀏覽器無法保存提醒 |
| body | 目前無法使用必要的本機儲存功能，因此無法建立或載入提醒。你仍可查看可用的紫外線與一般防護資訊。 |
| primary_cta | 返回首頁 |
| review_status | PRODUCT_DRAFT |

### CP-CONTEXT-UPDATED-001

| 欄位 | 內容 |
| --- | --- |
| title | 提醒已在另一個頁面更新 |
| body | 我們已載入最新狀態，請重新確認這次操作。 |
| primary_cta | 查看最新狀態 |
| review_status | PRODUCT_DRAFT |

### CP-TIME-API-001

| 欄位 | 內容 |
| --- | --- |
| title | 暫時無法校準時間 |
| body | 暫時無法校準時間。為避免錯誤延長提醒，目前已改用保守狀態。請檢查網路連線後重試。 |
| primary_cta | 再試一次 |
| secondary_cta | 查看保守提醒 |
| review_status | PRODUCT_DRAFT／MEDICAL_REVIEW |

### CP-GENERIC-ERROR-001

| 欄位 | 內容 |
| --- | --- |
| title | 暫時無法完成 |
| body | 這次操作尚未更新。請再試一次；如果問題持續，可以保留目前資料並返回。 |
| primary_cta | 再試一次 |
| secondary_cta | 返回 |
| review_status | PRODUCT_DRAFT |

錯誤畫面不得顯示 token、堆疊、內部 event ID 或原始錯誤 payload。

---

## 14. 結束 Session 與資料清除

### CP-SESSION-END-001

| 欄位 | 內容 |
| --- | --- |
| title | 結束本次提醒？ |
| body | 結束後不再接受這次提醒的一般事件，未來的待處理提示也會停止。產品與依保存政策保留的紀錄不會被當成已補擦或防護完成。 |
| primary_cta | 結束本次提醒 |
| secondary_cta | 取消 |
| review_status | PRODUCT_DRAFT／MEDICAL_REVIEW |

### CP-SESSION-END-SUCCESS-001

| 欄位 | 內容 |
| --- | --- |
| title | 本次提醒已結束 |
| body | 這不代表已補擦、防護完成或可以安全曝曬。 |
| primary_cta | 返回提醒頁 |
| review_status | MEDICAL_REVIEW |

### CP-DATA-001：資料管理入口

| 欄位 | 內容 |
| --- | --- |
| title | 本機資料 |
| body | P0 的產品、提醒、事件與草稿保存在目前裝置。清除網站資料、解除安裝或更換裝置可能使資料消失。 |
| review_status | LEGAL_REVIEW |

### CP-DATA-CLEAR-DRAFT-001

| 欄位 | 內容 |
| --- | --- |
| title | 清除未完成的設定？ |
| body | 這會刪除目前裝置上的設定草稿，不會影響已建立的提醒。 |
| primary_cta | 清除草稿 |
| secondary_cta | 取消 |
| review_status | LEGAL_REVIEW |

### CP-DATA-CLEAR-ALL-001

| 欄位 | 內容 |
| --- | --- |
| title | 清除全部本機資料？ |
| body | 這會清除目前裝置上的產品、提醒、事件、草稿、最後氣象快照與設定。這項操作無法在本機復原。 |
| primary_cta | 清除全部資料 |
| secondary_cta | 取消 |
| review_status | LEGAL_REVIEW |

### CP-DATA-CLEAR-ACTIVE-001

| 欄位 | 內容 |
| --- | --- |
| title | 目前仍有進行中的提醒 |
| body | 清除全部資料會同時結束並移除這次本機提醒。這不代表已補擦或防護完成。 |
| primary_cta | 結束並清除全部資料 |
| secondary_cta | 取消 |
| review_status | LEGAL_REVIEW／MEDICAL_REVIEW |

### CP-DATA-CLEAR-SUCCESS-001

| 欄位 | 內容 |
| --- | --- |
| title | 本機資料已清除 |
| body | 已清除你最後確認範圍內的資料。 |
| review_status | PRODUCT_DRAFT／LEGAL_REVIEW |

### CP-DATA-CLEAR-FAIL-001

| 欄位 | 內容 |
| --- | --- |
| title | 資料尚未完全清除 |
| body | 清除操作沒有完整成功。請不要把目前畫面視為已清除，可以再試一次。 |
| primary_cta | 再試一次 |
| review_status | LEGAL_REVIEW |

---

## 15. 特殊狀況與醫療邊界

本節全部需要有效醫療及台灣法務審查。紅旗條件與 119／就醫文字不得由工程端補寫。

### CP-SPECIAL-001：入口

| 欄位 | 內容 |
| --- | --- |
| screen_id | S-17 |
| title | 我有特殊狀況 |
| body | 請選擇最接近的情況。這次選擇只用來顯示相應說明，預設不保存、不上傳，也不會改變提醒分鐘數。 |
| review_status | MEDICAL_REVIEW／LEGAL_REVIEW |

### CP-SPECIAL-002：醫師避光、用藥或療程

| 欄位 | 內容 |
| --- | --- |
| title | 請以你的個別醫囑為優先 |
| body | 本服務不提供診斷或治療建議，也不能判斷你能否曝曬、應等待多久或特定產品是否適合。請依醫師、藥袋或原療程院所的個別指示。 |
| primary_cta | 返回 |
| secondary_cta | 結束本次提醒 |
| review_status | MEDICAL_REVIEW／LEGAL_REVIEW |

### CP-SPECIAL-003：個別醫療問題拒答

| 欄位 | 內容 |
| --- | --- |
| title | 這個問題需要個別專業判斷 |
| body | 本服務無法根據症狀、自述或照片判斷能否曬太陽、能否使用某項產品或需要等待多久。請依醫囑，或詢問醫師、皮膚科醫師或原療程院所。 |
| primary_cta | 返回 |
| review_status | MEDICAL_REVIEW／LEGAL_REVIEW |

### CP-SPECIAL-004：破損、起泡或嚴重曬傷

| 欄位 | 內容 |
| --- | --- |
| title | BLOCKED：待核准的皮膚狀況標題 |
| body | BLOCKED：待醫療專業人員核准的照護與就醫文字。不得將一般補擦流程套用到破損處。 |
| primary_cta | BLOCKED：待核准的主要行動 |
| review_status | BLOCKED／MEDICAL_REVIEW／LEGAL_REVIEW |

### CP-SPECIAL-005：急症紅旗

| 欄位 | 內容 |
| --- | --- |
| trigger | 命中有效醫療審查版本的 redFlagCodes |
| title | BLOCKED：待核准的急症標題 |
| body | BLOCKED：待台灣醫療與法務共同核准的急症分流文字。 |
| primary_cta | BLOCKED：待核准的台灣 119／緊急就醫主要行動 |
| secondary_content | 一般免責只能放在主要緊急行動之後 |
| review_status | BLOCKED／MEDICAL_REVIEW／LEGAL_REVIEW |

### 發布限制

- CP-SPECIAL-004、005 任一仍為 `BLOCKED` 時，不得公開特殊狀況流程。
- 最低必要急症文字必須包含於離線 App Shell。
- 不得要求疾病名稱、病理、處方、病史、症狀自由文字或照片。
- 急症主要行動永遠優先於 `開始提醒`、`記錄已補擦` 或產品選擇。

---

## 16. 隱私與個資

### CP-PRIVACY-001：短版

| 欄位 | 內容 |
| --- | --- |
| title | 你的資料如何使用 |
| body | 我們只會在提供你所選功能的必要範圍內處理資料。你可以不用精確定位，改用手動地區或暫不提供地區；沒有地區仍可使用防曬提醒。 |
| primary_cta | 查看個資告知事項 |
| review_status | LEGAL_REVIEW |

### CP-PRIVACY-002：安全限制

| 欄位 | 內容 |
| --- | --- |
| body | 我們會使用傳輸加密、儲存保護與存取控制降低風險，但任何系統都無法保證零風險。 |
| review_status | LEGAL_REVIEW |

### CP-PRIVACY-003：法定權利摘要

| 欄位 | 內容 |
| --- | --- |
| body | 你可依法行使查詢或閱覽、取得複製本、補充或更正、停止蒐集／處理／利用，以及請求刪除等權利。實際程序、聯絡方式、處理期限與依法可能拒絕的例外，請查看《個資告知事項》。 |
| review_status | LEGAL_REVIEW |

### CP-PRIVACY-004：P0 匯出限制

| 欄位 | 內容 |
| --- | --- |
| body | P0 提供本機資料查看、更正與清除。帳號資料匯出是後續 P1 功能，且不取代你依法可行使的個資權利。 |
| review_status | LEGAL_REVIEW |

### BLOCKED 法律欄位

正式個資告知仍需補齊並核准：

- 蒐集者正式名稱。
- 聯絡方式及權利申請窗口。
- 蒐集目的與資料類別。
- 使用期間、地區、對象及方式。
- P0 實際第三方處理者。
- 保存期限。
- 權利行使程序與處理期限。
- 依法得拒絕的例外。

缺少上述資料時，正式個資告知頁維持 `BLOCKED`。

---

## 17. PWA、前景提示與安裝

### CP-INSTALL-001：安裝入口

| 欄位 | 內容 |
| --- | --- |
| title | 安裝到手機 |
| body | 安裝後可以從主畫面開啟，並使用已快取的 App Shell。P0 不會因安裝而保證關閉頁面後準時通知。 |
| review_status | PRODUCT_DRAFT／LEGAL_REVIEW |

### CP-INSTALL-ANDROID-001

| 欄位 | 內容 |
| --- | --- |
| title | 在 Android 安裝 |
| steps | 1. 使用 Chrome 開啟防曬晴報員。 2. 點選「安裝到手機」；如果沒有顯示，開啟瀏覽器選單。 3. 選擇「安裝應用程式」或「加到主畫面」。 4. 依畫面完成確認。 |
| note | 選單名稱可能因手機品牌與瀏覽器版本略有不同。 |
| review_status | PRODUCT_DRAFT |

### CP-INSTALL-IOS-001

| 欄位 | 內容 |
| --- | --- |
| title | 在 iPhone 安裝 |
| steps | 1. 使用 Safari 開啟防曬晴報員。 2. 點選「分享」。 3. 選擇「加入主畫面」。 4. 點選「新增」，再從主畫面開啟。 |
| review_status | PRODUCT_DRAFT |

### CP-INSTALL-UNSUPPORTED-001

| 欄位 | 內容 |
| --- | --- |
| title | 目前沒有可用的安裝提示 |
| body | 你仍可直接使用一般網頁。安裝不是查看 UV 或使用 P0 前景提醒的必要條件。 |
| review_status | PRODUCT_DRAFT |

### CP-FOREGROUND-ALERT-001

| 欄位 | 內容 |
| --- | --- |
| title | 前景提示音與震動 |
| body | 預設為關閉。明確啟用並完成目前裝置測試後，App 開啟時可能依瀏覽器、裝置與系統設定播放短提示音或震動。 |
| primary_cta | 測試目前裝置 |
| review_status | PRODUCT_DRAFT／LEGAL_REVIEW |

### CP-FOREGROUND-ALERT-UNSUPPORTED-001

| 欄位 | 內容 |
| --- | --- |
| title | 這個裝置無法使用此提示 |
| body | 視覺提醒仍可使用。系統不會因聲音或震動不支援而中斷核心提醒。 |
| review_status | PRODUCT_DRAFT |

### CP-NOTIFICATION-LIMIT-001

| 欄位 | 內容 |
| --- | --- |
| body | 通知可能因手機、網路或系統設定而延遲。P0 只提供 App 開啟期間的前景提醒與重新開啟後的狀態恢復。 |
| review_status | PRODUCT_DRAFT／LEGAL_REVIEW |

---

## 18. Q&A 總覽與內容入口

2026-08-06 裁決：Q&A 由單一主題頁擴為「總覽＋主題」兩層，且**只做 App 內**，
不做公開索引、SEO 或 GEO。

### CP-HELP-INDEX-001：Q&A 總覽（2026-08-06 新增）

| 欄位 | 內容 |
| --- | --- |
| title | 常見問題 |
| body | 這些內容說明防曬產品、提醒時間與使用限制。閱讀不會修改目前的提醒狀態。 |
| item_beach | 海邊防曬常見問題 |
| item_how_it_works | 防曬晴報員怎麼運作 |
| secondary_cta | 返回 |
| review_status | PRODUCT_DRAFT |

總覽**只列出已通過審查且可發布的主題**。未核准的主題不佔位、不顯示灰階項目，
避免使用者以為內容即將出現。每則主題的審查狀態沿用該則自己的標記
（`CONTENT_REVIEW`／`MEDICAL_REVIEW`／`MARINE_REVIEW`），總覽不覆寫。

### CP-HELP-INDEX-002：總覽無可發布主題

| 欄位 | 內容 |
| --- | --- |
| title | 目前沒有可查看的內容 |
| body | 說明內容尚未完成必要審查。這不影響提醒功能。 |
| primary_cta | 返回 |
| review_status | PRODUCT_DRAFT |

### CP-BEACH-ENTRY-001

| 欄位 | 內容 |
| --- | --- |
| title | 海邊防曬常見問題 |
| body | 查看下水前、離水後、擦拭、耐水標示與純椰子油等說明。閱讀內容不會修改目前提醒。 |
| primary_cta | 查看常見問題 |
| secondary_cta | 返回 |
| review_status | MULTI_REVIEW：醫療／海洋／法務 |

### CP-BEACH-BLOCKED-001

| 欄位 | 內容 |
| --- | --- |
| title | 內容正在審查 |
| body | 這份海邊防曬內容尚未完成必要審查，因此目前不提供未核准版本。 |
| primary_cta | 返回 |
| review_status | PRODUCT_DRAFT |

`FAQ_BEACH_SUN_V1` 的八則正式答案直接引用 PRD 第 13.4 節的核准版本，不在本 Copy Deck 建立不同副本，避免兩處內容漂移。

---

## 19. 說明中心

### CP-HELP-HOW-001

| 欄位 | 內容 |
| --- | --- |
| title | 防曬晴報員怎麼運作？ |
| body | 有地區資料時，系統顯示中央氣象署最近可用的測站觀測或區域預報。你自行確認部位、防護方式、產品標示與塗抹時間後，系統依產品標示和你回報的事件建立逐部位提醒。 |
| review_status | MULTI_REVIEW |

### CP-HELP-TIMER-001

| 欄位 | 內容 |
| --- | --- |
| title | 倒數時間怎麼運作？ |
| body | 系統保存建議檢查／補擦的絕對時間。畫面開啟時，再用目前可信時間計算剩餘時間。倒數不是防曬失效的精確時間，也不代表歸零前一定不會曬傷。 |
| review_status | MEDICAL_REVIEW |

### CP-HELP-TIMER-002

| 欄位 | 內容 |
| --- | --- |
| body | 不同部位可以有不同期限。局部補擦只更新最後確認的部位；游泳、流汗、擦拭或摩擦可能讓受影響部位提前需要處理。 |
| review_status | MEDICAL_REVIEW |

### CP-HELP-TIMER-003

| 欄位 | 內容 |
| --- | --- |
| body | 頁面關閉時不依賴背景 JavaScript 每秒倒數。重新開啟後，系統會依保存的時間戳重算目前狀態。 |
| review_status | PRODUCT_DRAFT |

---

## 20. 通用成功摘要模板

| copy_id | 觸發 | 文案模板 | review_status |
| --- | --- | --- | --- |
| CP-SUCCESS-001 | Session 建立 | 提醒已開始：{zones}。 | PRODUCT_DRAFT |
| CP-SUCCESS-002 | 局部補擦 | 已更新：{zones}，{event_time}。其他部位保持原本狀態。 | PRODUCT_DRAFT |
| CP-SUCCESS-003 | 事件回報 | 回報已更新：{zones}，{event_time}。 | PRODUCT_DRAFT |
| CP-SUCCESS-004 | 方法更新 | 防護方式已更新：{zones}。 | PRODUCT_DRAFT |
| CP-SUCCESS-005 | 更正完成 | 更正已更新，目前狀態已重新計算。 | PRODUCT_DRAFT |
| CP-SUCCESS-006 | 產品保存 | 防曬品已保存到目前裝置。 | PRODUCT_DRAFT |
| CP-SUCCESS-007 | 顯示偏好 | 顯示設定已保存。 | PRODUCT_DRAFT |

成功摘要必須列出實際更新範圍，不得用「全部完成」或「防護完成」。

---

## 21. 通用無障礙文案

### 相對與絕對時間

```text
{zone}約在 {relative_time}需要檢查，預計 {absolute_time}。
```

### 到期

```text
{zone}已到建議檢查或補擦時間。
```

### 事件變更

```text
提醒狀態已更新。{zone}，原因：{approved_reason_text}。
```

規則：

- 不逐秒更新 live region。
- 只在進入即將到期、到期、事件變更或使用者主動聚焦時宣告。
- 圖示的 accessible name 不重複朗讀相同狀態。
- `aria_text` 不得包含內部 reasonCode。

---

## 22. reasonCode 映射

| reasonCode | 使用者短標籤 | 詳細 copy_id |
| --- | --- | --- |
| CLOCK_UNTRUSTED | 裝置時間可能不正確 | CP-REMINDER-CLOCK-ONLINE-001／OFFLINE-001 |
| PRODUCT_EXPIRED | 產品已超過記錄的有效期限 | CP-PRODUCT-EXPIRED-001 |
| PRODUCT_ABNORMAL_REPORTED | 已回報產品異常 | CP-PRODUCT-ABNORMAL-001 |
| PRODUCT_DISCOMFORT_REPORTED | 已回報使用後不適 | CP-PRODUCT-DISCOMFORT-001 |
| PRODUCT_NO_SUNSCREEN_CLAIM | 產品沒有明確防曬標示 | CP-REMINDER-NO-CLAIM-001 |
| PRODUCT_IDENTITY_UNKNOWN | 產品身分尚未確認 | CP-REMINDER-PRODUCT-UNKNOWN-001 |
| METHOD_UNRECORDED | 尚未記錄防護方式 | CP-REMINDER-UNRECORDED-001 |
| METHOD_NONE_REPORTED | 尚未記錄具防曬標示的產品或衣物覆蓋 | CP-REMINDER-NONE-001 |
| METHOD_UNKNOWN | 防護方式不確定 | CP-REMINDER-UNKNOWN-001 |
| WATER_START_UNKNOWN | 入水時間不確定 | CP-REMINDER-WATER-UNKNOWN-001 |
| WATER_RESISTANCE_UNKNOWN | 耐水標示不明 | CP-REMINDER-WATER-LABEL-UNKNOWN-001 |
| WATER_ENDED | 已記錄離水 | CP-EVENT-WATER-END-001 |
| HEAVY_SWEAT_REPORTED | 已記錄大量流汗 | CP-EVENT-SWEAT-001 |
| TOWEL_REPORTED | 已記錄擦拭 | CP-EVENT-TOWEL-001 |
| FRICTION_REPORTED | 已記錄明顯摩擦 | CP-EVENT-FRICTION-001 |
| HAND_WASH_REPORTED | 已記錄洗手 | CP-EVENT-HAND-001 |
| GENERAL_INTERVAL_REACHED | 已到一般建議檢查時間 | CP-REMINDER-DUE-001 |
| WATER_INTERVAL_REACHED | 已到耐水標示提醒時間 | CP-REMINDER-DUE-001 |
| LABEL_WAIT_ACTIVE | 仍在產品標示等待時間內 | CP-REMINDER-LABEL-WAIT-001 |
| CLOTHING_COVERED | 已記錄衣物覆蓋 | CP-REMINDER-CLOTHING-001 |
| SESSION_ENDED | 本次提醒已結束 | CP-REMINDER-ENDED-001 |

---

## 23. 文案長度目標

| 元件 | 目標 |
| --- | --- |
| 頁面標題 | 8–18 個中文字，必要時可更長但不得截斷 |
| 狀態 eyebrow | 4–10 個中文字 |
| 主要卡標題 | 10–24 個中文字 |
| 卡片 body | 1–3 句，每句優先不超過 32 個中文字 |
| 主要 CTA | 2–10 個中文字 |
| 次要 CTA | 2–12 個中文字 |
| Inline error | 一句說明問題與修正方式 |
| Toast／success | 必須含實際更新範圍，不只顯示「成功」 |

這些是可讀性目標，不得為符合字數而刪除安全限制、原因或必要行動。

---

## 24. 發布 Gate

### 24.1 文案發布必要條件

1. `copy_id` 唯一且有版本。
2. 觸發條件與 reasonCode／畫面狀態一致。
3. 主要 CTA 與 `primaryAction.actionKind` 一致。
4. 變數都有安全缺值處理。
5. 健康文案具有有效 claim IDs、審查者、資格範圍與日期。
6. 隱私文案具有正式蒐集者、聯絡方式及權利程序。
7. 海洋內容完成醫療、海洋環境與法務審查。
8. 急症 redFlagCodes、119／就醫文字及離線內容完成台灣醫療與法務核准。
9. 無障礙名稱不重複、不逐秒朗讀。
10. 360 CSS px 與文字放大 200% 下 CTA 和重要限制不截斷。

### 24.2 必須阻擋發布的項目

- 任一畫面出現 `BLOCKED`、未替換 placeholder 或內部 reasonCode。
- 健康／海洋 claim 缺來源或超過再審日期。
- 隱私頁缺蒐集者、聯絡方式或權利程序。
- 急症主要動作尚未核准。
- 文案宣稱安全曝曬、保證不曬傷、保證通知、完全離線或零風險。
- 文案使使用者誤認登入、定位或安裝是 P0 核心功能的必要條件。

---

## 25. 後續待辦

1. 為所有 `MEDICAL_REVIEW` 文案建立 Claim Registry 關聯。
2. 指定正式蒐集者及聯絡方式，完成個資告知頁。
3. 完成特殊狀況 redFlagCodes、皮膚狀況與台灣急症文字審查。
4. 核准 `FAQ_BEACH_SUN_V1` 並填入 `reviewedAt／nextReviewAt`。
5. 在 prototype 中驗證主要提醒、錯誤與無時間狀態是否易懂。
6. 建立 `P0_REQUIREMENT_TRACEABILITY_MATRIX.md`，串接 copy IDs、畫面、規則、AC 與測試。
