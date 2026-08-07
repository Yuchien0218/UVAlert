# 防曬晴報員 P0 Reminder Rule Decision Table

| 文件資訊 | 內容 |
| --- | --- |
| 對應 PRD | `防曬晴報員PRD.md` v3.9 |
| 對應交付清單 | `P0_RELEASE_MANIFEST.md` v0.3 |
| 對應畫面規格 | `P0_SCREEN_INVENTORY.md` v0.5 |
| 文件版本 | 0.3 |
| 狀態 | P0 Reducer／測試基準草案 |
| 建立日期 | 2026-07-29 |
| 最近更新 | 2026-08-07 |

> 本文件把 PRD 的提醒規則整理成工程可執行的決策表與固定測試向量，不新增安全曝曬時間、SPF 乘法、UVI 時間倍率或醫療推論。正式啟用的每個 `ruleId` 仍必須存在於核准的 ReminderRuleSet，並透過 ReminderRuleEvidenceLink 連到有效 Claim Registry 項目。

---

## 1. 目的與適用範圍

本文件定義 P0 Guest 本機 reducer 如何從不可變事件重建：

- `currentApplication`
- `activeLabelReadyAt`
- `generalDueAt`
- `activeWaterDeadline`
- `eventTriggeredDeadline`
- `zoneDueAt`
- `zoneNextActionAt`
- `recordStatus`
- `timingStatus`
- `sessionNextDueAt`
- `overallStatus`
- `primaryAction`

同一套規則與測試向量應可在 P1 後端重用。P0 與 P1 不得各自實作不同的提醒公式。

本文件不處理：

- 個人曬傷、MED 或安全曝曬時間。
- 疾病、藥物、療程或膚型的個人倍率。
- P1 遠端通知的 Job／Bundle／Delivery。
- P2 感測器、AI 標籤辨識或自動情境判定。
- `general_unlocalized` 整體提醒模式。

---

## 2. Reducer 基本原則

1. 事件是稽核真值，`ProtectionZoneState` 是可重建衍生狀態。
2. 每個 zone instance 獨立歸納，最後才建立 Session 彙總。
3. 使用業務時間 `effectiveOccurredAt／appliedAt` 判斷因果，不使用 HTTP 抵達時間。
4. 同時點無法確認先後時採保守結果：Application 必須嚴格晚於一般事件原因才可解除。
5. `currentApplication` 先選目前實際使用的最新 Application，再判斷資格；不得略過較新的不合格產品回退舊產品。
6. 移除 sunscreen 或停止追蹤會關閉目前 activation；重新啟用不得復活舊 Application。
7. UVI、SPF、PA、shade context 與室內外情境不得延長產品期限。
8. 沒有可信期限時顯示行動卡，不製造 `00:00`、任意分鐘或安全百分比。
9. 所有 mutation 以 idempotency key 原子套用；失敗不留下部分事件或部分狀態。
10. 更正不覆寫原事件；只使用唯一更正鏈的有效 leaf 重建。

---

## 3. 標準時間與集合函式

### 3.1 時間

- 文件範例均使用同一天的 UTC 或已正規化時間。
- 實作一律以 UTC instant 比較。
- UI 時區只影響顯示，不影響 reducer。
- `trustedNow` 必須來自有效 ClockCalibration。

### 3.2 `minNonNull`

```text
minNonNull(values):
  忽略 null
  至少一個非 null → 回傳最小值
  全部為 null → 回傳 null
```

### 3.3 穩定排序

```text
effectiveOrder(event):
  1. effectiveOccurredAt
  2. 已確認的原子 command 關係
  3. P1 serverAppliedSequence
     或 P0 等效 localAppliedSequence
  4. 穩定 event ID，僅作最後 tie-break
```

穩定序號只用於同時點重建及 command 邊界，不得把較晚抵達的封包誤當成較晚發生。

---

## 4. 輸入資料契約

### 4.1 Session

```text
sessionId
rulesetVersion
revision
overallStatus
initialContext
currentContext
shadeContext
endedAt?
```

### 4.2 Zone

```text
zoneInstanceId
bodyZoneCode
trackingStatus
skinExposureStatus
methodCertainty
methodComponents: Set<
  sunscreen | clothing | other_topical
>
```

### 4.3 Application

```text
applicationConfirmationId
zoneInstanceIds[]
appliedAt
effectiveOccurredAt
productId?
productLabelSnapshotV1
ruleEligibilityAtApplication
labelReadyAt?
commandOrder
```

### 4.4 ProductLabelSnapshotV1 必要規則欄位

```text
productIdentityStatus
preExposureWaitStatus
preExposureWaitMinutes?
reapplicationIntervalStatus
reapplicationIntervalMinutes?
waterResistanceStatus
waterResistanceMinutes?
ruleEligibilityAtApplication
capturedAt
```

以下欄位不得參與 reducer：

- SPF 數字或 band。
- PA。
- broad-spectrum／UVA 自由文字。
- 產品暱稱與品牌。
- 購買日期。
- 私人備註。
- `rawInstructionText`。

### 4.5 一般事件原因

```text
causeId
causeType:
  water_end | heavy_sweat | towel |
  friction | hand_wash | water_start_unknown
effectiveOccurredAt
zoneInstanceIds[]
deadlineEligibility:
  known_time | untimed
correctionState
```

### 4.6 產品安全事件

```text
eventType:
  product_abnormal_reported |
  product_discomfort_reported
sourceProductId?
productSnapshotFingerprint
zoneInstanceIds[]
effectiveOccurredAt
```

---

## 5. StartSession 方法合法性

P0 新建 Session 每個 active zone 只接受 `methodCertainty=confirmed`。

### DT-METHOD-01：合法方法組合

