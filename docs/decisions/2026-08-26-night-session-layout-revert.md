# 夜間＋有 Session 版面：改回收工版面

**日期**：2026-08-26（Asia/Taipei）
**狀態**：已裁決、已實作
**用途**：記錄「夜間＋提醒進行中」首屏版面第三次翻案的決定與回寫落點
**範圍**：只動首頁夜間分支的呈現；domain、契約、通知排程、無 Session 的夜間行為都不動
**權威性**：與 `2026-08-15-redesign-sitemap-userflow-current.md` §4.2 一致（本次已同步回寫該節）；與程式碼衝突時以程式碼為準
**相關文件**：`2026-08-15-redesign-sitemap-userflow-current.md` §4.2、`2026-08-23-wireframe-copy-fixes.md` §3.3／§3.4、封存的 `2026-08-08-night-behavior.md`

## 反覆脈絡

| 時間 | 狀態 | 內容 |
| --- | --- | --- |
| 2026-08-08 | 原始裁決 | 夜間依「有無 Session」分兩個畫面；有 Session 時走「收工版面」，主要行動是結束提醒 |
| 2026-08-23 | 確認 + 補進 Sitemap | 收工版面＝`HomeNightSession`：不顯示倒數與進度條，改顯示「已進行多久」（往上加）。理由：夜間 UV 為 0，倒數到下次補擦沒有行動價值 |
| 2026-08-24 | **推翻**（commit `47f44c6`） | 使用者反映「夜間看不到倒數與進度條、時間不是遞減的」，改為日夜共用同一版面：夜間也顯示補擦倒數、進度條，主 CTA 是「記錄補擦」，只多一句「現在不需要防曬」。`HomeNightSession.vue` 一併刪除 |
| 2026-08-26 | **改回收工版面**（本文件） | 使用者確認改回 2026-08-23 的收工版面，理由是「不讓倒數跨夜」 |

三次翻案都圍繞同一個張力：**夜間該把使用者導向「結束」還是「照常追蹤」。** 目前的定案是「結束」——夜間顯示倒數等於默許提醒跨夜，而跨夜的補擦倒數沒有意義（隔天早上顯示「還有 40 分鐘」時那層防曬已經十幾小時）。

## 本次實作

- **還原 `apps/web/src/components/home/HomeNightSession.vue`**（依 `47f44c6^`，`.night-session__body` 的行高 `1.7→1.6`、色彩改用現行別名 `--text-emphasis`，配合 2026-08-25 的 token 收斂）。
- **`HomePage.vue`**：在 `v-else-if="hasSession"` 之前加回 `v-else-if="hasSession && isNight"` 分支——`SessionEndControl` ＋ `HomeNightSession` ＋ `RecentEventsList`。不放 `HomeCountdown`、`ZoneStatusList`、`HomeUvHeadline`、次要動作。日間分支移除原本 `v-if="isNight"` 的 `.home__night-note` 與其樣式（該分支現在只在白天執行）。
- **`HomePage.test.ts`**：夜間測試改回斷言「走收工版面：有 `HomeNightSession`、無 `HomeCountdown`、無 `ZoneStatusList`」。
- **`NightWindDownPrompt.vue` 不還原**——它是舊 `/reminder` 頁專屬的可關閉收工提示（帶 `結束／繼續` 兩顆按鈕 ＋ per-night localStorage 關閉狀態），`/reminder` 於 2026-08-24（commit `51026aa`）併入首頁時就沒搬過來，從不屬於首頁收工版面。還原它＝新增一個上游沒要求的元件，不在本次範圍。

`pnpm --filter @sunshield/web typecheck` 通過；`HomePage.test.ts` 6 測試通過。

## 已知取捨

- 收工版面目前「結束提醒」的入口只有右上角 `SessionEndControl` 的叉叉（點開有確認彈窗），版面裡沒有一顆顯眼的「結束本次提醒」主按鈕。這是 `47f44c6` 之前的原樣。若要更強的行動引導，可另接一顆主按鈕或還原 `NightWindDownPrompt` 的顯眼版本——那是獨立的增量，不在「改回」範圍內。

## 裁決 → 回寫落點

| 項目 | 落點 | 狀態 |
| --- | --- | --- |
| 夜間收工版面裁決 | 本文件 | 已完成 |
| Sitemap §4.2 夜間表格＋元件清單（移除 `NightWindDownPrompt.vue`、補反覆說明） | `2026-08-15-redesign-sitemap-userflow-current.md` §4.2、前言 2026-08-26 修訂 | 已回寫 |
| 程式碼 | `HomeNightSession.vue`（還原）、`HomePage.vue`、`HomePage.test.ts` | 已完成 |
| 裁決索引一列 | `docs/decisions/README.md` | 已補 |
