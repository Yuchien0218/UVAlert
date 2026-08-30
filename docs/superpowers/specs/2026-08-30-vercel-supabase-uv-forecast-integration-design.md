# Vercel 前端與 Supabase UV 預報串接設計

**日期**：2026-08-30

**狀態**：產品端已確認架構方向；待使用者審閱本文件後進入實作計畫

**適用範圍**：UVAlert Vue／Vite PWA 的中央氣象署五日 UV 預報串接

## 1. 決策摘要

UVAlert 維持既有的前後端分工：

- **Vercel** 託管 Vue／Vite 前端、PWA 靜態資產、公開衛教頁與 SPA 路由。
- **Supabase** 執行 `uv-forecast` Edge Function、保存 `uv_forecast_cache`，並保管 CWA API 授權碼。
- 前端直接呼叫 Supabase Edge Function URL，不新增 Vercel Function，也不使用 Vercel rewrite 代理 UV API。
- 中央氣象署授權碼只存在 Supabase project secrets，不進入 `VITE_*`、前端 bundle、Git、回應或日誌。

Supabase managed platform 不作為本專案的前端 HTML 託管平台。Edge Functions 與 Storage 均不是 Vue SPA／PWA 的替代 hosting；因此不把前端從 Vercel 搬到 Supabase。

## 2. 目標與成功條件

### 2.1 目標

1. 讓 Vercel 上的 UVAlert 可取得中央氣象署 `F-D0047-091` 五日 UV 預報。
2. 沿用既有 `FiveDayUvForecast` contract、UV controller 與 IndexedDB 快取。
3. 讓正式 API endpoint 可由環境變數設定，而非寫死在 Vue 元件或 controller。
4. 保持免登入、本機倒數與離線操作不依賴 Supabase。
5. 以分批、可測試、可回復的方式完成串接與部署。

### 2.2 成功條件

- Vercel production 的 `/forecast` 能顯示所選行政區的真實 CWA 預報。
- 首頁與頁首使用同一份 UV controller 狀態，不自行重抓或編造數字。
- 有效 Supabase cache 可直接回傳；cache miss 才呼叫 CWA。
- CWA、Supabase 或網路失敗時，前端使用仍可用的 IndexedDB 快取；無快取時顯示不可用狀態，不顯示 UVI 0。
- CWA API key 不出現在瀏覽器 Network request、前端產物、source map、Git 或使用者可見錯誤。
- 聚焦測試、web typecheck、完整 `pnpm check` 與 production build 通過。

## 3. 非範圍

本次不處理：

- 將 Vue／Vite 前端從 Vercel 搬到 Supabase Storage 或 Edge Functions。
- 新增 Vercel Function 或其他 API gateway。
- Google OAuth、跨裝置同步、feedback 或 account-delete 的正式上線。
- 改變 UV 分級、提醒公式、頁面資訊架構或視覺設計。
- 儲存精確經緯度；後端只接收既有的八碼行政區代碼。
- 新增其他天氣供應商或在 CWA 失敗時混用第三方預報。

## 4. 架構與資料流

```text
使用者瀏覽器
  └─ Vercel：Vue／Vite／PWA
       └─ BrowserUvForecastClient
            └─ GET {VITE_API_BASE_URL}/uv-forecast?regionCode={TOWNCODE}
                 └─ Supabase Edge Gateway
                      └─ uv-forecast Edge Function
                           ├─ 有效 uv_forecast_cache → 回傳 contract
                           └─ cache miss／expired
                                └─ CWA F-D0047-091
                                     └─ 驗證、轉換、寫入 cache、回傳 contract
```

前端收到資料後仍由既有 `createUvForecastController`：

1. 依 `FiveDayUvForecastSchema` 驗證 response。
2. 篩選仍可使用的預報日。
3. 保存至 `LocalWeatherForecastRepository`。
4. 在重新連線、回到前景或使用者切換行政區時更新。

頁面不直接呼叫 Supabase SDK 或 CWA API。

## 5. URL 與環境設定契約

### 5.1 前端

`VITE_API_BASE_URL` 代表產品 API 的 base URL，不含功能名稱：