| skinExposureStatus | methodCertainty | methodComponents | 新建是否合法 | recordStatus |
| --- | --- | --- | --- | --- |
| exposed | confirmed | `{sunscreen}` | 是 | sunscreen_recorded |
| exposed | confirmed | `{other_topical}` | 是 | none_reported |
| exposed | confirmed | `{sunscreen, other_topical}` | 是；但現行同次多產品限制仍須由 Application partition 驗證 | sunscreen_recorded |
| clothing_covered | confirmed | `{clothing}` | 是 | physical_method_reported |
| clothing_covered | confirmed | `{clothing, sunscreen}` | 是 | mixed |
| clothing_covered | confirmed | `{clothing, other_topical}` | 是 | physical_method_reported |
| clothing_covered | confirmed | `{clothing, sunscreen, other_topical}` | 是；須有明確 Application partition | mixed |
| exposed | confirmed | `{}` | 否 | 不建立 |
| exposed | confirmed | 含 `clothing` | 否 | 不建立 |
| clothing_covered | confirmed | 不含 `clothing` | 否 | 不建立 |
| unknown | confirmed | 任意 | 否 | 不建立 |
| 任意 | confirmed | 有重複 component | 否 | 不建立 |
| exposed | none_reported | `{}` | 只允許舊資料／遷移／復原 | none_reported |
| exposed | unknown | `{}` | 只允許舊資料／遷移／復原 | unknown |
| unknown | unknown | `{}` | 只允許舊資料／遷移／復原 | unknown |
| 任意 | none_reported／unknown | 非空集合 | 否 | 驗證錯誤 |

新建命令出現非法組合時，整個 `StartSessionCommandV1` 回傳／產生 `METHOD_CONFIRMATION_REQUIRED` 或相應驗證錯誤，不留下任何 Session、zone 或 Application。

### DT-METHOD-02：是否要求 Application

| 方法組成 | 是否要求塗抹時間 | 是否要求 Application group／event |
| --- | ---: | ---: |
| `{clothing}` | 否 | 否 |
| 含 `sunscreen` | 是 | 是 |
| 含 `other_topical` | 是 | 是 |
| 全 Session 全部 `{clothing}` | 否 | 必須為空 |

---

## 6. Application Confirmation Group 驗證

### DT-APP-GROUP-01

| 條件 | 結果 |
| --- | --- |
| `confirmedZoneInstanceIds[]` 為空 | 拒絕 record／replace |
| 任一 ApplicationEvent 的 `zoneInstanceIds[]` 為空 | 拒絕 |
| 同組事件的 zone 集合互相重疊 | `APPLICATION_ZONE_PARTITION_INVALID` |
| 所有事件聯集不等於 confirmed 集合 | `APPLICATION_ZONE_PARTITION_INVALID` |
| group、events 的 appliedAt／effectiveOccurredAt 不完全相等 | 拒絕 |
| 同一確認組使用一個或多個互斥產品分區 | 接受 |
| `productId=null` 但有合法 snapshot | 接受 Session-only 產品 |
| `productId=null` 且缺 snapshot | 拒絕 |
| correction action=void | 不建立新的 ApplicationEvent |
| correction target 不是唯一有效 leaf | `CORRECTION_CONFLICT` |

目前模型不支援同一部位同一次疊擦多項產品。不得依 ApplicationEvent 順序猜測主要產品。

---

## 7. 產品期限資格

### 工作 `ruleId`

- `RR-P0-ELIGIBILITY-001`：合格防曬 snapshot 才可建立期限。
- `RR-P0-ELIGIBILITY-002`：已過期、異常、不適、無防曬宣稱或身分未知不得建立期限。
- `RR-P0-ELIGIBILITY-003`：最新不合格 Application 不得回退舊合格 Application。

這些是工作識別碼；上線前必須加入核准 ruleset 及 Evidence Link。

### DT-ELIGIBILITY-01：`ruleEligibilityAtApplication`

| productIdentityStatus | 效期／狀況 | Snapshot 結果 | 可建立一般期限 | 可建立水上期限 |
| --- | --- | --- | ---: | ---: |
| confirmed_sunscreen | 未知效期、無異常 | eligible | 是 | 另看耐水標示 |
| confirmed_sunscreen | 效期在 appliedAt 當日或之後 | eligible | 是 | 另看耐水標示 |
| confirmed_sunscreen | expiry < appliedAt | expired | 否 | 否 |
| confirmed_sunscreen | user_reported_abnormal | abnormal | 否 | 否 |
| confirmed_sunscreen | user_reported_discomfort | user_discomfort | 否 | 否 |
| confirmed_no_sunscreen_claim | 任意 | no_sunscreen_claim | 否 | 否 |
| unknown | 任意 | identity_unconfirmed | 否 | 否 |

補充：

- 效期未知且無安全事件時，不自行套用通用開封期限。
- SPF、PA 或 broad-spectrum 缺值不會單獨使已確認防曬產品失去一般期限資格。
- water resistance 未知不影響一般期限資格，只使水上期限為 null。
- eligibility 在 Application 建立時寫入不可變 snapshot；產品主檔日後修改不回溯改寫該 snapshot。
- 進行中發生 ProductSafetyEvent 時，snapshot 不變，但目前期限被安全封鎖失效。

### 裝備品類的前置過濾（2026-08-06 裁決）

S-11 擴為防曬裝備清單後，`SunscreenProducts` 新增 `gearCategory`。
本表**只適用於 `gearCategory === "sunscreen"` 的紀錄**。

| `gearCategory` | 是否進入本表 | 說明 |
| --- | --- | --- |
| `sunscreen` | 是 | 依 DT-ELIGIBILITY-01 判定 |
| `clothing` | 否 | 是 methodComponent，覆蓋期間本就不倒數 |
| `eyewear` | 否 | 無對應 `BODY_ZONE`，純紀錄 |
| `other_gear` | 否 | 純紀錄 |

非 `sunscreen` 品類不得進入產生期限的 snapshot 路徑，也不會產生
`identity_unconfirmed` 之類的 eligibility 結果——它們根本不參與本表。

`expiryDate` 取代 `expiryStatus` 後，DT-ELIGIBILITY-01 的
`expiry < appliedAt` 判定改以 `expiryDate` 為準；**判定結果與既有行為相同**，
`RR-P0-ELIGIBILITY-002` 與全部固定測試向量不變。

---

## 8. 目前方法 activation 與 currentApplication

### 工作 `ruleId`

- `RR-P0-ACTIVATION-001`：移除／重啟 sunscreen 不復活舊 Application。
- `RR-P0-CURRENT-APP-001`：依 activation 邊界選最新 Application，不先篩資格。

### DT-ACTIVATION-01：目前 activation 起點

