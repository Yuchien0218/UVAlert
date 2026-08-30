# Vercel + Supabase UV Forecast Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓 Vercel 上的 UVAlert Vue／Vite PWA 直接呼叫 Supabase `uv-forecast` Edge Function，安全取得並快取中央氣象署五日 UV 預報。

**Architecture:** Vercel 只託管前端，`BrowserUvForecastClient` 由 `VITE_API_BASE_URL` 組出 Supabase Function URL；Supabase Edge Function 持有 CWA secret、驗證行政區、讀寫 `uv_forecast_cache` 並回傳既有 `FiveDayUvForecast` contract。前端 controller 與 IndexedDB 快取維持既有邊界，後端不可用時不影響本機提醒。

**Tech Stack:** Vue 3、Vite 7、TypeScript 5.9、Vitest 4、Supabase Edge Functions（Deno）、Supabase PostgreSQL、Vercel

## 2026-08-30 執行結果

- [x] Batch 1–3 的前端 endpoint、可測 handler、公開 Function 設定、安全測試與部署文件已完成。
- [x] Supabase migration、`CWA_API_KEY`、`ALLOWED_ORIGINS` 與 `uv-forecast` 已部署到 `ykfdnltaqpdytmrszbbk`。
- [x] 已補上 Supabase 新式 secret key、`service_role` cache grant，以及 CWA 現行 `ElementName`、`Locations/Location` 與縣市級 Geocode 相容性。
- [x] `regionCode=63000010` 正式 Function smoke test HTTP 200，CORS 與 5 日 payload 通過。
- [x] Vercel Production／Preview `VITE_API_BASE_URL` 已設為 Supabase Functions base；deployment `dpl_2Zmowvrz7hnt2qphR2exitW2xrSN` 為 `READY` 並 alias 至 `https://uv-alert-web.vercel.app`。
- [x] Production `/forecast` 與主 bundle HTTP 200；bundle 含正確 Function URL，未發現 CWA secret。
- [x] `pnpm check` 通過（100 files／1057 tests），`pnpm build` 通過。
- [ ] 實體手機 UI smoke test 尚未執行；不以 HTTP／bundle 驗證代替觸控裝置驗證。
- [ ] 本次沒有 Function invocation log；cache 證據為重複請求沿用首次 `fetchedAt`，不得描述成已取得 log 證據。

## Global Constraints

- Node.js 必須為 `>=24.0.0`，pnpm 必須為 `>=11.0.0`。
- Vue 維持 Composition API 與 `<script setup lang="ts">`；本計畫不需要修改 `.vue` 頁面。
- `packages/domain` 不得依賴 Supabase、瀏覽器 global 或系統時間。
- CWA API key 與 Supabase service-role key 不得進入 `VITE_*`、前端 bundle、Git、response 或 log。
- 前端保留未設定 `VITE_API_BASE_URL` 時的同源 `/v1` fallback。
- `uv-forecast` 是公開 GET endpoint，但 `uv_forecast_cache` 不開放 anon／authenticated 直接讀寫。
- 不儲存或傳送精確經緯度；API 只接收八碼行政區代碼。
- 不修改提醒公式、UV 分級、頁面資訊架構、CSS 或視覺設計。
- 每個 task 只提交列出的檔案；保留 `.claude/settings.local.json` 與其他使用者變更。
- 未完成真實 production smoke test 前，不得宣稱正式網站已串通。

---

## File Map

