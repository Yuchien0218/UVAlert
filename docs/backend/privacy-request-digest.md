# 私有隱私請求摘要操作手冊

本手冊只描述非機密設定名稱、安全操作順序與可公開保存的驗證欄位。它不是正式部署完成證據，也不得加入真實 Gmail、API key、Cron 密鑰或使用者 feedback 內容。

## 安全邊界

- `privacy-digest` 僅接受 `POST`，且即使 `verify_jwt = false`，仍必須先通過 `X-Privacy-Digest-Secret` 才能 claim 資料。
- digest 資料表與 claim／settle／cleanup RPC 只允許 `service_role`；瀏覽器、`anon` 與 `authenticated` 不得直接存取。
- `privacy_request` 的 `contact_email` 維持選填；未提供 Email 的案件仍需進入摘要。
- 每個 batch 使用穩定的 `privacy-digest:<batch-id>` 冪等鍵；只有 Resend 成功且 settle 成功後才可視為已寄送。
- 空 queue 必須回傳 no-op，不得寄空信。Log 只記錄固定錯誤碼，不得記錄收件者、密鑰、完整留言或 provider 回應內容。
- 不啟用開信或點擊追蹤。所有隱私請求及相依 digest 記錄於 90 天後由 cleanup 移除。

## Secret 名稱與保管規則

### Function Secrets

- `RESEND_API_KEY`：Resend 僅寄信權限 API key。
- `PRIVACY_DIGEST_RECIPIENT`：營運者私有 Gmail；不得出現在截圖、commit、公開文件、Log 或聊天內容。
- `PRIVACY_DIGEST_SECRET`：Cron 專用高熵密鑰；不得和瀏覽器、`VITE_*` 或 Vercel environment variable 共用。

既有 Supabase Function 執行環境仍需提供 `SUPABASE_URL` 與 `SUPABASE_SERVICE_ROLE_KEY`；這兩者不是本功能新增的人工值，也不得複製到公開文件或前端。

### Vault

- `uvalert_project_url`：現有 Supabase project URL。
- `uvalert_privacy_digest_secret`：必須與 `PRIVACY_DIGEST_SECRET` 完全相同。

所有值只由使用者在各服務的私有介面輸入。不要貼到終端命令參數、shell history、截圖、Git、Issue、PR、Vercel 或聊天室。若需暫存，使用受控 secret manager；不要建立 `.env` 範例的真實值副本。

## 正式前本機安全檢查

在 repository 根目錄逐一執行：

```powershell
rg -n --hidden --glob '!node_modules/**' --glob '!dist/**' 'RESEND_API_KEY=.+|PRIVACY_DIGEST_RECIPIENT=.+|PRIVACY_DIGEST_SECRET=.+' .
supabase db reset --local
supabase test db --local
pnpm vitest run supabase/functions/privacy-digest/email.test.ts supabase/functions/privacy-digest/index.test.ts
pnpm check
```

若系統沒有全域 Supabase CLI，可使用專案先前驗證過的 CLI 版本執行等價的本機命令：

```powershell
pnpm dlx supabase@latest db reset --local
pnpm dlx supabase@latest test db --local
```

判讀規則：

- `rg` 結果只可出現文件中的變數名稱或上述搜尋命令本身；任何看似被賦值的內容都必須在繼續前人工確認並移除。不要把可疑命中內容複製到紀錄。
- reset、全部 pgTAP、focused Vitest 與 `pnpm check` 必須全部 exit 0。Docker 未啟動或任一命令失敗時，不得標記本機驗證完成。
- 只允許 `--local`。在此階段不得使用 `--linked`，也不得執行 deploy、secret、Vault、Cron 或 Resend 的正式操作。

## 正式部署順序與逐項授權點

以下每一步都需要使用者針對該步驟明確授權；前一步完成不代表後續步驟已獲授權。

1. 由使用者建立 Resend 帳號與只寄給本人 Gmail 的 API key；不要貼進聊天室、Git 或終端參數。
2. 由使用者在 Supabase Dashboard 設定三個 Function Secrets：`RESEND_API_KEY`、`PRIVACY_DIGEST_RECIPIENT`、`PRIVACY_DIGEST_SECRET`；另新增 Vault secret `uvalert_privacy_digest_secret`，並確認既有 `uvalert_project_url` 可用。
3. 使用者明確授權資料庫變更後，才執行 `supabase db push --linked`；人工確認 migration `20260907000001_private_privacy_digest.sql` 已套用，且沒有非預期 migration。
4. 使用者另行明確授權 Function 部署後，才部署 `privacy-digest`；在 Dashboard 確認狀態為 ACTIVE 並記下實際 version，紀錄中不包含 secret。
5. 在 Dashboard／SQL 確認 `uvalert-privacy-digest` 與 `uvalert-privacy-digest-cleanup` 各存在一次。前者為每日 `01:00 UTC`（台灣時間 09:00），後者為每日 `01:17 UTC`。
6. 使用者明確授權正式 smoke 後，以不含真實個資的受控測試資料手動 invoke 一次；不得把 header、收件者或 message 印到 console／Log／截圖。
7. 人工確認私人 Gmail 收到一封且只一封摘要信；接著確認空 queue 回傳 no-op 且沒有第二封 Email。
8. 將不含個資的 migration version、Function version、驗證時間、Cron job/run ID、單封送達與空 queue no-op 結果寫入 `docs/backend/preview-deployment.md`。

