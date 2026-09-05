# 裝備分享卡：實作計畫

> **For agentic workers:** 四個階段依序做，一～三是一批（使用者裁決「三階段一起排」），第四階段暫緩。動手前先讀 `Global Constraints`，每個 Task 的「驗證」欄就是它的守門要求。做完把 `- [ ]` 改成 `- [x]` 並補上 PR 編號。

**日期**：2026-09-01（Asia/Taipei）
**狀態**：**一～三階段全部完成**（#96、#98、#99）。階段四（照片）暫緩
**來源**：使用者提供一張 mockup（暖象牙底 ＋ 深咖啡卡）並要求「分享按鈕位置、配色參考這個，使用共通元件」
**範圍**：`apps/web`（新頁面、新元件、adapter）、`packages/contracts`（兩個選填欄位）、`packages/platform`（一個新 port）、`packages/ui`（可能新增 on-dark token 別名）
**不動**：`packages/domain`（分享卡完全不進 reducer）、`packages/persistence-web` 的既有 store

**相關文件**：`DESIGN.md` §2／§4／§9／§10、`docs/decisions/2026-08-23-wireframe-copy-fixes.md`（照片為何延後）、`docs/decisions/README.md`

---

## 使用者裁決（2026-09-01）

| 問題 | 裁決 |
| ---- | ---- |
| 裝備卡顯示什麼 | 名字、價格、尺寸、顏色 |
| 沒有進行中提醒時 | 標題改「我的防曬裝備」，不帶日期 |
| 收納中的裝備 | 不放，只放使用中 |
| 排程 | 一～三階段一起 |
| 尺寸欄位型別 | **自由文字**（不是 S/M/L/XL enum） |
| 顏色呈現 | **印字就好**，不做色塊 |
| 照片上傳 | **同意獨立成第四階段，暫緩** |
| 價格 | **給開關，預設關** |
| 日期／UV 的兩種模式 | 接受 |

**尚未裁決**：分享頁的 hero 圖示（見 Task 1.4）。

---

## Global Constraints

1. **不升 `PRODUCT_CATALOG_RECORD_VERSION`。** 新增的 `size`／`color` 一律
   `.nullable().default(null)`。理由見 `packages/contracts/src/product.ts` 的長註解：
   `LocalProductCatalogRepository.#normalize()` 對「schemaVersion 不等於當前版本」
   的紀錄會套用一組為 1.0.0 寫的預設值——**升版會把使用者存的太陽眼鏡變成防曬乳、
   清空購買月份與備註**。`product-catalog.test.ts` 有守門釘著這個決定。
2. **分享卡不進 reducer。** 它是投影的讀取端，不產生事件。
3. **UV 風險色不得出現在深色卡上**（見下方「對比度實測」）。
4. **不新增 runtime 依賴。** 目前 `apps/web` 只有 4 個（含 supabase-js）。
5. 只放 `archivedAt === null && status === "active"` 的裝備。

---

## 對比度實測（2026-09-01，動工前重算一次）

深色卡 `--color-surface-dark` `#2e2925`：

| 前景 | 對比 | |
| ---- | ---- | ---- |
| `--color-on-dark` `#fff8f0` | **13.66** | ✅ 內文 |
| `--color-on-dark-soft` `#dcc7bc` | **8.86** | ✅ 標籤 |
| 琥珀金 `#C1832E` | **4.49** | ❌ **差 0.01**，不可當小字 |
| UV low `#4b739e` | 2.91 | ❌ |
| UV moderate `#946800` | 2.90 | ❌ |
| UV high `#b25721` | 2.93 | ❌ |
| UV very_high `#c43d3d` | 2.80 | ❌ |
| UV extreme `#7d4bb3` | 2.42 | ❌ |

**五個 UV 風險色全部過不了深色卡。** 它們是 2026-08-31 為了**淺色畫布**才壓暗的
（`uvRiskContrast.test.ts` 守著那一組）。mockup 把「今日 UV 6」畫在淺色區是對的，
計畫必須把這件事釘死成守門。

**琥珀金差 0.01** 跟 2026-08-31 `#956900`→`#946800` 是同一種擦邊。mockup 的
eyebrow 看起來是琥珀金，實作要改用 `--color-on-dark-soft`。

---

## 階段一：分享卡畫面

做完就已經可用（使用者能自己截圖），而且是階段二、三唯一的資料來源。

### Task 1.1　新增 `size`／`color` 兩個選填欄位

- [x] `packages/contracts/src/product.ts`：`size`、`color` 皆
      `z.string().trim().max(20).nullable().default(null)`，**不升版**
- [x] `GearForm.vue`：依品類顯示
      - 防曬衣物：尺寸、顏色
      - 太陽眼鏡：顏色
      - 其他裝備：尺寸、顏色
      - **防曬乳：兩者都不顯示**（它的識別資訊是 SPF／PA）
- [x] 兩個欄位放進「我的紀錄」那張收合卡，跟價格／評價同一區

**驗證**：舊紀錄（沒有這兩個欄位）解析得過且補成 null；`product-catalog.test.ts`
既有的「不升版」守門仍綠；防曬乳看不到這兩欄。

### Task 1.2　`GearShareCard.vue`

真實 DOM，用共用元件與 token。**這是 `--surface-inverse` 的第一個消費者**——
DESIGN.md §10 記著這套規範「有效但引用 0 次」，並警告過套用需排程。
分享卡是**全新表面**，不是那三個元件的 retrofit，所以風險低。

版面（依 mockup）：