| File                                                    | Responsibility                                                            |
| ------------------------------------------------------- | ------------------------------------------------------------------------- |
| `apps/web/src/adapters/BrowserUvForecastClient.ts`      | 正規化 API base URL、組出 `/uv-forecast` endpoint、驗證 forecast response |
| `apps/web/src/adapters/BrowserUvForecastClient.test.ts` | 鎖定預設、空白、Supabase base URL、客製 endpoint 與錯誤行為               |
| `supabase/config.toml`                                  | 宣告 `uv-forecast` production/local function 不驗證 JWT                   |
| `supabase/functions/uv-forecast/handler.ts`             | 可注入依賴的 UV request handler、server cache 與 CWA 協調流程             |
| `supabase/functions/uv-forecast/index.ts`               | 建立 production dependencies 並呼叫 `Deno.serve`                          |
| `supabase/functions/uv-forecast/index.test.ts`          | handler 的 request、CORS、cache hit/miss、304 與錯誤回歸測試              |
| `supabase/functions/_shared/cwa.test.ts`                | CWA URL、ETag、HTTP／JSON failure 與 mapping 邊界測試                     |
| `apps/web/.env.example`                                 | 公開前端 API base URL 範例                                                |
| `docs/backend/local-development.md`                     | 本機直連 Supabase Function 與 secrets 流程                                |
| `docs/backend/deployment-checklist.md`                  | 正式 Supabase/Vercel 設定與 smoke test                                    |
| `docs/backend/preview-deployment.md`                    | 實際部署後的 production／preview 證據與剩餘限制                           |
| `docs/superpowers/plans/README.md`                      | 本計畫的狀態入口                                                          |

### Task 1: Batch 1 — Configurable browser UV endpoint

**Files:**

- Modify: `apps/web/src/adapters/BrowserUvForecastClient.ts`
- Modify: `apps/web/src/adapters/BrowserUvForecastClient.test.ts`

**Interfaces:**

- Consumes: `readConfiguredEnvironmentValue(value: string | undefined): string | undefined`、`import.meta.env.VITE_API_BASE_URL`、既有 `UvForecastApiPort`。
- Produces: `resolveUvForecastEndpoint(baseUrl?: string): string`；`BrowserUvForecastClient` 預設使用該函式，明確傳入 `endpoint` 時仍優先使用呼叫端值。

- [ ] **Step 1: Add failing endpoint-resolution tests**

在 `BrowserUvForecastClient.test.ts` 匯入 `resolveUvForecastEndpoint`，新增：

```ts
it.each([
  [undefined, "/v1/uv/forecast"],
  ["", "/v1/uv/forecast"],
  ["   ", "/v1/uv/forecast"],
  ["/v1", "/v1/uv/forecast"],
  ["/v1/", "/v1/uv/forecast"],
  [
    " https://project-ref.supabase.co/functions/v1/ ",
    "https://project-ref.supabase.co/functions/v1/uv-forecast"
  ]
])("由 API base %j 組出 UV endpoint", (baseUrl, expected) => {
  expect(resolveUvForecastEndpoint(baseUrl)).toBe(expected);
});
```

再加入 env 預設值與 explicit endpoint 優先權測試；env 測試使用 `vi.stubEnv("VITE_API_BASE_URL", value)` 並在 `afterEach(() => vi.unstubAllEnvs())` 清理。

- [ ] **Step 2: Run the focused test and confirm it fails**

Run:

```powershell
& '.\node_modules\.bin\vitest.CMD' run apps/web/src/adapters/BrowserUvForecastClient.test.ts
```

Expected: FAIL，指出 `resolveUvForecastEndpoint` 尚未匯出或預設 client 尚未使用 env。

- [ ] **Step 3: Implement minimal URL normalization**

在 `BrowserUvForecastClient.ts` 使用既有 helper：

```ts
import { readConfiguredEnvironmentValue } from "./configuredEnvironment";

const DEFAULT_API_BASE_URL = "/v1";

export function resolveUvForecastEndpoint(baseUrl?: string): string {
  const configuredBaseUrl =
    readConfiguredEnvironmentValue(baseUrl) ?? DEFAULT_API_BASE_URL;
  return `${configuredBaseUrl.replace(/\/+$/, "")}/uv-forecast`;
}
```

constructor 保留 `endpoint?: string` 測試注入能力，但預設改為：

```ts
this.#endpoint =
  options.endpoint ??
  resolveUvForecastEndpoint(import.meta.env.VITE_API_BASE_URL);
```