| 情境 | `currentSunscreenMethodEnabledAt` |
| --- | --- |
| StartSession 初始含 sunscreen，且同 command 有 Application | 該 Application.appliedAt |
| StartSession 初始含 sunscreen，但命令非法地沒有 Application | 驗證失敗，不進 reducer |
| 後續由不含 sunscreen 改為含 sunscreen，同 command 有 Application | 新 Application.appliedAt |
| 後續由不含 sunscreen 改為含 sunscreen，沒有 Application | ZoneMethodEvent.effectiveOccurredAt；在新 Application 前無期限 |
| tracking_ended 後重新 tracking_started，同 command 有 Application | 新 Application.appliedAt |
| tracking_ended 後重新啟用但沒有 Application | tracking_started.effectiveOccurredAt；舊 Application 不可引用 |

### currentApplication 演算法

```text
candidateApplications =
  所有未被 replace／void 的 Application
  WHERE zoneInstanceId in Application.zoneInstanceIds
  AND application.commandOrder >= currentActivationCommandOrder
  AND application.appliedAt >= currentSunscreenMethodEnabledAt

currentApplication =
  candidateApplications
  依 appliedAt、effectiveOrder 排序後的最後一筆
```

重要限制：

- 不先以 `eligible` 過濾。
- 最新 Application 若不合格，期限為 null。
- 不得回退到更早的合格 Application。
- 初始同 command 的 appliedAt 可早於 SessionStartedEvent 建立時間。

---

## 9. 一般期限

### 工作 `ruleId`

- `RR-P0-GENERAL-001`：一般提醒保守上限 120 分鐘。
- `RR-P0-GENERAL-002`：明確且更短的產品標示優先。
- `RR-P0-GENERAL-003`：較長標示不得延長 120 分鐘上限。
- `RR-P0-GENERAL-004`：衣物覆蓋、非防曬方法或安全封鎖不建立一般期限。

### DT-GENERAL-01：間隔

| reapplicationIntervalStatus | minutes | `generalInterval` |
| --- | ---: | ---: |
| explicit_minutes | 1–119 | 標示 minutes |
| explicit_minutes | 120 | 120 分鐘 |
| explicit_minutes | >120 | 120 分鐘 |
| no_numeric_interval | null | 120 分鐘 |
| unknown | null | 120 分鐘 |
| explicit_minutes | null／非正整數 | snapshot 非法，拒絕 Application |
| 非 explicit_minutes | 非 null | snapshot 非法，拒絕 Application |

```text
confirmedLabelInterval =
  snapshot.reapplicationIntervalMinutes
  only if status=explicit_minutes

generalInterval =
  minNonNull(120 minutes, confirmedLabelInterval)
```

### DT-GENERAL-02：`generalDueAt`

| tracking | exposure | method 含 sunscreen | currentApplication | eligible | safety block | 結果 |
| --- | --- | ---: | --- | ---: | ---: | --- |
| active | exposed | 是 | 有 | 是 | 否 | `appliedAt + generalInterval` |
| active | exposed | 是 | 有 | 否 | 任意 | null |
| active | exposed | 是 | 無 | 任意 | 任意 | null |
| active | exposed | 否 | 任意 | 任意 | 任意 | null |
| active | clothing_covered | 任意 | 任意 | 任意 | 任意 | null |
| ended | 任意 | 任意 | 任意 | 任意 | 任意 | null |
| active | exposed | 是 | 有 | 是 | 是 | null |

```text
generalDueAt =
  currentApplication.appliedAt + generalInterval
  only when:
    latest trackingStatus = active
    AND skinExposureStatus = exposed
    AND methodComponents contains sunscreen
    AND currentApplication exists
    AND ruleEligibilityAtApplication = eligible
    AND activeProductSafetyBlock = false
  otherwise null
```

UVI、SPF、PA、室內、窗邊及遮蔭不出現在此公式。

---

## 10. 曝曬前等待

### 工作 `ruleId`

- `RR-P0-LABEL-WAIT-001`：只有明確分鐘產生 `labelReadyAt`。
- `RR-P0-LABEL-WAIT-002`：等待只代表依標示操作，不代表安全。

### DT-LABEL-01

| preExposureWaitStatus | minutes | `labelReadyAt` |
| --- | ---: | --- |
| explicit_minutes | 正整數 | `appliedAt + minutes` |
| no_instruction | null | null |
| unknown | null | null |
| explicit_minutes | null／非正整數 | snapshot 非法 |
| 非 explicit_minutes | 非 null | snapshot 非法 |

`activeLabelReadyAt` 只有在以下條件同時成立時參與目前 zone：

- tracking active。
- current method 含 sunscreen。
- currentApplication 是目前 activation 的 Application。
- currentApplication eligible。
- 無 active ProductSafetyBlock。
- `trustedNow < labelReadyAt`。

若 `zoneDueAt <= trustedNow` 或有更高優先無時間狀態，畫面不得用 LABEL_WAIT 蓋掉更急迫行動。

---

## 11. 水上活動區間驗證

### 工作 `ruleId`

- `RR-P0-WATER-001`：只有可信入水起點與有效 40／80 標示建立水上期限。
- `RR-P0-WATER-002`：未知起點使用無時間保守行動。
- `RR-P0-WATER-003`：同一 active 水上區間中補擦不重設水上期限。
- `RR-P0-WATER-004`：未補擦再次入水不得取得新期限。

### DT-WATER-INTERVAL-01：事件合法性

| 條件 | 結果 |
| --- | --- |
| water_start 有新 activityIntervalId、非空 zone 集合 | 可繼續驗證 |
| Session 已有未關閉水上區間 | 拒絕重疊 |
| confirmed 起點且 activityStartedAt 非空、不晚於 effectiveOccurredAt／trustedNow | 合法 |
| confirmed 起點但 activityStartedAt 為空或在未來 | 拒絕 |
| unknown 起點且 activityStartedAt=null | 合法，但無水上期限 |
| unknown 起點卻有 activityStartedAt | 拒絕 |
| water_end 找不到唯一未關閉起點 | 拒絕孤兒終點 |
| water_end 的 intervalId 或 zone 集合不同 | 拒絕 |
| confirmed 起點且 endedAt < startedAt | 拒絕 |
| endedAt > effectiveOccurredAt 或 trustedNow | 拒絕 |
| 重複 water_end | 拒絕；相同 idempotency key 只回原結果 |

### DT-WATER-DEADLINE-01：耐水間隔

| waterResistanceStatus | minutes | `confirmedWaterInterval` |
| --- | ---: | --- |
| 40 | 40 | 40 分鐘 |
| 80 | 80 | 80 分鐘 |
| not_water_resistant | null | null |
| no_claim | null | null |
| unknown | null | null |
| 40／80 但 minutes 不相符 | snapshot 非法 |

