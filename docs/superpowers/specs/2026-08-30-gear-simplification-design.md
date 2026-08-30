# 裝備區簡化：規格草案（待裁決）

**狀態：草案，尚未動工。** 這份文件回答 `docs/decisions/2026-08-30-pending-decisions.md` 第四節列的三個問題，並補上探索後才發現的第四個問題——那個問題會改變這件事的性質。

**使用者的方向（2026-08-30 裁決）**：「裝備區只是記錄買過的防曬乳（期限、價格、好不好用），屬於附加價值，現在太複雜。」

---

## 一、先講最重要的發現：這不是單純的刪減

裁決的字面是「把倒數相關的欄位整批拿掉」。但把現況攤開之後，有兩件事跟字面不一樣：

### 1.1 使用者要的三樣東西，有兩樣現在不存在

| 使用者要的   | 現況                                         |
| ------------ | -------------------------------------------- |
| 期限         | ✅ 有 `expiryDate`（`YYYY-MM-DD`）           |
| **價格**     | ❌ **schema 裡沒有這個欄位**                 |
| **好不好用** | ❌ **沒有評價欄位**；只能寫進自由文字 `note` |

所以這件事是「刪倒數欄位」**加上**「新增紀錄欄位」，不是只有刪。工作量與風險都比字面大。

### 1.2 刪掉包裝標示會讓倒數變得**比較不保守**

這一點必須先講清楚，因為它與 2026-08-30 `5015397` 的論證方向相反。

`5015397`（沒有產品標示時也建立 120 分鐘保守倒數）的理由是：

> 產品標示只會讓間隔變短（`Math.min(GENERAL_MAX_MINUTES, 標示分鐘)`），沒有標示時的值本來就是 120，所以擋住倒數並沒有比較保守。

反過來讀就是：**有標示時，標示會讓倒數變得更短、也就是更保守。** 移除包裝標示欄位，等於拿掉「使用者可以讓提醒更嚴格」的能力。

實測（`grep` 全 `packages/domain/`）進入 reducer 的產品欄位只有這些：

| 欄位                                                           | 作用                                                                                     |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `reapplicationIntervalStatus` / `reapplicationIntervalMinutes` | 讓一般補擦間隔短於 120 分鐘                                                              |
| `preExposureWaitStatus` / `preExposureWaitMinutes`             | 擦上後的等待時間（`LABEL_WAIT_ACTIVE`）                                                  |
| `waterResistanceStatus` / `waterResistanceMinutes`             | 耐水期限（40／80 分鐘）。**這條要求 `eligible`，沒有標示就算不出來，不是保守預設能補的** |
| `ruleEligibilityAtApplication`                                 | 由 identity／expiry／condition／sunscreenClaim 推導                                      |
| `expiryDate`                                                   | 推導 `expiryStatus`，過期不建立期限                                                      |

**完全不進 reducer 的欄位**（`grep spf|paGrade packages/domain/` 零結果）：

`spf`、`paGrade`、`purchaseMonth`、`note`、`archivedAt`、`displayName`

**所以「倒數相關欄位」≠「包裝標示卡」。** SPF／PA 明明長得最像「規格」，卻是純展示；真正影響倒數的是那三組看起來很囉唆的問答。

---

## 二、回答 pending-decisions §4 的三個問題

### 問題 1：「包裝標示確認」整張卡是不是全部拿掉？SPF／PA 還留不留？

**建議：SPF／PA 留下，包裝標示問答改為選填的收合區塊，不整張刪。**

- **SPF／PA 留**：它們正是「認出這罐是哪一罐」用的，屬於純紀錄，與使用者的方向一致，而且完全不進 reducer，留著零風險。現在的 helper 文字已經寫明「只用來認出這罐是哪一罐，**不影響補擦倒數**」。
- **包裝標示問答不整張刪**：見 §1.2——刪掉就永遠只能用 120 分鐘，而耐水期限會直接消失。但它可以**預設收起**，讓不想填的人完全不必看到（`ProductSnapshotEditor` 已經支援 `collapsible`）。

**如果你要的就是「連耐水期限一起放棄」**，那是可以的裁決，但要明確知道代價：下水後的補擦提醒會退回一般間隔。這件事我不會替你決定。

### 問題 2：已經存了標示資料的使用者，那些欄位怎麼處理？

**答：如果採上面的建議（保留欄位、只改版面），完全不需要遷移。**

如果最後決定真的移除欄位：Zod 預設 strip 未知欄位，舊資料仍能解析，**移除欄位不需要資料遷移**（`user-preferences-v1` 移除 `appearance` 就是這樣處理的，見 `DESIGN.md` 第十節）。

但有一個**不能忽略的例外**：`ProductLabelSnapshotV1Schema` 有 `superRefine`，強制「`explicit_minutes` 與分鐘數必須一致」「耐水分鐘數必須與 40／80 標示一致」。移除欄位時如果只刪 UI 不刪 schema，舊資料仍會帶著值；如果刪了 schema 欄位而 snapshot 建構端沒同步，`superRefine` 會讓既有紀錄解析失敗。`deriveRuleEligibility` 的註解已經警告過這類「四份各自維護的 ternary 遲早會漂移」。

### 問題 3：「這件裝備不會建立補擦倒數」那張 124px 的卡