- [ ] **Step 4: Run focused tests and web typecheck**

Run:

```powershell
& '.\node_modules\.bin\vitest.CMD' run apps/web/src/adapters/BrowserUvForecastClient.test.ts apps/web/src/adapters/configuredEnvironment.test.ts
pnpm --filter @sunshield/web typecheck
```

Expected: adapter tests PASS；web typecheck PASS。若 esbuild 回報 `Cannot read directory "../..": Access is denied`，在允許讀取父目錄的環境重跑相同測試，不將其誤判為測試失敗。

- [ ] **Step 5: Commit Batch 1**

```powershell
git add -- apps/web/src/adapters/BrowserUvForecastClient.ts apps/web/src/adapters/BrowserUvForecastClient.test.ts
git diff --cached --check
git commit -m "feat(web): configure supabase uv endpoint"
```

### Task 2: Batch 2A — Make the UV handler dependency-injectable

**Files:**

- Create: `supabase/functions/uv-forecast/handler.ts`
- Modify: `supabase/functions/uv-forecast/index.ts`
- Modify: `supabase/functions/uv-forecast/index.test.ts`

**Interfaces:**

- Consumes: `UvForecastPayload`、`CwaFetchResult`、既有 HTTP response helpers。
- Produces:

```ts
export type ForecastCacheRow = {
  region_code: string;
  schema_version: string;
  source_dataset: string;
  payload: unknown;
  fetched_at: string;
  usable_until: string;
  etag: string | null;
};

export type ForecastHandlerDependencies = {
  readCache(regionCode: string): Promise<ForecastCacheRow | null>;
  writeCache(row: ForecastCacheRow & { updated_at: string }): Promise<void>;
  fetchUpstream(options: {
    apiKey: string;
    etag: string | null;
  }): Promise<CwaFetchResult>;
  readSecret(name: "CWA_API_KEY"): string | undefined;
  now(): Date;
};

export function createForecastHandler(
  dependencies: ForecastHandlerDependencies
): (request: Request) => Promise<Response>;
```

- [ ] **Step 1: Replace the boundary-only test with failing handler tests**

在 `index.test.ts` 建立 `makeDependencies()`，預設提供固定時間、有效 secret、無 cache 與已驗證 upstream fixture。新增至少以下斷言：

```ts
it("有效 cache 直接回傳且不呼叫 CWA", async () => {
  const dependencies = makeDependencies({ cache: makeCachedForecastRow() });
  const response = await createForecastHandler(dependencies)(
    new Request("https://api.test/uv-forecast?regionCode=65000010")
  );
  expect(response.status).toBe(200);
  expect(dependencies.fetchUpstream).not.toHaveBeenCalled();
});

it("cache miss 取得 CWA、寫入 cache 並回傳", async () => {
  const dependencies = makeDependencies();
  const response = await createForecastHandler(dependencies)(
    new Request("https://api.test/uv-forecast?regionCode=65000010")
  );
  expect(response.status).toBe(200);
  expect(dependencies.writeCache).toHaveBeenCalledOnce();
});
```

同檔補上：OPTIONS 204、POST 405、非法 region 422、缺 `CWA_API_KEY` 500、cache read error 500、304 + valid cache 200、304 + malformed cache 503、upstream error 503、mapping error、cache write error 仍 200。

- [ ] **Step 2: Run the handler test and confirm it fails**

Run:

```powershell
& '.\node_modules\.bin\vitest.CMD' run supabase/functions/uv-forecast/index.test.ts
```

Expected: FAIL，因 `handler.ts` 與 `createForecastHandler` 尚不存在。

- [ ] **Step 3: Extract orchestration into `handler.ts`**

將目前 `handleForecast` 的 request、cache、CWA mapping 與 response 決策搬入 `createForecastHandler(dependencies)`。保持現有狀態碼和錯誤文案；將直接的 Supabase client、`Deno.env`、`fetch`、`new Date()` 改由 dependencies 提供。

