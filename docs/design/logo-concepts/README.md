# UVAlert Logo 概念比較（第一輪）

**狀態**：第一輪方向探索，尚未取代任何正式資產。目前未修改 PWA icon、favicon、wordmark 元件或正式設計 token。

依據規格：[`docs/superpowers/specs/2026-08-18-uvalert-logo-concepts-design.md`](../../superpowers/specs/2026-08-18-uvalert-logo-concepts-design.md)
執行計畫：[`docs/superpowers/plans/2026-08-18-uvalert-logo-concepts.md`](../../superpowers/plans/2026-08-18-uvalert-logo-concepts.md)

## 比較板

[`uvalert-logo-concepts-board.svg`](uvalert-logo-concepts-board.svg) — 3×2 排列六款概念，每格包含大尺寸圖標、橫式完整 Logo、32px 單色預覽、概念名稱與定位句。

## 六款概念

| # | 概念 | 圖標 | 橫式標誌 | 定位 |
|---|---|---|---|---|
| 01 | 晨線 | [SVG](marks/01-morning-line.svg) | [SVG](lockups/01-morning-line.svg) | 每天查看晴報的溫暖起點 |
| 02 | 晴窗 | [SVG](marks/02-sun-window.svg) | [SVG](lockups/02-sun-window.svg) | 打開一扇生活化的陽光情報窗 |
| 03 | 補擦環 | [SVG](marks/03-reapply-ring.svg) | [SVG](lockups/03-reapply-ring.svg) | 用未完的節奏記住下一次補擦 |
| 04 | 日照節點 | [SVG](marks/04-sunlight-nodes.svg) | [SVG](lockups/04-sunlight-nodes.svg) | 在日照變化間輕柔串起補擦節奏 |
| 05 | 晴報框 | [SVG](marks/05-weather-bulletin-frame.svg) | [SVG](lockups/05-weather-bulletin-frame.svg) | 像每日生活快報一樣整理陽光資訊 |
| 06 | 播報印記 | [SVG](marks/06-broadcast-mark.svg) | [SVG](lockups/06-broadcast-mark.svg) | 把陽光提醒濃縮成清楚的短報 |

## 調色盤與字體

- 六款共用的第一輪探索配色：暖象牙 `#FAF5EC`、陶土杏桃 `#9F5E42`、深咖啡 `#2E2925`。
- **06 播報印記**目前已進入初步選定方向，改用專屬的暖琥珀金配色（點與其中一線 `#C1832E`、另兩線 `#33291F`），與其餘五款的共用配色區隔，以呼應使用者既有設計系統中的香檳金／陽光感訴求。單色版邏輯已同步更新，確保 06 的 32px 單色預覽仍正確收斂成單一深色調。
- 中文主標：`Noto Serif TC` Medium／500；英文副標：`Inter` Medium／500。

## 已知調整記錄

初版產出後的審查修正（皆已完成並反映在目前檔案中）：

1. 「播報印記」原本三條等長平行線太像新聞列表／漢堡選單，已改為從太陽點呈扇形放射、長短不一的三條資訊線。
2. 色彩驗證器原本只檢查 hex 格式，會漏掉具名色與 `rgb()`／`hsl()` 等非核准寫法，已改為掃描所有 `fill`／`stroke` 屬性值並逐一比對核准色表。
3. 使用者選定 06 為主要方向後，06 的圖標／橫式標誌／比較板內配色已更新為暖琥珀金 `#C1832E` ＋ 暖黑咖啡 `#33291F`，並同步收錄進核准色表。

## 選定檢查清單

依序確認六款方案：

- [ ] 32px 小尺寸是否仍清楚
- [ ] 是否能同時聯想到陽光／氣象與提醒節奏
- [ ] 是否成熟、溫暖，但不幼稚或醫療化
- [ ] 是否與一般天氣 App、保養品牌或計時器有足夠差異
- [ ] 中文主標與圖標搭配是否平衡
- [ ] 單色版是否仍保有辨識度

選定一至兩款後，才進行第二輪：校正幾何、字距、單色版、深色底反白版、App icon 安全邊界與 SVG 重繪。第一輪產出不直接取代正式 Logo 資產。

## 重新產生與驗證

```bash
node tools/logo-concepts/generate-logo-concepts.mjs
node tools/logo-concepts/verify-logo-concepts.mjs
```