```dotenv
VITE_API_BASE_URL=https://<project-ref>.supabase.co/functions/v1
```

正式 UV endpoint 為：

```text
https://<project-ref>.supabase.co/functions/v1/uv-forecast?regionCode=63000010
```

URL 正規化規則：

- 去除 base URL 頭尾空白。
- 去除 base URL 結尾的 `/`，再接上 `/uv-forecast`。
- 未設定或只有空白時，fallback 為既有同源 `/v1/uv/forecast`，保留本機 proxy 與既有測試能力。
- 不接受把完整 `uv-forecast` endpoint 同時放進 base URL；避免組出重複路徑。

`VITE_SUPABASE_URL` 與 `VITE_SUPABASE_PUBLISHABLE_KEY` 保留給 Auth／Sync adapter。本次公開 UV GET endpoint 不依賴使用者登入，也不要求前端為它附加 service-role key。

### 5.2 Supabase secrets

Supabase production project 至少需要：

```text
CWA_API_KEY
ALLOWED_ORIGINS
```

`ALLOWED_ORIGINS` 必須明確列出：

- Vercel production origin。
- 經產品端核准、確實需要測試的 preview origin。
- 本機開發 origin。

不使用 `*` 搭配 production。`SUPABASE_URL` 與 `SUPABASE_SERVICE_ROLE_KEY` 由 Supabase runtime 提供；若部署環境未提供，Function 回傳受控的 server configuration error。

## 6. API 與安全契約

### 6.1 Request

```http
GET /functions/v1/uv-forecast?regionCode=<eight-digit-town-code>
Accept: application/json
```

- endpoint 不需 Google 登入。
- Function deployment 設定必須明確允許公開呼叫。
- `regionCode` 必須是非全零的八碼行政區代碼；CWA mapping 仍會確認回應內存在相同 Geocode。
- Function 必須處理 `OPTIONS` CORS preflight。

### 6.2 Response

成功回傳既有 `FiveDayUvForecast` contract。錯誤維持既有 JSON error envelope，不回傳 CWA 原始 payload、授權碼或 Supabase service-role 資訊。

| 狀況 | HTTP | 前端行為 |
| --- | ---: | --- |
| 輸入格式錯誤或找不到行政區 | 422 | 顯示所選地區暫無預報，保留本機功能 |
| CWA HTTP／網路失敗 | 503 | 使用可用 IndexedDB 快取；否則顯示不可用 |
| CWA 回應格式無法轉換 | 502／503 | 不寫入 cache、不顯示 UVI 0 |
| Function secrets 未設定 | 500 | 顯示服務未完成設定，不暴露缺少哪個 secret 的值 |
| Supabase cache 讀取失敗 | 500 | 不偽造資料 |
| cache 寫入失敗但 CWA 資料有效 | 200 | 回傳已驗證的即時資料，本次略過 server cache |

## 7. 快取與離線策略

### 7.1 Supabase cache

- key：`region_code`。
- 只保存通過 mapping 與 contract 驗證的 payload。
- 以 `usable_until` 判斷是否可直接回傳。
- cache miss 或過期才呼叫 CWA。
- 可使用 CWA `ETag`／`If-None-Match`；304 時更新取得時間與可用期限，但仍須重新驗證既有 payload。
- `uv_forecast_cache` 不授予 anon／authenticated 直接查詢；只能由 Edge Function 的受控 server client 存取。

### 7.2 IndexedDB cache

- 每台裝置自行保存最後一次有效 forecast。
- 不納入第一版跨裝置同步。
- 線上請求失敗時，只使用仍含 upcoming forecast days 的 snapshot。
- UI 必須標示 cached 狀態，不把舊資料冒充為即時資料。

## 8. 分批交付

### 第一批：可設定的前端 API 邊界

- 讓 `BrowserUvForecastClient` 使用經正規化的 `VITE_API_BASE_URL`。
- 保留未設定時的 `/v1` fallback。
- 補上空白值、結尾斜線、完整 Supabase base URL 與自訂 endpoint 測試。
- 不部署、不讀取或寫入真實 secret。