`writeCache` 失敗時只忽略 server cache 寫入並回傳已驗證 forecast；`readCache` 失敗時回 500。不要在 handler catch 中輸出 error object。

- [ ] **Step 4: Keep `index.ts` as the production adapter**

`index.ts` 只負責：

```ts
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
```

在兩者存在時建立 Supabase client，實作 `readCache`／`writeCache`；用 `fetchCwaDataset` 實作 `fetchUpstream`，用 `Deno.env.get` 實作 `readSecret`，最後：

```ts
const handleForecast = createForecastHandler(dependencies);
Deno.serve(async (request) => withCors(await handleForecast(request), request));
```

若 Supabase runtime variables 缺少，production dependencies 的 cache operation 應回受控 configuration error，不在 module import 時拋錯。

- [ ] **Step 5: Run handler, CWA and HTTP tests**

Run:

```powershell
& '.\node_modules\.bin\vitest.CMD' run supabase/functions/uv-forecast/index.test.ts supabase/functions/_shared/cwa.test.ts supabase/functions/_shared/http.test.ts
```

Expected: all selected tests PASS。

- [ ] **Step 6: Commit Batch 2A**

```powershell
git add -- supabase/functions/uv-forecast/handler.ts supabase/functions/uv-forecast/index.ts supabase/functions/uv-forecast/index.test.ts
git diff --cached --check
git commit -m "test(api): cover uv forecast cache flow"
```

### Task 3: Batch 2B — Lock down public function and CWA failure behavior

**Files:**

- Modify: `supabase/config.toml`
- Modify: `supabase/functions/_shared/cwa.test.ts`
- Modify: `supabase/functions/uv-forecast/index.test.ts`

**Interfaces:**

- Consumes: `fetchCwaDataset`、`CwaUpstreamError.status`、Task 2 的 `createForecastHandler`。
- Produces: `[functions.uv-forecast] verify_jwt = false`；CWA 401／429／5xx／invalid JSON 與 secret redaction 的回歸證據。

- [ ] **Step 1: Add failing public-function configuration assertion**

在 `index.test.ts` 讀取 `supabase/config.toml`，斷言：

```ts
expect(config).toMatch(
  /\[functions\.uv-forecast\][\s\S]*?verify_jwt\s*=\s*false/
);
```

- [ ] **Step 2: Add CWA upstream matrix tests**

在 `cwa.test.ts` 使用 `it.each([401, 429, 500, 503])`，確認 `fetchCwaDataset` 拋出的 `CwaUpstreamError.status` 與 HTTP status 相同；另測 response 200 但 body 不是 JSON 時拋 `CwaMappingError("INVALID_RESPONSE")`。所有 error message 與序列化內容不得包含測試 secret `cwa-secret-do-not-leak`。

- [ ] **Step 3: Run tests and confirm the config assertion fails**

Run:

```powershell
& '.\node_modules\.bin\vitest.CMD' run supabase/functions/_shared/cwa.test.ts supabase/functions/uv-forecast/index.test.ts
```

Expected: CWA behavior tests依現況可能已通過；config assertion FAIL，因 function block 尚不存在。

- [ ] **Step 4: Declare the public function explicitly**

在 `supabase/config.toml` 加入：

```toml
[functions.uv-forecast]
verify_jwt = false
```

這只讓 gateway 不要求 JWT；handler 的 region validation、CORS allowlist 與 cache table isolation仍必須保留。

- [ ] **Step 5: Run Batch 2 tests**

Run:

```powershell
& '.\node_modules\.bin\vitest.CMD' run supabase/functions/_shared/cwa.test.ts supabase/functions/_shared/http.test.ts supabase/functions/uv-forecast/index.test.ts apps/web/src/adapters/BrowserUvForecastClient.test.ts apps/web/src/features/uv/createUvForecastController.test.ts packages/contracts/src/region-preference.test.ts
```

