# UVAlert 後端開發入口

UVAlert 的後端以 Supabase 為第一版實作，但核心仍是免登入、IndexedDB、本機可工作的防曬補擦倒數。

- [本機開發](./local-development.md)：CLI、migration、Edge Functions、Google OAuth 與前端 env。
- [部署檢查表](./deployment-checklist.md)：正式環境 secrets、RLS、rewrite 與刪除資料驗證。
- [後端設計](../superpowers/specs/2026-08-17-backend-foundation-design.md)：已確認的資料邊界與決策。
- [實作計畫](../superpowers/plans/2026-08-17-backend-foundation.md)：任務與驗證紀錄。

## 不變的產品邊界

1. 不登入也能開始、持續與結束提醒。
2. 登入不是啟動提醒的前置條件，也不會改變補擦公式。
3. 同步前先顯示摘要與選擇；衝突不自動覆蓋。
4. UV cache、已結束 Session、精確位置、裝置識別碼、通知權限、草稿與照片不進第一版跨裝置同步。
5. 清除 UVAlert 雲端資料不會刪除 Google 帳號；清除本機資料是另一個頁面與操作。