驗收：adapter 聚焦測試與 `@sunshield/web` typecheck 通過。

### 第二批：Supabase UV Function 邊界與測試

- 在 `supabase/config.toml` 明確設定 `uv-forecast` 的公開存取策略。
- 補足 cache hit、cache miss、304、上游錯誤、cache 寫入錯誤與 CORS 測試。
- 保持既有 CWA mapping 與 contract，不做無關重構。

驗收：CWA helper、Function handler、contract 測試通過。

### 第三批：部署準備與文件

- 確認 migration、RLS、seed 與 secrets 範例可重現。
- 文件化 Supabase link、migration、function deploy、secret 與 Vercel env 設定順序。
- 文件分開記錄「程式已準備」和「production 已驗證」。

驗收：新開發者可依文件完成部署，不需要取得 repo 內的真實密鑰。

### 第四批：正式串接

需要使用者提供或授權使用既有 Supabase project，並由使用者在安全介面設定 CWA API key。

- 連結正確的 Supabase project。
- 套用 migration。
- 設定 secrets。
- 部署 `uv-forecast`。
- 在 Vercel production／核准 preview 設定 `VITE_API_BASE_URL` 並重新部署。
- 以真實八碼行政區代碼 smoke test。

驗收：Vercel production 的 `/forecast` 顯示真實 CWA 資料；瀏覽器看不到 CWA key。

### 第五批：韌性與完整驗證

- 驗證 cache hit、離線 snapshot、CWA 失敗、無地區、過期資料與恢復連線。
- 驗證 PWA 靜態資產、SPA deep link 與本機倒數未受影響。
- 執行完整 `pnpm check` 與 production build。
- 將實測 production URL、時間、結果與限制寫回部署狀態文件。

驗收：正常、離線與上游失敗均符合本規格，且沒有把 preview 成功誤寫成 production 已上線。

## 9. 測試策略

### 9.1 前端單元測試

- 預設 endpoint。
- 空白 `VITE_API_BASE_URL` fallback。
- Supabase base URL 有／無結尾斜線。
- 非 2xx response。
- response 不符合 `FiveDayUvForecastSchema`。
- live response 成功但 IndexedDB 寫入失敗。
- network／offline 時 cached 與 unavailable 分支。

### 9.2 Function 測試

- `OPTIONS`、非 GET、非法 region code。
- 有效 cache 不呼叫 CWA。
- cache miss 呼叫 CWA、驗證、upsert、回傳。
- malformed cache 被忽略並重抓。
- CWA 304 搭配有效／無效 cache。
- CWA 401、429、5xx 與無法解析 JSON。
- cache read failure、write failure。
- response 與錯誤不包含 secrets。

### 9.3 部署 smoke test

- Supabase Function URL 直接 GET。
- Vercel production 從瀏覽器成功跨來源 GET，CORS header 與 origin 完全相符。
- `/forecast`、首頁 UV 狀態與行政區切換。
- 第二次相同行政區請求驗證 cache hit。
- 暫時模擬上游不可用，確認不顯示 UVI 0。

## 10. 回復策略

- 若 Supabase production endpoint 異常，可在 Vercel 移除或清空 `VITE_API_BASE_URL` 並重新部署，使前端回到既有同源 `/v1` fallback；本機提醒仍可運作。
- Function 部署失敗不改變 IndexedDB schema 或提醒資料。
- migration 只建立／維護既有 `uv_forecast_cache`，不執行破壞性資料刪除。
- 不以修改 CWA key、關閉 CORS 安全檢查或把 service-role key 放入前端作為臨時解法。

## 11. 實作限制

- 保留 Vue 3 Composition API、TypeScript、controller／adapter／port 分層。
- Vue 頁面維持薄層，不在 `ForecastPage.vue` 或 `HomePage.vue` 新增 fetch 邏輯。
- 不修改 `packages/domain` 的提醒規則。
- 不手改既有產生檔。
- 不碰與本功能無關的 UI、CSS 或工作樹變更。
- 每一批獨立測試、審閱與提交；未取得部署所需權限時，停在已驗證的程式與文件，不宣稱 production 已串通。
