# 今日全臺 UV 分布介面重構設計

**日期**：2026-09-09（Asia/Taipei）

**狀態**：方向已由產品端確認；待使用者審閱書面規格

**用途**：定義 `/forecast` 中「今日全臺分布」地圖、圖例、地區資訊與 22 縣市清單的 UI／UX、資料與元件契約

**範圍**：UV 視覺化色票、縣市分區排序、共用展示邏輯、元件拆分、離島呈現、排版與驗證

**非範圍**：改變 CWA 資料來源、UV 分級規則、五日預報卡、地區選擇流程、把地圖改成可互動選擇器

**權威性**：UV 分級資料型別以 `packages/contracts/src/weather.ts` 為準；產品行為以現行程式碼與測試為準；全站視覺 token 仍以 `DESIGN.md` 與 `packages/ui/src/styles.css` 為準

## 一、問題與目標

目前 `ForecastPage.vue` 同時負責全臺分布的比例計算、風險 class、地圖、清單與地區資訊排版。22 個縣市沿 API 回傳順序平鋪，缺少地理分組；清單列用底線分隔且文字靠近色條圓角；地圖與清單雖使用相同 `riskLevel`，但圖例、標籤、級距與展示 class 尚未形成明確的單一真實來源。

本次重構要達成：

1. 使用者能依北部、中部、南部、東部、外島快速找到縣市。
2. 縣市列移除底線，以留白建立閱讀節奏，並增加文字與圓角之間的內距。
3. 地圖、圖例與列表共用同一套 UV 風險展示字典。
4. 長條固定以 UVI 11 為滿格，維持跨日可比較性；11 以上封頂但保留真實數字。
5. 金門與連江不再像孤立污點，使用清楚的 inset 與短標籤呈現。
6. 所有色彩、圓角、間距與字體角色都走共用 token，不在元件或行內樣式中重複硬刻。

## 二、採用方案

採用聚焦的 feature-level 元件重構：由 route page 保留載入與資料組裝責任，新增全臺分布容器、圖例、分組清單與單列元件；展示字典與縣市分區表位於 UV feature 層。

不採用只改 CSS 的方案，因為它會保留頁面內重複的級距、比例與 class 判斷；也不把展示分組塞進 controller，因為分區與圖例屬於 presentation concern，不應污染預報載入狀態。

## 三、單一真實來源

### 3.1 UV 展示字典

新增 UV presentation module，依 `UvRiskLevel` 提供：

- 中文名稱：低量級、中量級、高量級、過量級、危險級。
- 顯示級距：0–2、3–5、6–7、8–10、11+。
- CSS class suffix。
- 圖例順序。
- 對應的視覺化 token 名稱。
- 固定的長條滿格門檻與 `uvi → fill ratio` 計算。

既有 `getUvRiskLevelLabel` 應改為引用或與這份字典合併，不允許在圖例、地圖與列表各自維護 switch 或級距判斷。資料所帶的 `riskLevel` 仍是顏色選擇依據；元件不可根據 `uvi` 再自行重算分級。

### 3.2 縣市地理分區

以穩定的五碼 `countyCode` 維護分區及順序，不用中文名稱或 API 回傳順序推斷：

- 北部：臺北市、新北市、基隆市、桃園市、新竹市、新竹縣、宜蘭縣。
- 中部：苗栗縣、臺中市、彰化縣、南投縣、雲林縣。
- 南部：嘉義市、嘉義縣、臺南市、高雄市、屏東縣。
- 東部：花蓮縣、臺東縣。
- 外島：澎湖縣、金門縣、連江縣。

分組函式的輸出固定為上述五區。每個收到的縣市必須恰好出現一次；未知代碼不得靜默被丟棄，開發與測試時應明確暴露資料字典落差。

## 四、元件架構與資料流

```text
ForecastPage
└─ TaiwanUvDistribution
   ├─ CurrentRegionRow
   ├─ TaiwanUvMap
   ├─ UvRiskLegend
   └─ UvCountyGroupedList
      └─ UvCountyListItem × 22
```

