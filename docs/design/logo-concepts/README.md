# UVAlert Logo 概念比較（第一輪）

**狀態**：第一輪方向探索六款，已選定 06 播報印記為正式方向。PWA icon／favicon／apple-touch-icon 已於 2026-08-18（commit `8355d11`）正式套用；其餘五款維持探索留存，未取代任何正式資產。wordmark 元件與 `packages/ui/src/styles.css` 的正式設計 token 尚未套用新配色，見文末更新說明。

依據規格：[`docs/superpowers/specs/2026-08-18-uvalert-logo-concepts-design.md`](../../superpowers/specs/2026-08-18-uvalert-logo-concepts-design.md)
執行計畫：[`docs/superpowers/plans/2026-08-18-uvalert-logo-concepts.md`](../../superpowers/plans/2026-08-18-uvalert-logo-concepts.md)

## 比較板

[`uvalert-logo-concepts-board.svg`](uvalert-logo-concepts-board.svg) — 3×2 排列六款概念，每格包含大尺寸圖標、橫式完整 Logo、32px 單色預覽、概念名稱與定位句。

## 六款概念

| #   | 概念     | 圖標                                       | 橫式標誌                                     | 定位                           |
| --- | -------- | ------------------------------------------ | -------------------------------------------- | ------------------------------ |
| 01  | 晨線     | [SVG](marks/01-morning-line.svg)           | [SVG](lockups/01-morning-line.svg)           | 每天查看晴報的溫暖起點         |
| 02  | 晴窗     | [SVG](marks/02-sun-window.svg)             | [SVG](lockups/02-sun-window.svg)             | 打開一扇生活化的陽光情報窗     |
| 03  | 補擦環   | [SVG](marks/03-reapply-ring.svg)           | [SVG](lockups/03-reapply-ring.svg)           | 用未完的節奏記住下一次補擦     |
| 04  | 日照節點 | [SVG](marks/04-sunlight-nodes.svg)         | [SVG](lockups/04-sunlight-nodes.svg)         | 在日照變化間輕柔串起補擦節奏   |
| 05  | 晴報框   | [SVG](marks/05-weather-bulletin-frame.svg) | [SVG](lockups/05-weather-bulletin-frame.svg) | 像每日生活快報一樣整理陽光資訊 |
| 06  | 播報印記 | [SVG](marks/06-broadcast-mark.svg)         | [SVG](lockups/06-broadcast-mark.svg)         | 把陽光提醒濃縮成清楚的短報     |

## 調色盤與字體

- 六款共用的第一輪探索配色：暖象牙 `#FAF5EC`、陶土杏桃 `#9F5E42`、深咖啡 `#2E2925`。
- **06 播報印記**目前已進入初步選定方向，改用專屬的暖琥珀金配色（點與其中一線 `#C1832E`、另兩線 `#33291F`），與其餘五款的共用配色區隔，以呼應使用者既有設計系統中的香檳金／陽光感訴求。單色版邏輯已同步更新，確保 06 的 32px 單色預覽仍正確收斂成單一深色調。
- 中文主標：**源泉圓體（GenSenRounded）TW 月版** Medium；英文副標：`Inter` Medium／500。

> **正式標誌已移出這個資料夾（2026-08-22）**
>
> 定案的橫式標誌在 **[`docs/design/logo/`](../logo/README.md)**，真實來源是 Illustrator（`.ai`），字標已轉外框、不依賴字體安裝。
>
> 這個資料夾從此**只是第一輪六款概念的探索紀錄**。裡面的 `lockups/*.svg` 由 `tools/logo-concepts/generate-logo-concepts.mjs` 產生、仍使用 `<text>` 元素，**不可當成正式資產使用**。
>
> 例外：06 定案後產出的圖標資產（`06-broadcast-mark-outlined.svg`、`-filled.svg`、`-dark-surface.svg`、`06-broadcast-mark-app-icon-preview/`）仍然有效，圖標單獨使用時就用它們。

**2026-08-22 字體變更**：中文主標從 `Noto Serif TC` 改為源泉圓體。原因是明體的尖角收筆與圖標的造型語言直接衝突——圖標定義是「實心圓點＋膠囊狀線條，端點與轉角一律 `round`，**不使用尖角**」（`DESIGN.md` 第八節），而尖角正是明體的特徵。圓體是黑體的圓角版本，結構不變、只磨圓端點，呼應膠囊語言又不會滑向可愛化（`DESIGN.md` 第一節）。刻意不選 jf open 粉圓，就是為了避開可愛化那條線。

務必使用 **TW（月版）**，不要用 JP／PJP（日文）或 TC（丹版）——日文版的漢字字形不符台灣標準。理由與取得方式見 [`docs/design/logo/README.md`](../logo/README.md)。

## 已知調整記錄

初版產出後的審查修正（皆已完成並反映在目前檔案中）：

1. 「播報印記」原本三條等長平行線太像新聞列表／漢堡選單，已改為從太陽點呈扇形放射、長短不一的三條資訊線。
2. 色彩驗證器原本只檢查 hex 格式，會漏掉具名色與 `rgb()`／`hsl()` 等非核准寫法，已改為掃描所有 `fill`／`stroke` 屬性值並逐一比對核准色表。
3. 使用者選定 06 為主要方向後，06 的圖標／橫式標誌／比較板內配色已更新為暖琥珀金 `#C1832E` ＋ 暖黑咖啡 `#33291F`，並同步收錄進核准色表。

## 第二輪：06 播報印記定案調整

使用者已選定 06 播報印記為主要方向，以下調整只套用在 06；其餘五款維持第一輪狀態供比較留存。