### DT-WATER-DEADLINE-02：`activeWaterDeadline`

| 條件 | 必須成立 |
| --- | --- |
| tracking | active |
| exposure | exposed |
| method | contains sunscreen |
| water interval | active |
| start confidence | confirmed |
| activityStartedAt | 非空、可信 |
| currentApplication | 存在 |
| Application 先後 | `appliedAt <= activityStartedAt` |
| eligibility | eligible |
| water label | 40 或 80 |
| safety block | 無 |

全部成立：

```text
activeWaterDeadline =
  activityStartedAt + confirmedWaterInterval
```

任一不成立：`activeWaterDeadline=null`。

### 特殊結果

| 情境 | 結果 |
| --- | --- |
| water_start unknown＋方法含 sunscreen | `untimed_action`, `WATER_START_UNKNOWN` |
| water_start confirmed＋耐水未知／無宣稱 | 水上期限 null；一般期限仍可保留 |
| active interval 內新補擦 | 一般期限可重算；目前水上期限不從補擦時間重設 |
| water_end | 水上區間關閉，建立立即一般事件原因 |
| 未補擦再 water_start | 未解除 water_end 原因持續為 due；不得因新入水取得較晚期限蓋過 |
| water_end＋嚴格較晚補擦＋新 water_start | 才可建立新區間期限 |

---

## 12. 一般事件原因

### 工作 `ruleId`

- `RR-P0-CAUSE-001`：離水、流汗、擦拭、摩擦及洗手使受影響部位立即需要處理。
- `RR-P0-CAUSE-002`：只有嚴格較晚的合格 Application 解除原因。
- `RR-P0-CAUSE-003`：衣物覆蓋或停止追蹤只使原因暫不適用，不代表解除。
- `RR-P0-HAND-WASH-001`：洗手預設只作用於 `hand_backs`。

### DT-CAUSE-01：原因類型

| causeType | deadlineEligibility | 預選／適用部位 | deadline |
| --- | --- | --- | --- |
| water_end | known_time | 完整沿用水上起點集合 | effectiveOccurredAt |
| heavy_sweat | known_time | 使用者最後確認集合 | effectiveOccurredAt |
| towel | known_time | 使用者最後確認集合 | effectiveOccurredAt |
| friction | known_time | 使用者最後確認集合 | effectiveOccurredAt |
| hand_wash | known_time | 預設目前外露 `hand_backs`，提交前可調整 | effectiveOccurredAt |
| water_start_unknown | untimed | 水中外露且方法含 sunscreen 的確認集合 | null |

事件 zone 集合必須非空；`correctionAction=void` 例外，範圍由原事件取得。

### latestEligibleApplicationForCause

```text
latestEligibleApplicationForCause =
  該 zone 所有有效且 eligible 的 Application
  依 appliedAt、effectiveOrder 排序後最後一筆
```

此查詢用於判斷原因是否解除，不等同 `currentApplication`。

### DT-CAUSE-02：原因是否解除

| causeAt | latest eligible Application.appliedAt | unresolved |
| --- | --- | ---: |
| 10:00 | 不存在 | 是 |
| 10:00 | 09:59 | 是 |
| 10:00 | 10:00 | 是 |
| 10:00 | 10:01 | 否 |

```text
unresolvedOrdinaryCause =
  cause 有效且未被 replace／void
  AND cause 不是 ProductSafetyEvent
  AND (
    latestEligibleApplicationForCause 不存在
    OR cause.effectiveOccurredAt >= application.appliedAt
  )
```

### DT-CAUSE-03：目前是否適用

| tracking | exposure | method 含 sunscreen | 原因適用 |
| --- | --- | ---: | ---: |
| active | exposed | 是 | 是 |
| active | exposed | 否 | 否 |
| active | clothing_covered | 任意 | 否 |
| ended | 任意 | 任意 | 否 |

原因不適用不代表已解除。重新外露／重新追蹤後若仍沒有嚴格較晚的合格 Application，原因恢復適用。

### eventTriggeredDeadline

```text
eventTriggeredDeadline =
  min effectiveOccurredAt of:
    unresolved ordinary causes
    AND deadlineEligibility=known_time
    AND ordinaryCauseApplicable=true
```

---

## 13. 產品安全封鎖

### 工作 `ruleId`

- `RR-P0-SAFETY-001`：產品異常／不適使相符產品的目前期限失效。
- `RR-P0-SAFETY-002`：重複使用同一受封鎖產品不得建立新期限。
- `RR-P0-SAFETY-003`：改用其他合格產品或衣物可解除目前行動卡，但不清除原產品封鎖。

### DT-SAFETY-01：activeProductSafetyBlock

| 目前方法 | 目前 topical Application | 是否匹配有效 SafetyEvent | Block |
| --- | --- | ---: | ---: |
| sunscreen | product A／snapshot A | 是 | 是 |
| other_topical | product A／snapshot A | 是 | 是 |
| sunscreen | product B／snapshot B | 否 | 否 |
| clothing only | 無目前 topical | 任意 | 否；原產品事件仍保留 |
| sunscreen | product A 新 Application | 是 | 是；不得以重擦同產品解除 |

產品匹配方式：

- 保存產品：`sourceProductId`。
- Session-only：`productSnapshotFingerprint`。

### 安全封鎖效果

- `generalDueAt=null`
- `activeWaterDeadline=null`
- 目前 zone 產生無時間產品安全行動。
- 既有 Application snapshot 不變。
- 同一產品日後新 Application 仍不具資格。
- 異常事件可對不同批次／新包裝另建產品紀錄並重新確認。
- 不適事件不得只靠新包裝或同配方新批次繞過。

---

## 14. 衣物、外露與追蹤狀態

### 工作 `ruleId`

- `RR-P0-CLOTHING-001`：衣物完整覆蓋不建立產品倒數。
- `RR-P0-CLOTHING-002`：重新外露沿用仍合法的原 appliedAt，不從移開衣物時間重算。
- `RR-P0-TRACKING-001`：停止追蹤排除期限與 primaryAction，重新追蹤不復活舊 Application。

### DT-CLOTHING-01