- `ForecastPage`：呼叫 `ensureLoaded`／`ensureNationwideLoaded`，將全臺預報及目前地區傳入容器，不再計算色條比例或產生風險 class。
- `TaiwanUvDistribution`：負責區塊標題、目前地區列、地圖、圖例與清單的閱讀順序。
- `CurrentRegionRow`：顯示目前地區或未設定狀態，以及 `/region` 的設定／變更連結。若標記足夠小且只有本區塊使用，可保留為容器內的單一語意區塊，不強制多建檔案。
- `UvRiskLegend`：從共用 UV 展示字典渲染完整五級圖例；窄螢幕可自然換行，不水平捲動、不截字。
- `UvCountyGroupedList`：由分區函式取得五組資料，渲染可見的區域標題與清單。
- `UvCountyListItem`：純展示元件；props 接收單一 county 與已計算的 fill ratio，不存取 controller、不重新判斷級距。
- `TaiwanUvMap`：維持不可點擊與 `aria-hidden`，因為下方清單才是可存取的等價資料；風險 class 由共用展示 helper 取得。

資料流維持 props down。這批元件沒有使用者輸入，不需要自訂 emit 或 `v-model`。

## 五、排版與閱讀順序

全臺分布區塊採以下順序：

```text
目前地區：基隆市中山區                 變更地區
────────────────────────────────────────────
今日全臺分布
［臺灣地圖］
［UV 五級圖例］

北部
［縣市長條］［縣市長條］……

中部
……
```

目前地區列移到「今日全臺分布」標題與該區塊頂部分隔線之前。分隔線只負責區分地區控制與全臺資訊；22 個縣市列的 `border-bottom` 全部移除。

區域內由較小 row gap 維持連續性，區域之間使用至少兩倍的 group gap。縣市網格在窄螢幕維持兩欄，內容真正容納得下時才進入三欄；文字容器不設固定高度或禁止換行。

每個縣市列使用邏輯方向的 padding（`padding-inline`／`padding-block`），確保中文名稱不貼近左側圓角。數字靠尾端對齊，使用 tabular numerals。

## 六、色彩與 Design Tokens

現行 `--color-uvi-*` 在 2026-08-31 為文字與白字底色的 WCAG 對比而壓暗。不得直接把它們全域替換成亮色，否則可能讓其他頁面的文字／徽章退化。

在 `DESIGN.md` 和 `packages/ui/src/styles.css` 新增用途明確的 UV 視覺化 token，供地圖、圖例與淡色長條使用：

- `--color-uvi-visual-low`
- `--color-uvi-visual-moderate`
- `--color-uvi-visual-high`
- `--color-uvi-visual-very-high`
- `--color-uvi-visual-extreme`
- `--uv-distribution-item-radius`
- `--uv-distribution-item-padding-inline`
- `--uv-distribution-item-padding-block`
- `--uv-distribution-row-gap`
- `--uv-distribution-column-gap`
- `--uv-distribution-group-gap`

亮色以產品端提供的綠、黃、橙、紅、紫色階為設計起點。地圖可使用實色；列表長條使用 `color-mix()` 產生淡色底，主要文字仍使用 `--text-body`／`--text-primary`。顏色只作為冗餘提示，縣市名稱、數值與圖例級距必須同時存在。

Token 應進入現有 `DESIGN.md → styles.css → tokens.test.ts` 漂移守門，不在 scoped CSS 內寫 Hex、圓角或間距字面值。

## 七、字體與字級 Token

不新增第八套字級。依現行七角色量表使用：

| 內容 | Typography role／token | 理由 |
| --- | --- | --- |
| 「今日全臺分布」 | `section-title`：`--font-family-section-title`、`--font-size-section-title`、`--font-weight-section-title`、對應行高與字距 | 無卡片外框的主要頁面區段標題 |
| 「北部／中部／南部／東部／外島」 | `card-title`：`--font-size-card-title`、`--font-weight-card-title` | 五個資料群組的可見標題，層級低於 section title、高於清單列 |
| 縣市名稱 | `supporting`：完整 supporting family／size／weight／line-height／letter-spacing token | 22 筆密集但必須可讀的輔助資料 |
| UV 數值 | `stat-figure` ＋ supporting 字級 | 保留等寬字與 `tabular-nums`，不另外放大造成名稱和數字基線不齊 |
| 圖例文字 | `supporting` | 圖例是必要輔助資訊，不降成難讀的 caption |
| 目前地區與變更連結 | `body` | 這是使用者可操作的目前設定，不應被視為次要註腳 |
| 金門／馬祖地圖標籤 | `caption` | 地圖內的小型定位標註；下方清單仍提供完整等價文字 |