Expected: all selected tests PASS。

- [ ] **Step 6: Commit Batch 2B**

```powershell
git add -- supabase/config.toml supabase/functions/_shared/cwa.test.ts supabase/functions/uv-forecast/index.test.ts
git diff --cached --check
git commit -m "test(api): secure public uv forecast boundary"
```

### Task 4: Batch 3 — Make deployment reproducible

**Files:**

- Modify: `apps/web/.env.example`
- Modify: `docs/backend/local-development.md`
- Modify: `docs/backend/deployment-checklist.md`
- Modify: `docs/backend/README.md`
- Modify: `docs/superpowers/plans/README.md`

**Interfaces:**

- Consumes: Task 1 的 `VITE_API_BASE_URL` contract、Task 3 的 public function config。
- Produces: 不含 secrets 的 local、preview、production 部署步驟與驗證清單。

- [ ] **Step 1: Update the frontend environment example**

在 `apps/web/.env.example` 以註解說明兩種合法 base URL：

```dotenv
# Local same-origin proxy fallback:
VITE_API_BASE_URL=/v1
# Production example:
# VITE_API_BASE_URL=https://your-project-ref.supabase.co/functions/v1
```

不得加入真實 project ref、publishable key 或 CWA key。

- [ ] **Step 2: Rewrite the local function path instructions**

在 `local-development.md` 明確區分：

```text
Direct local Edge Function base:
http://127.0.0.1:54321/functions/v1

Optional same-origin proxy base:
/v1
```

說明本次前端可直接把 `VITE_API_BASE_URL` 指向 direct base；`CWA_API_KEY` 與 `ALLOWED_ORIGINS` 由 `supabase/.env.example`／secrets 提供，不放進 `apps/web/.env.local`。

- [ ] **Step 3: Replace rewrite-only production checks with direct-call checks**

在 `deployment-checklist.md` 的 UV 範圍改為：

- Supabase `uv-forecast` 已部署且 public gateway 不要求 JWT。
- Vercel `VITE_API_BASE_URL=https://your-project-ref.supabase.co/functions/v1`，其中 `your-project-ref` 由已確認的 Supabase project ref 取代。
- `ALLOWED_ORIGINS` 精確包含 production origin 與核准 preview origins。
- OPTIONS 與 GET 回傳正確 CORS headers。
- browser request 不含 CWA／service-role secret。

Sync／feedback 既有 rewrite checklist 不在本次宣告完成；保留為其各自未來工作。

- [ ] **Step 4: Add exact deployment commands without secret values**

文件加入：

```powershell
supabase login
supabase link --project-ref $env:UVALERT_SUPABASE_PROJECT_REF
supabase db push
supabase secrets set "CWA_API_KEY=$env:UVALERT_CWA_API_KEY" "ALLOWED_ORIGINS=$env:UVALERT_ALLOWED_ORIGINS" --project-ref $env:UVALERT_SUPABASE_PROJECT_REF
supabase functions deploy uv-forecast --project-ref $env:UVALERT_SUPABASE_PROJECT_REF
```

註明 `UVALERT_SUPABASE_PROJECT_REF`、`UVALERT_CWA_API_KEY` 與 `UVALERT_ALLOWED_ORIGINS` 必須由使用者在安全 shell session 預先設定；文件與命令輸出不得顯示其值。

- [ ] **Step 5: Update plan index status**

在 `docs/superpowers/plans/README.md` 新增本計畫列，狀態寫為「規格已確認；Task 1–3 為本機實作，Task 4 需要 Supabase/Vercel 權限，Task 5 需要 production smoke test」，並把更新日期改為 `2026-08-30`。

- [ ] **Step 6: Verify documentation and examples**

Run:

```powershell
rg -n "CWA_API_KEY=.+[^>]$|SUPABASE_SERVICE_ROLE_KEY=.+[^>]$" apps/web docs/backend supabase/.env.example
& '.\node_modules\.bin\prettier.CMD' --check apps/web/.env.example docs/backend/README.md docs/backend/local-development.md docs/backend/deployment-checklist.md docs/superpowers/plans/README.md
git diff --check
```