| 目前狀態 | 期限 | 原 Application |
| --- | --- | --- |
| clothing only | 全部產品期限 null | 無需 Application |
| clothing＋sunscreen | 覆蓋期間期限 null | 保留原 appliedAt |
| clothing＋sunscreen → exposed＋sunscreen，sunscreen 從未移除 | 依原 appliedAt 重建；可能已到期 | 可引用同一 activation 的 Application |
| clothing only → exposed＋sunscreen，沒有同 command 新 Application | null | 不得復活更早 Application |
| sunscreen 被移除後再加入 | null，直到新 activation 有新 Application | 舊 Application 不可引用 |
| tracking ended | 不納入 zone／Session 期限 | 歷史保留 |
| tracking restarted 無新 Application | null | 舊 tracking activation 不可引用 |

UPF、布料種類、口罩、帽子或覆蓋經過時間不得換算成期限。

---

## 15. 情境、UVI 與期限獨立性

### 工作 `ruleId`

- `RR-P0-CONTEXT-001`：室內／窗邊／遮蔭只改提示，不延長期限。
- `RR-P0-UVI-001`：UVI 不參與產品期限計算。

### DT-CONTEXT-01

| 變更 | generalDueAt | activeWaterDeadline | event cause | P0 畫面 |
| --- | --- | --- | --- | --- |
| outdoor_general → indoor_away | 不變 | 不變 | 保留 | 期限持續；顯示室內情境 |
| indoor_away → outdoor_general | 不變 | 不變 | 立即重驗 | 顯示目前真實狀態 |
| outdoor → indoor_window | 不變 | 不變 | 保留 | 顯示 UVA 一般提示 |
| shade none → partial／full | 不變 | 不變 | 保留 | 只改環境提示 |
| UVI 變高 | 不變 | 不變 | 不變 | 提高環境風險／裝備提示 |
| UVI 變低 | 不變 | 不變 | 不變 | 不延長期限 |
| 無地區／無 UVI | 不變 | 不變 | 不變 | 提醒仍可運作 |

---

## 16. Zone 期限彙總

```text
zoneDueAt = minNonNull(
  generalDueAt,
  activeWaterDeadline,
  eventTriggeredDeadline
)

zoneNextActionAt = minNonNull(
  activeLabelReadyAt,
  zoneDueAt
)
```

### DT-ZONE-DUE-01

| generalDueAt | waterDeadline | eventDeadline | zoneDueAt |
| --- | --- | --- | --- |
| 12:00 | null | null | 12:00 |
| 12:00 | 11:40 | null | 11:40 |
| 12:00 | 11:40 | 11:10 | 11:10 |
| null | null | 11:10 | 11:10 |
| null | null | null | null |

`untimedActionReason` 不填入 `zoneDueAt`。

---

## 17. Zone `recordStatus`

### DT-RECORD-01

| tracking | certainty | exposure | components | recordStatus |
| --- | --- | --- | --- | --- |
| active | confirmed | exposed | sunscreen | sunscreen_recorded |
| active | confirmed | exposed | other_topical | none_reported |
| active | confirmed | exposed | sunscreen＋other_topical | sunscreen_recorded |
| active | confirmed | clothing_covered | clothing | physical_method_reported |
| active | confirmed | clothing_covered | clothing＋sunscreen | mixed |
| active | confirmed | clothing_covered | clothing＋other_topical | physical_method_reported |
| active | none_reported | exposed | empty | none_reported |
| active | unknown | exposed／unknown | empty | unknown |
| 尚未有可歸納方法的舊資料 | 任意 | 任意 | 任意 | unrecorded |

P0 StartSession 不得產生最後三列；它們只供舊資料重播、遷移或損壞復原。

---

## 18. Zone `timingStatus`

### 狀態優先順序

以下順序只用來決定下一步，不是醫療風險排名：

1. Active ProductSafetyBlock。
2. 方法／紀錄無法形成可信期限：
   - unrecorded
   - none_reported
   - unknown
   - currentApplication 不合格
3. 未解除 untimed 原因，例如 `WATER_START_UNKNOWN`。
4. `REAPPLY_DUE`。
5. `LABEL_WAIT`。
6. `REAPPLY_SOON`。
7. `TRACKING`。
8. `not_applicable`／衣物中性狀態。

Session 層級 `CLOCK_UNTRUSTED` 高於全部 zone 狀態。

### DT-TIMING-01

| 條件 | timingStatus | actionAt |
| --- | --- | --- |
| active safety block | untimed_action | null |
| unrecorded／none／unknown | untimed_action | null |
| exposed topical 的 currentApplication 不合格 | untimed_action | null |
| unresolved untimed cause | untimed_action | null |
| `zoneDueAt != null` 且 `trustedNow >= zoneDueAt` | reapply_due | zoneDueAt |
| `activeLabelReadyAt != null` 且 `trustedNow < activeLabelReadyAt`，且無更高狀態 | label_wait | activeLabelReadyAt |
| `0 < zoneDueAt - trustedNow <= 30m` | reapply_soon | zoneDueAt |
| `zoneDueAt - trustedNow > 15m` | tracking | zoneDueAt |
| clothing_covered | not_applicable | null |
| active exposed、合法方法但沒有期限且無更高原因 | untimed_action 或 not_applicable，依實際方法 | null |

`REAPPLY_DUE` 顯示靜態 due card；`REAPPLY_SOON` 與 `TRACKING` 才可顯示 timed ring。

---

## 19. Session 彙總

### `sessionNextDueAt`

```text
sessionNextDueAt =
  minNonNull(
    zoneDueAt of every zone
    WHERE latest trackingStatus=active
  )
```

它只彙總非空數字期限，不直接決定首屏。

### `overallStatus`

| 條件 | overallStatus |
| --- | --- |
| 有 SessionEndedEvent | ended |
| 任一 active zone 為 unrecorded／none／unknown | attention_required |
| 任一 active zone currentApplication 不合格且需處理 | attention_required |
| 任一 active zone 有 safety block／untimed cause／reapply_due | attention_required |
| 其餘有 active zone | tracking |

衣物覆蓋且沒有需處理原因時可維持 tracking，但不建立產品期限。

---

## 20. `primaryAction` 決策

### 20.1 輸出契約

```text
primaryAction:
  presentationType:
    timed_ring | due_card | untimed_action_card
  variantNullable:
    label_wait | multi_action | neutral_physical | null
  actionKind
  affectedZoneInstanceIds[]
  actionAtNullable
  reasonCodes[]
  derivedFromEventRefs[]
```

`primaryAction` 是衍生資料，不是獨立可修改真值。若快取，key 必須包含：