- **幾何校正（第一次）**：原本三條資訊線與太陽點的間距不一致（實際量測 5–6.8px 不等），視覺重心也偏離畫布中心。已改為統一從圓心外 12px 處放射、對稱 ±24° 扇形夾角，整體構圖重新對齊 64×64 畫布中心。
- **幾何校正（第二次）**：三條線的起點彼此太接近——`stroke-width` 是 4，起點垂直間距只有 4px，等於線與線的邊緣完全貼合、視覺上糊成一塊。已把起點間距拉開到 8px，讓扇形從底部就開始散開，線與線之間留有約 4px 的實際空白。
- **字距校正**：橫式標誌與比較板的中文主標「防曬晴報員」原本沒有字距設定，已加上 `letter-spacing="0.5"` 避免明體在展示尺寸下過於緊縮；英文副標 `UVAlert` 字距從 `1.8` 微調為 `2.2`，維持規格要求的「字距略放寬」比例一致。中英文左邊界也統一對齊到同一個 x 座標，去除原本 2px 的隨機位移。
- **App icon 安全邊界**：Android 自適應圖標在不同遮罩形狀下，只保證中心約 66% 直徑的圓形範圍一定可見。以 64×64 畫布換算，安全圓半徑訂為 20px（約 63% 直徑，留有餘裕）。06 的幾何已收緊到最遠點距中心 18px（含 `stroke-linecap="round"` 造成的線頭外擴），留 2px 安全餘量。這個邊界已寫入 [`verify-logo-concepts.mjs`](../../../tools/logo-concepts/verify-logo-concepts.mjs) 自動檢查（`SAFE_AREA_RADIUS`），並產出視覺參考圖 [`06-broadcast-mark-app-icon-safe-area.svg`](06-broadcast-mark-app-icon-safe-area.svg)，用虛線圓標出邊界。
- **正式向量重繪**：原本的圖標是靠 `stroke` + `stroke-linecap="round"` 畫出來的，不是最終產線會用的格式。已寫一個 `pillPath()` 幾何轉換函式，把每條描邊線段換算成對應的填色「膠囊」輪廓（兩條平行邊＋兩端半圓弧），確保視覺上跟描邊版完全一致，但不再依賴任何 `stroke` 屬性。產出 [`06-broadcast-mark-outlined.svg`](06-broadcast-mark-outlined.svg)，可直接送進 App icon／favicon 產線工具。
- **深色底反白版**：使用者的設計系統裡有深咖啡（espresso）產品介面／頁尾等深色版面，原本的深黑咖啡描邊線在深色底上會幾乎看不見。已產出 [`06-broadcast-mark-dark-surface.svg`](06-broadcast-mark-dark-surface.svg)：深咖啡背景＋暖象牙色資訊線＋維持原本的暖琥珀金太陽點與強調線，跟正式向量輪廓共用同一份幾何資料，不會跟亮色版走鐘。
- **實心底色版**：新增 [`06-broadcast-mark-filled.svg`](06-broadcast-mark-filled.svg)（暖象牙實心背景＋輪廓圖形），專供下面的點陣輸出使用——maskable icon、favicon、apple-touch-icon 都不能有透明背景，需要一份不透明的來源。

## 點陣圖預覽（尺寸對照現有 manifest）

[`06-broadcast-mark-app-icon-preview/`](06-broadcast-mark-app-icon-preview/) 用 [sharp](https://sharp.pixelplumbing.com/) 把上面的 SVG 轉成點陣圖，尺寸對照 `apps/web/public/manifest.webmanifest` 現有規格：

| 檔案                                                   | 尺寸       | 來源                 | 對應用途                                                                |
| ------------------------------------------------------ | ---------- | -------------------- | ----------------------------------------------------------------------- |
| `icon-192.png`                                         | 192×192    | filled               | PWA icon，`purpose: any`                                                |
| `icon-512.png`                                         | 512×512    | filled               | PWA icon，`purpose: any`                                                |
| `icon-512-maskable.png`                                | 512×512    | filled               | PWA icon，`purpose: maskable`（圖形已在安全邊界內，可直接沿用同一來源） |
| `apple-touch-icon-180.png`                             | 180×180    | filled               | iOS 主畫面圖示慣用尺寸                                                  |
| `favicon-48.png` / `favicon-32.png` / `favicon-16.png` | 48／32／16 | filled               | 瀏覽器分頁圖示，16px 是可讀性最嚴苛的尺寸                               |
| `mark-transparent-512.png`                             | 512×512    | outlined（透明背景） | 一般用途去背素材                                                        |
| `mark-dark-surface-512.png`                            | 512×512    | dark-surface         | 深色底版面預覽                                                          |

所有輸出皆已確認為完全不透明（alpha 全通道 255），符合 maskable／apple-touch-icon 不可透明的規範。16px favicon 縮到最小仍可辨認「圓點＋放射線」輪廓，但細節必然比 32px 版簡化，屬預期內的正常取捨。

**更新（2026-08-18）：這批 06 播報印記的點陣圖已正式取代 `apps/web/public/icon-*.png`、`favicon.ico`、`apple-touch-icon.png`（見 commit `8355d11`）。`apps/web/public/manifest.webmanifest` 的 `background_color`／`theme_color` 仍是舊的中性灰階 `#f9f9f9`，尚未換成本節列出的暖琥珀金／暖象牙配色，也還沒套進 `packages/ui/src/styles.css` 的品牌色 token——新 icon 已上線，但新配色尚未進到程式碼的色彩系統。**

第二輪已全部完成，含 SVG 向量到點陣圖的完整輸出。

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
