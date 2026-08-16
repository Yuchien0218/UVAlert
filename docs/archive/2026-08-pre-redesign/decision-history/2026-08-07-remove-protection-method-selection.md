# 裁決：移除逐部位的防護方式選擇

**日期**：2026-08-07
**狀態**：程式已實作，規格待回寫

---

## 裁決內容

設定流程**不再逐部位詢問防護方式**。使用者只選「要追蹤哪些部位」，
追蹤中的部位一律視為 `skinExposureStatus: "exposed"` +
`methodComponents: ["sunscreen"]`。

被衣物遮住、不需要提醒的部位，由使用者選擇「不追蹤」即可，
不再有「被衣物完整遮住」這個選項。

### 理由

本 App 聚焦「擦防曬乳的補擦倒數提醒」。逐部位問「已擦防曬產品／被衣物完整遮住」
對使用者過於瑣碎，而「不追蹤」已經能表達「這個部位不用提醒」。

### Session 進行中被遮住時

**什麼都不做，倒數照跑。** 不提供暫停機制。

誤差方向是「提醒過頭」而非「該提醒沒提醒」，屬安全方向。
使用者覺得不需要時忽略該則提醒即可。

---

## 連帶影響

### 一併作廢

- S-04 的 0-2-3 三層揭露（2026-08-07 稍早才實作，本裁決後整個拿掉）
- `其他外用產品`（`other_topical`）在設定流程中的入口
- 批次設定「全部已擦防曬／全部衣物覆蓋」
- 「全衣物覆蓋跳過產品與時間」分支

### 資料模型不變

`MethodComponentSchema` enum、reducer、規則表、persistence **完全未動**。
`exposed` + `["sunscreen"]` 本來就是 `commands.ts` 驗證的合法組合，
不需要 migration，舊資料仍可讀。

`other_topical` 仍存在於資料模型與 S-08 補擦流程的部位篩選中。

### 新的既定後果：產品變成必填

所有追蹤部位都是 sunscreen，因此**建立 Session 一定需要產品標示**。
過去可用「全部衣物覆蓋」繞過產品設定，現在沒有這條路。
首次使用者必須先到 `/products` 完成標示才能開始提醒。

---

## 程式改動

| 檔案 | 改動 |
| --- | --- |
| `components/setup/ZoneProtectionForm.vue` | 重寫為純部位選擇器 |
| `components/setup/ProtectionAdjustmentSheet.vue` | 標題改「調整追蹤部位」 |
| `components/setup/QuickProtectionSummary.vue` | 按鈕改「調整追蹤部位」 |
| `components/setup/SetupCompletionSummary.vue` | 移除防護方式欄 |
| `pages/setup/SetupTimingPage.vue` | 更新提示文案 |
| `components/setup/SetupFlowComponents.test.ts` | S-04 測試重寫為 6 則 |

驗證：build 通過、252 個測試通過、瀏覽器完整流程走到 `/reminder?started=1`。

---

## 規格回寫（已完成 2026-08-07）

| 文件 | 改動 |
| --- | --- |
| `防曬晴報員PRD.md` §5.2 第 5 點 | 改寫為「只問追蹤部位」，說明等價性與不暫停的安全方向 |
| `防曬晴報員PRD.md` §5.1 第 4 點、第 9 點 | 移除防護方式敘述；載明產品變必填 |
| `防曬晴報員PRD.md` **AC-26** | **整條刪除**，編號保留不再使用 |
| `防曬晴報員PRD.md` AC-41 | 新增 Scenario F：遮蔭屬情境而非部位方法 |
| `防曬晴報員PRD.md` AC-34 | 刪 Scenario A／B（依賴衣物與批次），原 C 升為 B，標題改「部位組合與快速提醒摘要」 |
| `P0_SCREEN_INVENTORY.md` S-04 | 標題改「追蹤部位」，揭露層次整節重寫為部位核取清單 |
| `P0_RELEASE_MANIFEST.md` | 方法相關 6 項檢查改為 5 項部位選擇檢查 |
| `P0_COPY_DECK.md` | CP-SETUP-006／007 改寫；007a、008、008a 刪除 |
| `P0_REMINDER_RULE_DECISION_TABLE.md` | DT-METHOD-01 加註「規則不變、設定流程不可達」 |
| `P0_REQUIREMENT_TRACEABILITY_MATRIX.md` | AC-26 標 REMOVED，UT-VALIDATION-001 移除 AC-26 連結 |

### 為什麼是「刪除 AC-26」而不是「改寫」

先前規劃過改寫成三條新 Scenario，查核後發現**全部與既有 AC 重複**：

| 原斷言 | 已被涵蓋 |
| --- | --- |
| 穩定 `zoneInstanceId`、同一 Session 不重複 | AC-94 |
| 產品不具資格時不製造倒數 | AC-86 |
| 局部更新不改動其他部位、以最需注意部位彙總 | AC-07、AC-82 |
| 遮蔭只記在情境 | 全 AC 區唯一一處 → 移入 AC-41 Scenario F |

AC-07 逐字寫著「其他部位完全不變，Session 仍以最需要注意的外露部位作彙總」，
即原 AC-26「不得因臉部已記錄塗抹而消失」的完整等價。改寫只會製造第三份重複。

---

## 未決事項

- 追溯矩陣原本把 AC-26 標為 `SPECIFIED` 並指向 `UT-VALIDATION-001`，
  但實際測試對 `other_topical` **零覆蓋** —— 該條追溯本來就是虛的。
  AC-26 已移除，但 `UT-VALIDATION-001` 對 AC-34、88 的覆蓋是否同樣虛假，值得另查。

---

## 相關

- [[2026-08-07-s04-disclosure-implementation]] —— 本裁決使該計畫作廢
- [[2026-08-07-sitemap-branch-flows]] —— S-04 列需同步更新