```text
sessionId + revision + rulesetVersion
```

### 20.2 Session 層級優先

| Session 條件 | presentation | actionKind | actionAt |
| --- | --- | --- | --- |
| CLOCK_UNTRUSTED＋online | untimed_action_card | recalibrate_clock | null |
| CLOCK_UNTRUSTED＋offline | untimed_action_card | view_conservative_reminder | null |
| ended | untimed_action_card | view_ended_state | null |

### 20.3 Zone 候選優先級

| priority | 候選狀態 | actionKind | presentation |
| ---: | --- | --- | --- |
| 10 | product safety block | switch_protection | untimed_action_card |
| 20 | unrecorded | complete_protection_record | untimed_action_card |
| 21 | unknown | confirm_protection_method | untimed_action_card |
| 22 | none_reported／不合格 topical | view_protection_options | untimed_action_card |
| 30 | WATER_START_UNKNOWN | resolve_water_start | untimed_action_card |
| 31 | 其他未解除 untimed cause | resolve_cause | untimed_action_card |
| 40 | REAPPLY_DUE | record_reapplication | due_card |
| 50 | LABEL_WAIT | view_product_label | untimed_action_card，variant=label_wait |
| 60 | REAPPLY_SOON | record_reapplication | timed_ring |
| 70 | TRACKING | report_context_event | timed_ring |
| 80 | clothing neutral | report_context_event | untimed_action_card，variant=neutral_physical |

數字越小越優先。`CLOCK_UNTRUSTED` 在表外且高於所有候選。

### 20.4 同層排序

1. priority 較小。
2. `actionAtNullable`：
   - 兩者都有時間：較早者。
   - 同 priority 一有時間、一為 null：有時間者先。
   - 兩者皆 null：進入下一條。
3. `BODY_ZONE_V3` 穩定顯示順序。
4. `zoneInstanceId` 作最後穩定 tie-break。

### 20.5 合併相同行動

- 同一最高優先層級、相同 `actionKind` 的多個 zone 可合併成一個 `primaryAction`。
- `affectedZoneInstanceIds[]` 使用穩定順序。
- `reasonCodes[]` 去重但保留可追溯 event refs。
- 不得為合併使用較晚的 actionAt；採最早值。

### 20.6 多種最高優先行動

若最高優先層級的 zone 需要不同 `actionKind`：

```text
presentationType = untimed_action_card
variant = multi_action
actionKind = review_required_zones
actionAtNullable = null
affectedZoneInstanceIds = 所有最高層級 zones
```

UI 主要 CTA 為 `查看需要處理的部位`，不得任選其中一個動作冒充全部。

---

## 21. 建議原因碼

原因碼是工作資料契約，不是使用者文案。正式名稱須在 schema 定版時版本化。

| reasonCode | 來源 |
| --- | --- |
| CLOCK_UNTRUSTED | Session 時鐘校準 |
| PRODUCT_EXPIRED | Application eligibility |
| PRODUCT_ABNORMAL_REPORTED | ProductSafetyEvent |
| PRODUCT_DISCOMFORT_REPORTED | ProductSafetyEvent |
| PRODUCT_NO_SUNSCREEN_CLAIM | Application eligibility |
| PRODUCT_IDENTITY_UNKNOWN | Application eligibility |
| METHOD_UNRECORDED | 舊資料／復原 |
| METHOD_NONE_REPORTED | 舊資料／復原或 other topical |
| METHOD_UNKNOWN | 舊資料／復原 |
| WATER_START_UNKNOWN | ContextEvent |
| WATER_RESISTANCE_UNKNOWN | Snapshot／水上情境提示 |
| WATER_ENDED | ContextEvent |
| HEAVY_SWEAT_REPORTED | ContextEvent |
| TOWEL_REPORTED | ContextEvent |
| FRICTION_REPORTED | ContextEvent |
| HAND_WASH_REPORTED | ContextEvent |
| GENERAL_INTERVAL_REACHED | generalDueAt |
| WATER_INTERVAL_REACHED | activeWaterDeadline |
| LABEL_WAIT_ACTIVE | labelReadyAt |
| CLOTHING_COVERED | ZoneMethodEvent |
| SESSION_ENDED | SessionEndedEvent |

原因碼不得直接顯示給使用者；Copy Deck 將它映射為審查過的繁體中文。

---

## 22. 工作規則清單

| ruleId | 規則 | 建立／提前／取消／阻止期限 | P0 必須有 Evidence Link |
| --- | --- | --- | ---: |
| RR-P0-ELIGIBILITY-001 | 合格 snapshot 才可建立期限 | 建立／阻止 | 是 |
| RR-P0-ELIGIBILITY-002 | 過期、異常、不適、無宣稱、未知身分不得建立 | 阻止 | 是 |
| RR-P0-ELIGIBILITY-003 | 最新不合格使用不得回退舊期限 | 阻止 | 是 |
| RR-P0-ACTIVATION-001 | 方法重啟不復活舊 Application | 阻止 | 是 |
| RR-P0-CURRENT-APP-001 | 目前使用先選最新，再判資格 | 建立／阻止 | 是 |
| RR-P0-GENERAL-001 | 一般上限 120 分鐘 | 建立 | 是 |
| RR-P0-GENERAL-002 | 明確較短標示優先 | 提前 | 是 |
| RR-P0-GENERAL-003 | 較長標示不延長 120 分鐘 | 阻止延長 | 是 |
| RR-P0-GENERAL-004 | 衣物／非防曬／安全封鎖無一般期限 | 阻止 | 是 |
| RR-P0-LABEL-WAIT-001 | 明確分鐘建立 labelReadyAt | 建立下一行動 | 是 |
| RR-P0-LABEL-WAIT-002 | 等待不代表安全 | 呈現限制 | 是 |
| RR-P0-WATER-001 | 可信起點＋40／80 建立水上期限 | 建立 | 是 |
| RR-P0-WATER-002 | 未知起點不建期限 | 阻止 | 是 |
| RR-P0-WATER-003 | 同一水上區間補擦不重設水上期限 | 阻止延長 | 是 |
| RR-P0-WATER-004 | 未解除離水原因再次入水不取得較晚期限 | 阻止延長 | 是 |
| RR-P0-CAUSE-001 | 離水／汗／擦拭／摩擦／洗手立即處理 | 提前 | 是 |
| RR-P0-CAUSE-002 | 嚴格較晚的合格補擦才解除原因 | 取消原因 | 是 |
| RR-P0-CAUSE-003 | 衣物／停止追蹤不清除原因 | 阻止錯誤取消 | 是 |
| RR-P0-HAND-WASH-001 | 洗手預設只影響手背 | 提前 | 是 |
| RR-P0-SAFETY-001 | 異常／不適使相符產品期限失效 | 取消／阻止 | 是 |
| RR-P0-SAFETY-002 | 重擦同一封鎖產品不得解除 | 阻止 | 是 |
| RR-P0-SAFETY-003 | 其他防護只解除目前行動卡、不清除產品封鎖 | 狀態切換 | 是 |
| RR-P0-CLOTHING-001 | 衣物覆蓋無產品倒數 | 阻止 | 是 |
| RR-P0-CLOTHING-002 | 重新外露依原 appliedAt 重建 | 阻止延長 | 是 |
| RR-P0-TRACKING-001 | 停止／重啟追蹤不復活舊 Application | 阻止 | 是 |
| RR-P0-CONTEXT-001 | 室內／窗邊／遮蔭不延長期限 | 阻止延長 | 是 |
| RR-P0-UVI-001 | UVI 不參與期限計算 | 阻止錯誤變更 | 是 |