```
BrandHeader 風格的一行：logo ＋（有 session 時）日期
標題        我今天的防曬裝備 / 我的防曬裝備
副標        臺北市 大安區 ｜ 今日 UV 6 高量級     ← 淺色區，風險色只能在這裡
深色卡      eyebrow「主要防曬」→ 名稱 → 分隔線 → 標示／補擦間隔／情境 三欄
裝備格      名字 ／ 價格 ／ 尺寸 ／ 顏色（只印有值的）
安全註記    這是協助記得補擦的紀錄，不是安全曝曬時間或防護效果保證。
            UV 資料來源：中央氣象署 F-D0047-091。
```

兩種模式（使用者裁決）：

| | 有進行中提醒 | 沒有 |
| --- | --- | --- |
| 標題 | 我今天的防曬裝備 | 我的防曬裝備 |
| 日期／UV／地區 | ✅ | ❌ 不印 |
| 情境 | ✅ | ❌ |

**沒有日期的卡片不印「今日 UV」**——傳出去過幾天再看就是錯的。

**價格開關預設關**（使用者裁決）。開關本身放在分享頁，不進卡片。

- [x] 深色卡用 `--surface-inverse`，文字 `--text-inverse`，標籤 `--color-on-dark-soft`
- [x] 風險色只出現在淺色區
- [x] 只印有值的欄位，沒有的不留空位（`GearDetailSheet` 已有這個模式可抄）

**驗證**：兩種模式各一條掛載測試；一條守「深色卡內不得出現 `--color-uvi-*`」；
價格預設不出現。

### Task 1.3　分享入口

- [x] `ProductsPage` 標題列右上角 `IconButton` + `tool-share`，
      label「分享我的防曬裝備」
- [x] **只在有使用中裝備時出現**
- [x] 路由 `/products/share`，`hideNavigation: true`

位置理由：卡片是整組而非單件，所以入口在清單頁不在抽屜；而且標題列右側單一動作
是 2026-09-01 剛統一出來的語彙（衛教兩頁、裝備詳情）。

**驗證**：沒有使用中裝備時按鈕不存在；`ProductsPage.test.ts` 的 emit 掃描仍綠。

### Task 1.4　分享頁的 hero 圖示（**待使用者裁決**）

`tool-share` 是**單色工具圖示**，幾何是三圓兩線、為 20px 收斂。放到 40／56 會很空
——**這正是 2026-08-31 `state-untimed` 放大後讀成刪除記號、被否決的那個坑**
（見 `HomeNightNotice.vue` 註解）。

- [x] **甲**（2026-09-02 使用者改口「幫我畫」）：雙色 `feature-share` 已加入登記表與 `icons/`，走 `IconLead`（40px）放在頁面標題左側。

      **例外說明**：README 寫「幾何的真實來源是 Illustrator」，這張是直接寫 SVG path 的，是唯一的例外，因為使用者明確要求由我畫。日後若要調型，還是回 Illustrator 重畫再跑 `generate-icons.mjs` 覆蓋。
- [x] **乙**（預設先走）：只在標題列用 24px 的 `tool-share`，分享頁不做 hero

---

## 階段二：輸出 PNG

- [x] `features/share/paintShareCard.ts`：Canvas 2D 手繪
- [x] **顏色與間距從 `getComputedStyle(document.documentElement)` 讀 token**，
      不要在 JS 裡再抄一份色碼——否則設計系統會多出第四份真相
- [x] 輸出 1080×1350（IG 直式）
- [x] 繪圖前 `await document.fonts.ready`

**為什麼手繪而不是 html2canvas／html-to-image**：新依賴、CJK web font 在 canvas
常出問題、輸出品質不穩。手繪零依賴且完全可控。

**字型的已知限制**：serif subset **刻意不含使用者輸入**
（`tools/fonts/build-fonts.mjs` 註解：「裝備名稱、備註不會進標題」）。所以裝備名稱
會 fallback 到系統黑體，**不同手機分享出來的圖字體會不一樣**。這是既有決策的延伸，
接受。標題「我的防曬裝備」／「我今天的防曬裝備」要**加進 subset 來源並重跑
`build-fonts.mjs`**（產出的 woff2 會進 repo）。

**驗證**：一條測試斷言 painter 只從 computed style 取色（不得出現 `#` 字面量）。

## 階段三：系統分享

- [x] `packages/platform`：新增 `SharePort`（`canShareFiles()`／`shareFile()`）
- [x] `apps/web/src/adapters/`：`BrowserShare` 實作 `navigator.canShare({ files })`
- [x] 不支援時退回下載（`<a download>`）
- [x] 接進 `createWebAppServices.ts`

照這個 repo 的單向依賴，瀏覽器 API 一律走 port＋adapter，不在元件裡直接碰
`navigator`。

**驗證**：port 有 fake 實作可測；不支援分享時仍給得出下載。

---

## 階段四：裝備照片（**暫緩**，使用者同意獨立）

**2026-08-23 已經裁決過不做**，理由見 `docs/decisions/2026-08-23-wireframe-copy-fixes.md`
§「開瓶日期與照片」：資料模型沒有欄位、Dexie 沒有 blob 機制。

真的要做時必須一併處理：

| 風險 | 說明 |
| ---- | ---- |
| **同步會爆** | `product_catalog` 是整筆 JSON 上雲。照片塞進那筆記錄，`sync-commit` 就死了 → 照片必須獨立 store 且 P0 不同步，或走 Supabase Storage（新後端工作） |
| **打破匯出承諾** | 資料設定頁寫著「不含定位與裝置識別碼」。**手機照片的 EXIF 帶 GPS** |
| **EXIF 要在存入前剝除** | 不是分享時才剝——存進去就已經是洩漏 |
| Dexie v4 ＋ 新 store | 不可放進 `SunscreenProducts` |
| 清除資料 | 要一併刪 blob，否則「清除全部」是假的 |

分享卡一～三階段**不含照片**——canvas 要處理非同步解碼與裁切，會拖慢前面。