## 人工核對清單

### 部署前

- [ ] 使用者已逐項授權本次正式操作。
- [ ] 本機安全搜尋沒有真實值。
- [ ] local reset、全部 pgTAP、focused Vitest 與 `pnpm check` 全部通過。
- [ ] API key 權限只涵蓋寄信，收件者只允許營運者本人。
- [ ] Function secret 與 Vault secret 的 digest 密鑰一致，且未出現在瀏覽器或 Vercel。

### 部署後

- [ ] 正式 migration version 已由 Dashboard／CLI 唯讀查核。
- [ ] `privacy-digest` 的實際 ACTIVE version 已記錄。
- [ ] 兩個 Cron job 名稱各只有一筆，schedule 與時區換算正確。
- [ ] 受控 queue 只產生一封摘要；同一 batch 重試沒有重複寄送。
- [ ] 空 queue 回傳 no-op 且沒有 Email。
- [ ] Function／Cron Log 只含固定狀態或錯誤碼，沒有 Email、secret 或 feedback 內容。
- [ ] deployment record 只保存非機密版本、時間、run ID 與結果。

## 監測與故障判讀

- HTTP 401／`PRIVACY_DIGEST_AUTH_INVALID`：先在私有介面核對 Function 與 Vault 的 digest 密鑰是否一致；不要把兩個值輸出比對。
- HTTP 500／`SERVER_ERROR`：依固定 Log code 區分設定缺失、claim 或 settle 問題。不要查印 RPC rows 或完整 provider response。
- HTTP 502／`PRIVACY_DIGEST_SEND_FAILED`：確認 Resend 狀態、API key 權限與收件限制；batch 應維持可 retry，不得手動改成 sent。
- Cron 未執行：只讀查核兩個 job 是否各存在一次及最近 run 狀態；不要直接重建或修改 job，除非使用者另行授權。
- Cron 成功但未收到信：先確認本次是有 queue 的 sent，排除合法 no-op；再到私人 Gmail 與 Resend 私有介面核對，不在公開紀錄保存地址或郵件內容。
- 重複信：停止後續人工 invoke，保存非機密 batch／run 識別資訊，先檢查同名 Cron 是否重複與冪等鍵行為；未釐清前不要重送。

## Secret 輪替

1. 選擇不會撞上每日 Cron 的維護時段，並取得使用者對 Function secret、Vault secret 與必要 smoke 的個別授權。
2. 在私有介面產生新的高熵 `PRIVACY_DIGEST_SECRET`，短時間內同步更新 Function Secret 與 `uvalert_privacy_digest_secret`；不要輸出舊值或新值。
3. 以受控空 queue 或合成資料 invoke 驗證授權成功，再確認下一次 Cron run。輪替期間若出現 401，queue 不應被 claim；修正兩端一致性後再測。
4. Resend key 輪替時先建立新的僅寄信 key、更新 Function Secret、完成受控寄送，再於 Resend 私有介面撤銷舊 key。
5. 收件 Gmail 變更也必須由使用者在 Supabase 私有介面操作並重新做單封與 no-op smoke；任何紀錄只寫「收件者已核對」，不寫地址。
6. deployment record 只記錄輪替時間、操作者確認、Function version／Cron run ID 與結果，不保存任何 secret fingerprint 或 Email。

## 2026-09-07 本機驗證紀錄

- `pnpm dlx supabase@latest db reset --local`：PASS；migration `20260907000001_private_privacy_digest.sql` 已在本機套用。
- `pnpm dlx supabase@latest test db --local`：PASS；5 個 SQL 測試檔、265 項測試。
- focused Vitest：PASS；2 個測試檔、26 項測試。由於本機無法直接解析 `pnpm vitest` binary，改以等價的 repository script `pnpm test -- <兩個測試檔>` 執行。
- `pnpm check`：FAIL；typecheck 通過，但完整 Vitest 有 1 項既有頁面出口清單測試失敗（189/190 files、7916/7917 tests passed），因此 wrapper 未執行 lint。
- 補跑 `pnpm lint`：FAIL；ESLint 完成後，Stylelint 在 `HomePage.vue` 發現 1 個既有 custom property 錯誤。
- 結論：SQL 與 privacy-digest focused tests 有本機通過證據；完整本機驗證尚未完成，不可據此進行正式部署。