在 Evidence Link 尚未核准前，這些工作 ID 不等於可發布 ruleset。

---

## 23. 固定測試向量

### 測試資料慣例

- `now=11:00`，除非案例另有說明。
- 一般上限 120 分鐘。
- `A` 表示產品 A，預設 eligible。
- zone 預設 active、exposed、`{sunscreen}`。
- 所有未特別說明的事件均有效、未更正且時鐘可信。

### TV-001：一般 120 分鐘

```text
Application A appliedAt=10:00
reapplicationIntervalStatus=no_numeric_interval
```

預期：

```text
generalDueAt=12:00
zoneDueAt=12:00
timingStatus=tracking
```

### TV-002：較短標示 90 分鐘

```text
Application A appliedAt=10:00
explicit interval=90
now=11:00
```

預期：

```text
generalDueAt=11:30
timingStatus=tracking
```

### TV-003：進入即將到期

沿用 TV-002，`now=11:15`。

預期：`timingStatus=reapply_soon`，剩餘 30 分鐘。

### TV-004：標示 180 分鐘不得延長

```text
Application A appliedAt=10:00
explicit interval=180
```

預期：`generalDueAt=12:00`。

### TV-005：產品身分未知

```text
currentApplication eligibility=identity_unconfirmed
```

預期：

```text
currentApplication=A
generalDueAt=null
zoneDueAt=null
timingStatus=untimed_action
reason=PRODUCT_IDENTITY_UNKNOWN
```

不得回退更早產品。

### TV-006：較新的不合格產品不回退

```text
A eligible appliedAt=09:00
B identity_unconfirmed appliedAt=10:00
```

預期：

```text
currentApplication=B
generalDueAt=null
```

### TV-007：產品過期

```text
Application appliedAt=10:00
snapshot eligibility=expired
```

預期：無期限，`PRODUCT_EXPIRED`。

### TV-008：效期未知不自行判過期

```text
product identity confirmed
expiry unknown
condition=no_issue_reported
```

預期：eligibility 可為 eligible，一般期限依標示建立。

### TV-009：衣物覆蓋且無 Application

```text
exposure=clothing_covered
components={clothing}
```

預期：

```text
generalDueAt=null
waterDeadline=null
timingStatus=not_applicable
recordStatus=physical_method_reported
```

### TV-010：衣物下防曬重新外露

```text
A appliedAt=09:30
09:45 exposure=clothing_covered components={clothing,sunscreen}
10:30 exposure=exposed components={sunscreen}
now=11:00
```

預期：`generalDueAt=11:30`，不得從 10:30 重算至 12:30。

### TV-011：移除後重新加入 sunscreen

```text
A appliedAt=09:00
10:00 method={clothing}
11:00 method={sunscreen}, no new Application
```

預期：`currentApplication=null`，`generalDueAt=null`。

### TV-012：初始回填早於 Session 建立

```text
StartSession submitted=10:00
same command Application appliedAt=09:30
```

預期：activation boundary=09:30，`generalDueAt=11:30`。

### TV-013：標示等待 15 分鐘

```text
Application appliedAt=10:55
wait=15
now=11:00
generalDueAt=12:55
```

預期：

```text
labelReadyAt=11:10
timingStatus=label_wait
zoneNextActionAt=11:10
```

### TV-014：一般期限已到，不被 LABEL_WAIT 蓋掉

```text
zoneDueAt=11:00
labelReadyAt=11:10
now=11:00
```

預期：`reapply_due`，不是 label_wait。

### TV-015：耐水 40 分鐘

```text
A appliedAt=09:30
water_start confirmed at 10:00
waterResistance=40
now=10:20
```

預期：

```text
activeWaterDeadline=10:40
generalDueAt=11:30
zoneDueAt=10:40
```

### TV-016：耐水 80 分鐘

沿用 TV-015，waterResistance=80。

預期：water deadline=11:20，zoneDueAt=11:20。

### TV-017：入水晚於塗抹的必要先後

```text
A appliedAt=10:10
water_start=10:00
```

預期：`activeWaterDeadline=null`。

### TV-018：入水起點未知

```text
water_start confidence=unknown
activityStartedAt=null
```

預期：

```text
activeWaterDeadline=null
untimed reason=WATER_START_UNKNOWN
primary presentation=untimed_action_card
```

### TV-019：耐水標示未知

```text
water_start confirmed=10:00
waterResistance=unknown
```

預期：water deadline=null；一般期限可保留，另顯示水中防護未知提示。

### TV-020：水中補擦不重設目前水上期限

```text
water_start=10:00, waterResistance=40
new Application appliedAt=10:20
interval still active
```

預期：

```text
activeWaterDeadline=10:40
generalDueAt=12:20
zoneDueAt=10:40
```

### TV-021：離水立即原因

```text
water_end at 10:25
now=10:30
```

預期：

```text
eventTriggeredDeadline=10:25
zoneDueAt=10:25
timingStatus=reapply_due
```

### TV-022：事件只由嚴格較晚補擦解除

分別輸入：

```text
hand_wash=10:00
Application=09:59 / 10:00 / 10:01
```

預期：

- 09:59：未解除。
- 10:00：未解除。
- 10:01：解除。

