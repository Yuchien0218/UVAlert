# 規劃筆記（不是交付物）

## 本輪四項裁決
1. 帳號：P0 不做登入。改以 PWA 安裝 + 本機資料管理 + 誠實告知。建議加本機匯出。
2. Q&A：只做 App 內，不做 SEO/GEO。P0-15 擴成 Q&A 總覽。
3. 設定：3 步併 2 步。S-06 內容併入 S-05，CTA 改「開始提醒」。
4. 產品頁：做成防曬裝備清單（含裝備類、購買月份、到期日、備忘、過去用過）。

## 設定流程新結構
- S-03 情境 → CTA 下一步
- S-05 部位摘要 + 塗抹時間 + 產品警示 + 免責 → CTA 開始提醒（計時起點）
- S-06 廢除為獨立頁

S-06 原有必顯內容要搬到 S-05：
- 情境與水上狀態
- 追蹤部位大群組（S-05 已有）
- 每部位方法
- 產品/snapshot 摘要
- 塗抹時間（S-05 已有）
- 曝曬前等待、較短補擦、耐水標示
- 過期/異常/不適/身分未知/非防曬的顯眼警示
- 「提醒期限不是安全曝曬時間」

## 產品頁新結構
品類：sunscreen / clothing / eyewear / other_gear
- sunscreen：進 reducer（到期、耐水、補擦間隔、等待）
- clothing：是 methodComponent，有提醒語意（覆蓋期間不倒數）
- eyewear：無對應 BODY_ZONE，純紀錄
- other_gear：純紀錄

新欄位（皆不進 reducer，除到期日）：
- purchaseMonth
- expiryDate（真日期，取代/補充 expiryStatus）
- note 備忘
- archivedAt 過去用過

## Q&A 結構
/help 總覽 → /help/beach 海邊防曬、/help/how-it-works 運作說明、其他主題待定
每則需 Copy Deck 審查狀態（CONTENT_REVIEW / MEDICAL_REVIEW / MARINE_REVIEW）