角色應以既有 `data-typography-role` 或共用 class 套用完整字體契約，不能只拿 `font-size` 而漏掉 family、weight、line-height 和 letter-spacing。標題與縣市名稱允許自然換行，不使用 `<br>`、nowrap、ellipsis、裁切或固定兩行。

## 八、長條圖

長條寬度使用固定滿格門檻 UVI 11：

- UVI 0 對應 0%。
- UVI 1–10 依比例延伸。
- UVI 11 及以上為 100%。
- 數字顯示原始值，不因封頂而改寫。

計算函式回傳 0–1 的有限比例；元件只將比例傳給 CSS custom property。這個動態值屬於資料，不是設計常數，因此可使用 typed style binding；顏色、圓角、padding 與 gap 不可放進 inline style。

## 九、地圖與離島

保留目前「同色填色＋同色描邊」的幾何修補，避免鄉鎮環顯示成馬賽克或產生白縫。

金門與連江列入明確的 inset 設定表，設定表集中保存縮放、位置與短標籤，不在 template 分散條件。兩者應適度放大並顯示「金門」「馬祖」標籤，標籤外觀使用共用 surface、border、radius 與 caption typography token。

澎湖先保留在接近實際地理位置的主圖；若 320px 實際畫面仍辨識困難，再納入同一 inset 設定表。不得為了視覺方便修改來源行政區幾何。

目前地區標記維持小環，不用整個縣市外框，避免暴露 368 條鄉鎮內部界線。

## 十、無障礙與錯誤狀態

- 地圖維持 `aria-hidden="true"`；下方可選取文字清單是等價內容。
- 圖例不可只顯示色點，必須包含數字級距及等級名稱。
- 五個分區使用正確 heading 層級，清單維持 `ul`／`li` 語意。
- 色彩不是唯一的風險載體。
- 全臺資料為 null 時沿用現況：整個附加視覺化區塊不渲染，不影響五日預報主功能。
- 未設定地區時顯示「尚未設定地區」與「設定地區」，不捏造地區名稱。

## 十一、測試與驗證

實作採 TDD，先建立會因缺少功能而失敗的測試：

1. 五區順序固定且每個區域顯示可見標題。
2. 22 縣市每筆恰好出現一次，分區歸屬正確。
3. 未知縣市代碼會暴露錯誤，不會靜默消失。
4. 地圖、圖例與列表的 class／標籤來自同一展示字典。
5. UVI 0、區間值、11 與 11 以上的 fill ratio 正確。
6. 列表單列元件有名稱與真實數值，沒有 `border-bottom`／`hr`。
7. 色彩、間距、圓角與 typography 使用既有或新增 token，不在 scoped style 寫死。
8. 目前地區列在全臺分布標題與分隔線之前。
9. 金門與連江使用 inset，且有「金門」「馬祖」標籤。
10. 保留地圖同色 fill／stroke 與非零 stroke-width 的既有防退化測試。

自動驗證至少執行針對性 Vitest、`pnpm typecheck`、`pnpm lint` 和完整 `pnpm check`。視覺驗證至少涵蓋 320px、390×844 與桌面寬度，確認：

- 縣市文字不貼圓角。
- 五區層級清楚，沒有 22 條分隔線噪訊。
- 圖例自然換行且不截字。
- 金門、馬祖不是難以辨認的污點。
- 色條不蓋住文字，數字尾端對齊。
- 200% 縮放仍可自然閱讀。

## 十二、完成條件

只有在元件與共用邏輯完成、針對性測試與完整檢查通過、視覺尺寸經實際檢查，且沒有破壞既有五日預報、地圖幾何與無障礙等價內容時，才能將本任務標為完成。單獨的綠色測試或建置成功不能替代瀏覽器視覺驗證。