### TV-023：洗手不影響其他部位

```text
hand_wash zone={hand_backs}
face due=12:00
hand due originally=12:00
```

預期：

- hand event deadline=事件時間。
- face due 仍為 12:00。

### TV-024：多個事件取最早未解除原因

```text
towel=10:20
friction=10:10
heavy_sweat=10:30
no later eligible Application
```

預期：`eventTriggeredDeadline=10:10`。

### TV-025：衣物期間原因暫不適用

```text
hand_wash=10:00
clothing_covered=10:01
no later Application
```

預期：

- 覆蓋期間不顯示 due。
- 原原因仍存在。
- 再次 exposed＋sunscreen 時原因恢復 due。

### TV-026：停止追蹤期間原因暫不適用

```text
towel=10:00
tracking_ended=10:01
tracking_started=10:30, no new Application
```

預期：

- ended 時不納入 primaryAction。
- restart 後舊 Application 不復活。
- 仍需新 activation Application；原因不因停止追蹤被視為解除。

### TV-027：產品異常使期限失效

```text
A due=12:00
ProductSafetyEvent A abnormal at 10:30
```

預期：

```text
generalDueAt=null
waterDeadline=null
timingStatus=untimed_action
reason=PRODUCT_ABNORMAL_REPORTED
```

### TV-028：同產品重擦不解除安全封鎖

```text
A abnormal at 10:30
new A Application at 10:40
```

預期：仍有 block，無期限。

### TV-029：改用產品 B

```text
A safety block
B eligible appliedAt=10:40
current method references B
```

預期：

- 目前 zone 可使用 B 建立期限。
- A 的安全事件仍保留。

### TV-030：UVI 改變不改期限

```text
zoneDueAt=12:00
UVI 由 2 變 11，再變 0
```

預期：每次 `zoneDueAt=12:00`。

### TV-031：進入室內不延長

```text
zoneDueAt=12:00
context outdoor → indoor_away at 10:30
```

預期：`zoneDueAt=12:00`。

### TV-032：無地區仍可提醒

```text
weatherSnapshot=null
valid Application appliedAt=10:00
```

預期：一般期限正常建立。

### TV-033：sessionNextDueAt 忽略 null

```text
face due=12:00
hand due=null
neck due=11:30
```

預期：`sessionNextDueAt=11:30`。

### TV-034：無時間狀態優先於較晚數字

```text
ear reason=PRODUCT_IDENTITY_UNKNOWN, due=null
face due=11:30
```

預期：

- `sessionNextDueAt=11:30`
- primaryAction 指向 ear 無時間行動
- 不以臉部提醒環冒充整體主要狀態

### TV-035：多種最高優先動作

```text
ear=unknown method → confirm_protection_method
hand=unrecorded → complete_protection_record
兩者落在同一最高呈現層級但 actionKind 不同
```

預期：

```text
presentation=untimed_action_card
variant=multi_action
actionKind=review_required_zones
```

### TV-036：CLOCK_UNTRUSTED 最高優先

```text
clock=CLOCK_UNTRUSTED
hand=reapply_due
```

預期：primaryAction 為重新校準／離線保守提醒，不直接顯示可延長的補擦提交。

### TV-037：局部補擦

```text
face due=11:00
hand due=11:00
confirmed reapplication zones={hand} at 11:05
```

預期：

- hand 依 11:05 重建。
- face 仍為 due。
- Session primaryAction 仍指向 face。

### TV-038：補擦 group 分區非法

```text
confirmed zones={face,hand}
event A zones={face,hand}
event B zones={hand}
```

預期：整組拒絕，兩部位皆不更新。

### TV-039：更正唯一 leaf

```text
event E
replace E → E2
第二個 replace E → E3
```

預期：E3 被拒絕為 correction conflict。

### TV-040：Session 結束

```text
SessionEndedEvent at 11:00
later ordinary event replayed at 11:01
```

預期：

- overallStatus=ended。
- later ordinary event 不重開 Session。
- primaryAction 顯示已結束狀態。

---

## 24. Reducer 建議執行順序

```text
1. 驗證 schema、event family、correction chain、idempotency
2. 解析每條 correction chain 的唯一有效 leaf
3. 驗證 Session 是否 ended
4. 重建 tracking activation
5. 重建目前 method activation
6. 選 currentApplication（不先篩 eligibility）
7. 判斷 activeProductSafetyBlock
8. 計算 recordStatus
9. 計算 labelReadyAt／generalDueAt
10. 驗證並重建 water intervals
11. 計算 activeWaterDeadline
12. 找未解除 ordinary causes
13. 計算 eventTriggeredDeadline／untimedActionReason
14. 計算 zoneDueAt／zoneNextActionAt
15. 計算 timingStatus
16. 對所有 active zones 計算 sessionNextDueAt
17. 計算 overallStatus
18. 套用 CLOCK_UNTRUSTED Session override
19. 產生 primaryAction
20. 原子寫入衍生狀態與新 revision
```

此順序是工程重建流程，不得把衍生狀態反寫成事件真值。

---

## 25. 實作完成定義

提醒 reducer 只有在以下條件全部成立時才算 P0 完成：

1. 規則為純函式或可重現狀態機，相同有效事件流永遠得到相同結果。
2. 不依賴事件抵達順序、畫面 interval、UVI、SPF 或未審查倍率。
3. P0 IndexedDB 與未來 P1 後端可使用同一命令 schema 與測試向量。
4. TV-001～TV-040 全部通過。
5. PRD 所有 P0 AC 的提醒案例有對應測試。
6. correction、idempotency、transaction abort 及多 context 競爭有測試。
7. 每個會建立、提前、取消或阻止期限的 `ruleId` 有核准 Evidence Link。
8. rulesetVersion 與 appliedRuleIds 寫入 Session。
9. ruleset 升版不靜默改寫進行中或歷史 Session。
10. 沒有可信期限時不產生 timed ring、假 `00:00` 或安全百分比。

---

## 26. 下一步

完成本 Decision Table 後，建議依序建立：

1. `P0_COPY_DECK.md`：把 reasonCode、狀態與錯誤映射為經審查的繁體中文。
2. `P0_REQUIREMENT_TRACEABILITY_MATRIX.md`：將 PRD 功能、畫面、規則、AC 與測試向量串接。
3. Technical Design：定義 reducer package、事件 schema、IndexedDB transaction 與 property-based test。
