# 頁面健康度檢查與四項修正

日期：2026-09-04
狀態：**四項全部修完並實機複驗**（分支 `fix/health-{a,b,c}-*`）。

方法：靜態連結完整性 ＋ 27 條路由的實機走查（掛 `console.error`／`onerror`／`unhandledrejection` 攔截）＋ 網路請求檢視。

---

## 一、乾淨的部分

| 檢查 | 結果 |
| --- | --- |
| 27 條路由全部渲染 | 0 個 console error |
| 死連結／孤兒路由 | 無 |
| 路由守衛 | `requiresActiveSession` 的三條無 session 時全部導回 `/` |
| 正式環境深連結 | `vercel.json` 已設 rewrite 到 `index.html`，重新整理不會 404 |
| 衛教 6 個分類連結 | 全部解析成功 |
| 網路失敗 | 只有 `/v1/uv/forecast` 404（本機沒跑 Edge Function），前端有降級 |

**靜態掃描曾誤報 7 條「沒被連到」的路由**，逐一查證後都到得了——`MorePage` 用物件陣列（`to: "/install"`）、衛教用 `educationCategoryPath()` helper、`/help` 子頁用 `helpTopics.ts` 的 `routeName`。**只認模板裡 `to="..."` 的掃描器會漏掉這三種形式。**

## 二、四項修正

### A. `/education` 沒有返回出口（`ab3ba09`）

十個 `hideNavigation: true` 的路由裡唯一沒有頂端出口的。藏了下排導覽又沒有返回，唯一出路是品牌 logo，而那會回到 `/` 不是使用者來的 `/more`。它的兩個子頁 2026-09-03 就補上箭頭了，首頁是那次漏掉的。

**為什麼守門沒抓到（這才是重點）。** `pageExitIcons.test.ts` 守的是「出口該長什麼樣」——叉叉還是箭頭、有沒有登記進白名單。它只檢查**已經有出口圖示**的檔案，所以一個「該有卻完全沒有」的頁面對它是隱形的：不在白名單、也沒有圖示可以被掃到，四條測試全綠。

新增 `hideNavigationExits.test.ts` 補另一個方向：**先從路由表推導出哪些頁面必須有出口**，再問它們有沒有。名單自動跟著路由表長，不是人工維護的白名單。

### B. 不存在的裝備 id ＋ 路由警告（`5bfd44b`）

`/products/<任意亂碼>/edit` 會渲染出一張完整的空表單，而且「儲存」可以按。對照組 `/products/<任意亂碼>` 有 redirect 會回清單——**同一個不存在的 id，兩種處置**。改成 `GearForm` 發 `notFound`、頁殼 `router.replace` 回清單。

`/products/:id` 的 redirect 從 `{ name: "products" }` 改成字串 `"/products"`：具名目標會把 `:id` 一起帶過去，而 `products` 不吃參數，於是每次都印 `Discarded invalid param(s) "id"`。行為本來就對，但**警告多了就沒有人看警告了**。

順帶修了守門自己的誤判：`ProductsPage.test.ts` 的「元件 emit 有人接」只認 camelCase 的 `@notFound`，認不得 Vue 同樣支援的 `@not-found`，把一個確實接了的 handler 報成沒接。**誤判比漏判更糟——它會逼下一個人去「修」一段本來就對的程式碼。**

### C. 換頁轉場在文件隱藏時卡住（`a681b77`）

**唯一由自己人引入的問題**（互動動效批次 5 的 `mode="out-in"`）。

症狀：路由變了、`document.title` 變了，畫面卻停在三頁以前，元素上還留著 `page-leave-from`。根因是 Vue 預設等 `transitionend` 才算離場結束，而 `out-in` 又要等離場結束才掛新元件——**隱藏的文件不跑 `requestAnimationFrame`**，離場永遠停在第一格。真實情境是背景分頁。

**這不只是「動畫沒播」。** 元件不掛載，`onMounted` 就不跑——B 那條「不存在的 id 導回清單」當天就是被它擋住而沒有觸發的。

解法是 `@leave` 這個 JS hook：只要收下 `done`，Vue 就不再等 `transitionend`，而 `setTimeout` 在隱藏的文件裡照樣觸發。淡出仍由 CSS 負責，hook 只是保險絲。

## 三、C 的三個死路（不要再走一次）

| 做法 | 結果 |
| --- | --- |
| `:css="visible"` 依可見性關掉 CSS 轉場 | ❌ **比原本的 bug 更糟**。`css` 不能反應式切換，Vue 建立 hook 時就讀死了，實測整個 App 拋 `Cannot read properties of null (reading 'parentNode')` |
| `:duration="{ leave: 160 }"` 讓 Vue 用計時器放行 | ❌ 沒用。Vue 的 `resolve` 本身就寫在 `nextFrame` 裡，沒有 rAF 就到不了那一行 |
| 拿掉 `mode="out-in"` | ❌ 新頁面確實會掛載了，但**離場的舊頁會累積**——實測隱藏狀態連續換六頁之後，`<main>` 裡躺著七棵 DOM 樹 |

三個都是實測掉進去才知道的，靜態推理看不出差別。

## 四、實機複驗

在 `visibilityState === "hidden"` 的環境走完 23 條路由，不做任何繞過：

- **0 error、0 warning**（`Discarded invalid param(s)` 已消失）
- 每頁 `h1` 與路由一致，`<main>` 的子節點恆為 1（無累積、無停在舊頁）
- `/products/zzz/edit` → `/products`
- `/education` 有出口

`pnpm check` 全過（2239 tests）。

## 五、沒動的東西

- **衛教頁的標題後綴是 `｜UVAlert`**，與全站的 `｜防曬晴報員` 不同。查證後是 `educationSeo.ts` 刻意為 SEO 設的（那些頁面是公開可分享的），不是 bug。
- **`/v1/uv/forecast` 在本機 404** 是預期的（沒跑 `supabase:functions:serve`）。但值得日後確認「API 掛掉」與「尚未設定地區」在畫面上會不會被讀成同一件事。