**建議：直接刪，稽核是對的。** 已核對程式碼：

- 那張卡是 `GearForm.vue` 的 `.no-effect-note`（`v-else`，只在 `eyewear`／`other_gear` 出現）
- 品類格下方的 `.category-effect` 已經在講同一件事：`GEAR_CATEGORY_REMINDER_EFFECT.eyewear` ＝「只做紀錄，不會影響補擦倒數。」

同一畫面、相距兩個區塊、講同一件事，其中一個還佔整張卡。刪 `.no-effect-note`，保留 `.category-effect`（它貼著品類選擇，是做決定的當下會看的位置）。

> **但 `GearCategorySchema` 的註解明文要求**：「UI 必須明示這件事——使用者記錄一副墨鏡時不得以為提醒行為會改變。」刪掉整張卡後，這個要求由 `.category-effect` 承擔。**這一條要補守門測試**，否則之後有人把 `.category-effect` 也收掉，契約就靜默破了。

---

## 三、建議的目標版面

現在是四張等重的卡（＋標示卡內部還有 3–4 個問答卡）。建議改成三層：

```
① 這是什麼            品類（icon-first 兩欄）＋ 一行「會不會影響倒數」
② 認出這一罐（必填）   暱稱 ・ SPF ・ PA
③ 我的紀錄（選填）     購買月份 ・ 到期日 ・ 價格 ・ 好不好用 ・ 備註
   ▸ 包裝標示（選填，預設收起）  ← 只有 sunscreen／clothing 出現
```

理由：

- **必填與選填在視覺上分層**，解決稽核的「四張等重的卡」
- **「我的紀錄」正是使用者說的那件事**（期限、價格、好不好用），它從附屬欄位升級成一個有名字的區塊
- **包裝標示降級成選填收合**，不刪除能力，但不再擋在路上。用 `DESIGN.md` 第五節的「標籤化按鈕」觸發器，文案自帶說明：「填寫包裝標示，讓提醒更貼近這瓶（選填）」

### 兩個新欄位的規格

| 欄位          | 型別                                                      | 說明                                                 |
| ------------- | --------------------------------------------------------- | ---------------------------------------------------- |
| `priceTwd`    | `z.number().int().nonnegative().nullable().default(null)` | 新台幣整數。不進 reducer                             |
| `usageRating` | `z.enum(["good","ok","bad"]).nullable().default(null)`    | 三檔就夠——這是「好不好用」不是評分網站。不進 reducer |

兩個都是新增的**選填**欄位，所以 `PRODUCT_CATALOG_RECORD_VERSION` 要從 `1.1.0` 升到 `1.2.0`。

> **新增必填欄位才需要升版**（CLAUDE.md）。這裡兩個都可選且有 `default(null)`，舊紀錄解析不會壞——但 `schemaVersion` 是 `z.literal()`，literal 不升版舊紀錄反而會過不了。**這一點動工時要先寫測試確認**，不要照文件推論。

---

## 四、範圍與成本

**會動到的檔案**（初估）：

- `packages/contracts/src/product.ts`：兩個新欄位、版本常數
- `packages/contracts/src/versions.ts`：版本常數
- `apps/web/src/components/product/GearForm.vue`：版面重組、刪 `.no-effect-note`、兩個新欄位
- `apps/web/src/components/product/ProductSnapshotEditor.vue`：預設收起
- `apps/web/src/pages/ProductDetailPage.vue`／`ProductsPage.vue`：顯示新欄位
- 同步層：`ProductCatalogSyncRecordSchema` 要跟上

**測試面**：10 個測試檔碰到標示欄位，7 個碰到 GearForm／ProductSnapshotEditor／ProductCatalogRecord。**不重疊的部分要各自確認**，這是主要成本。

**驗收基準**（沿用稽核的實測值）：

| 項目                             | 現況   | 目標                             |
| -------------------------------- | ------ | -------------------------------- |
| `/products/new` 總高（防曬乳）   | 1633px | 顯著下降（收起標示後）           |
| `/products/new` 總高（太陽眼鏡） | 1294px | 顯著下降（刪 `.no-effect-note`） |
| 講「不影響倒數」的地方           | 2 處   | 1 處                             |
| 等重的卡                         | 4 張   | 3 層，必填／選填分明             |

---

## 五、動工前需要你裁決的三件事

1. **耐水期限要不要保留？** 建議保留（收合成選填）。若要連它一起放棄，下水後的提醒會退回一般間隔——這是安全相關的取捨，我不替你決定。
2. **「好不好用」要三檔（好／普通／不好）還是自由文字就夠？** 建議三檔，因為自由文字無法排序或篩選，等於還是只有 `note`。
3. **價格要記幣別嗎？** 建議不要，只存新台幣整數。加幣別等於要處理匯率與顯示格式，與「附加價值的小紀錄」不相稱。

---

## 六、這份草案沒有做的事

- **沒有動任何程式碼。** 這是規格草案。
- **沒有實測新版面。** 版面提案是根據稽核既有的量測值與現況程式碼推的，動工後要重新量。
- **沒有處理 `/products` 列表頁與 `ProductDetailPage`。** 它們會受新欄位影響，但先把 `/products/new` 的結構定下來再說。