Expected: secret scan 沒有真實值；Prettier PASS；diff check PASS。

- [ ] **Step 7: Commit Batch 3**

```powershell
git add -- apps/web/.env.example docs/backend/README.md docs/backend/local-development.md docs/backend/deployment-checklist.md docs/superpowers/plans/README.md
git diff --cached --check
git commit -m "docs: document supabase uv deployment"
```

### Task 5: Batch 4 — Deploy Supabase and connect Vercel

**Files:**

- No source file is modified unless a verified deployment discrepancy requires returning to Tasks 1–4.
- External state: selected Supabase production project, Supabase secrets, Vercel environment variables, new deployments.

**Interfaces:**

- Consumes: user-confirmed Supabase project ref, safely configured CWA key, exact Vercel production origin, optional approved preview origins.
- Produces: deployed `uv-forecast` Function URL and Vercel deployment containing `VITE_API_BASE_URL`.

- [ ] **Step 1: Read-only preflight**

使用者先在目前安全 shell session 設定 `UVALERT_SUPABASE_PROJECT_REF`、`UVALERT_CWA_API_KEY`、`UVALERT_ALLOWED_ORIGINS` 與 `UVALERT_PRODUCTION_ORIGIN`。執行者只以 `[string]::IsNullOrWhiteSpace($env:VARIABLE_NAME)` 確認四者均回傳 `False`，不得輸出 secret 值。

Run:

```powershell
supabase --version
supabase projects list
vercel whoami
vercel project ls
```

Expected: CLI sessions are authenticated；the user explicitly confirms the exact Supabase project and Vercel project before any link, secret, migration or deployment mutation。

- [ ] **Step 2: Inspect remote state before mutation**

Run with the confirmed project ref:

```powershell
supabase migration list --project-ref $env:UVALERT_SUPABASE_PROJECT_REF
supabase functions list --project-ref $env:UVALERT_SUPABASE_PROJECT_REF
```

Expected: record which migrations and function version are already present；do not redeploy blindly。

- [ ] **Step 3: Apply only missing migrations**

Run:

```powershell
supabase link --project-ref $env:UVALERT_SUPABASE_PROJECT_REF
supabase db push --dry-run
supabase db push
```

Expected: dry run contains only repository migrations intended for the confirmed project；actual push succeeds。If the dry run includes destructive or unrelated changes, stop and request user direction。

- [ ] **Step 4: Set secrets through the secure shell**

Run interactively without printing or storing the real values:

```powershell
supabase secrets set "CWA_API_KEY=$env:UVALERT_CWA_API_KEY" "ALLOWED_ORIGINS=$env:UVALERT_ALLOWED_ORIGINS" --project-ref $env:UVALERT_SUPABASE_PROJECT_REF
```

Expected: Supabase reports the secret names were set；command output and logs do not reveal values。

- [ ] **Step 5: Deploy and directly smoke-test the function**

Run:

```powershell
supabase functions deploy uv-forecast --project-ref $env:UVALERT_SUPABASE_PROJECT_REF
```

Then GET:

```text
https://$($env:UVALERT_SUPABASE_PROJECT_REF).supabase.co/functions/v1/uv-forecast?regionCode=63000010
```

with `Origin: $env:UVALERT_PRODUCTION_ORIGIN` and `Accept: application/json`。

Expected: HTTP 200、`Content-Type: application/json`、`Access-Control-Allow-Origin` exactly equals the production origin；body passes `FiveDayUvForecastSchema` and contains no secret。

- [ ] **Step 6: Configure Vercel and redeploy**

Set in the confirmed Vercel project:

```text
VITE_API_BASE_URL=https://$($env:UVALERT_SUPABASE_PROJECT_REF).supabase.co/functions/v1
```

Apply it to production and only the explicitly approved preview environments；redeploy from the repository root because the Vercel project root directory is `apps/web`。

Expected: Vercel build succeeds and the new deployment identifies the intended commit；do not infer production promotion from a preview URL。

- [ ] **Step 7: Verify browser-visible production behavior**

Check production `/forecast` after selecting region `63000010` or another valid current selection：

- request URL points to the confirmed Supabase project；
- response is JSON, not Vercel `index.html`；
- UI shows region、issued/fetched context and forecast values；
- browser request contains no `CWA_API_KEY` or service-role key；
- refresh and deep link still load the PWA。

Expected: all checks PASS；record exact deployment URL、commit and timestamp for Task 6。

### Task 6: Batch 5 — Resilience, full verification and status record

**Files:**

- Modify: `docs/backend/preview-deployment.md`
- Modify: `docs/superpowers/plans/2026-08-30-vercel-supabase-uv-forecast-integration.md`
- Modify: `docs/superpowers/plans/README.md`

**Interfaces:**

- Consumes: Task 5 verified Supabase Function URL、Vercel deployment URL、commit、timestamp and smoke-test evidence。
- Produces: truthful deployment record and completed task checkboxes；no source behavior changes。

- [ ] **Step 1: Run focused automated verification**

Run:

```powershell
& '.\node_modules\.bin\vitest.CMD' run supabase/functions/_shared/cwa.test.ts supabase/functions/_shared/http.test.ts supabase/functions/uv-forecast/index.test.ts apps/web/src/adapters/BrowserUvForecastClient.test.ts apps/web/src/features/uv/createUvForecastController.test.ts packages/contracts/src/region-preference.test.ts
```

Expected: all selected files and tests PASS。

- [ ] **Step 2: Run full repository gates**

Run:

```powershell
pnpm check
pnpm build
```

Expected: typecheck、tests、ESLint、Stylelint and production build all complete with exit code 0。Warnings must be reported as warnings, not described as warning-free。

- [ ] **Step 3: Verify cache and failure behavior**

Using Supabase Function invocation logs and controlled test dependencies rather than altering production secrets：

- invoke the same region twice and verify the second request is served from valid cache；
- verify malformed/expired fixtures do not appear as current data；
- use automated handler tests for CWA 401、429、5xx and cache write failure；
- use controller tests for offline cached and unavailable states。

Expected: no path converts failure to UVI 0；production secret is never removed merely to simulate a failure。

- [ ] **Step 4: Update the deployment status document**

In `preview-deployment.md`, replace stale statements only with current evidence。Record separately：

- production URL reachable；
- production URL contains the intended commit；
- Supabase Function URL and deployment time；
- real CWA response verified；
- cache hit evidence；
- preview protection and any unverified mobile checks；
- remaining Auth／Sync／feedback limitations。

- [ ] **Step 5: Mark plan and index status truthfully**

Check only steps actually completed。If production authority, CWA key or browser smoke test was unavailable, leave those checkboxes open and mark the exact blocker；do not mark the overall plan complete。

- [ ] **Step 6: Commit Batch 5 documentation**

```powershell
git add -- docs/backend/preview-deployment.md docs/superpowers/plans/2026-08-30-vercel-supabase-uv-forecast-integration.md docs/superpowers/plans/README.md
git diff --cached --check
git commit -m "docs: record uv forecast deployment status"
```

## Plan Completion Criteria

- Tasks 1–4 source and documentation commits are present and verified。
- Supabase `uv-forecast` is deployed to the user-confirmed project with JWT verification disabled only for this public function。
- `CWA_API_KEY` and service-role credentials remain server-only。
- Vercel production contains the intended `VITE_API_BASE_URL` and commit。
- Real `/forecast` behavior、server cache、offline cache and upstream failure paths are verified。
- `pnpm check` and `pnpm build` finish successfully。
- Deployment documentation distinguishes current production evidence from preview or planned work。
