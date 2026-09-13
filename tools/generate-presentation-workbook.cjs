const fs = require("fs");
const path = require("path");
const {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  PageBreak,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  Packer,
} = require("docx");

const outputPath = path.resolve(__dirname, "../docs/防曬晴報員_PPT逐頁製作稿.docx");

const C = {
  canvas: "FAF5EC",
  soft: "F7EDE1",
  card: "F0E2D1",
  cream: "EFD0BC",
  ink: "2E2925",
  body: "5A4540",
  muted: "6F5A54",
  primary: "9F5E42",
  mauve: "8C6F7A",
  amber: "C1832E",
  white: "FFF8F0",
  line: "E7D8CF",
};

const slides = [
  {
    id: "P.1",
    title: "防曬晴報員是什麼？",
    time: "25 秒",
    purpose: "第一次接觸專案的人，在 10 秒內知道產品做什麼。",
    layout: "左側放產品名稱與一句話定位；右側放首頁手機畫面。",
    text: [
      "防曬晴報員 UVAlert",
      "不只提醒出門前防曬，也幫你記得適時補擦",
      "UV 預報・補擦提醒・狀況紀錄・防曬衛教",
    ],
    assets: ["Logo SVG", "首頁手機版截圖，裁掉瀏覽器工具列"],
    notes: "大家好，今天要介紹的是《防曬晴報員》。它不是一個只告訴你天氣的 App，而是從一個很日常的問題出發：我們常記得出門前擦防曬，卻在洗手、流汗或過了一段時間後，忘了重新檢查與補擦。這個專案把 UV 資訊、提醒與日常紀錄整合在一起。",
  },
  {
    id: "P.2",
    title: "有防曬意識，卻容易忘記",
    time: "40 秒",
    purpose: "先建立生活情境，讓老師與同學理解問題。",
    layout: "左側放簡單人物情境；右側用三行呈現問題，不做虛構研究圖表。",
    text: [
      "早上有擦，中途卻忘了流汗、洗手與時間經過",
      "普通鬧鐘不知道哪些部位受到影響",
      "複雜建檔可能增加開始使用的負擔",
    ],
    assets: ["學生或上班族的一日情境示意", "洗手、流汗、時鐘三個線性圖示"],
    notes: "這個產品設想的情境，是一位有防曬意識的上班族或學生。他早上會擦防曬，但忙起來後，可能忘記已經過了多久，也可能忽略洗手、流汗或擦拭造成的影響。普通鬧鐘只會在固定時間響，不知道是哪個部位需要重新檢查。因此，這個專案把「何時提醒」與「發生了什麼事」放在同一個流程裡。這是產品目標情境，不宣稱已完成正式使用者訪談或可用性研究。",
  },
  {
    id: "P.3",
    title: "讓提醒更貼近真實生活",
    time: "40 秒",
    purpose: "用三個具體機制回答上一頁的三個問題。",
    layout: "三欄卡片：20 分鐘預警／120 分鐘一般基準／部位獨立計時。",
    text: [
      "20 分鐘前｜進入「快到補擦時間」狀態",
      "120 分鐘｜未輸入產品標示時的一般提醒基準",
      "分部位｜狀況發生後，只更新受影響的部位",
    ],
    assets: ["倒數狀態截圖", "部位選擇與洗手後狀態截圖"],
    notes: "我把解法收斂成三點。第一，距離到期二十分鐘時，系統會進入準備補擦的提示狀態。第二，如果沒有輸入防曬產品的時間標示，系統以一百二十分鐘作為一般檢查與補擦提醒基準；它不是安全曝曬時間，也不代表每款產品都能維持兩小時。第三，不同部位會分開紀錄，洗手時可以只更新手部。",
  },
  {
    id: "P.4",
    title: "溫暖，但不製造假性安全感",
    time: "35 秒",
    purpose: "呈現品牌辨識與設計判斷，而不只是展示好看的畫面。",
    layout: "左側放 5 色品牌色票；右側放介面局部截圖與兩條設計原則。",
    text: [
      "暖象牙背景＋深咖啡文字＋深杏桃主要行動",
      "襯線標題＋易讀黑體，建立編輯式閱讀層級",
      "不使用綠色表示「完全安全」",
    ],
    assets: ["五色色票", "主要按鈕、標題與已記錄狀態的介面裁切"],
    notes: "視覺上，我希望它溫暖、輕鬆，但不能讓人誤以為按下完成就等於完全安全。因此介面使用暖象牙背景、深咖啡文字與深杏桃按鈕，並以不同字體建立閱讀層級。我們也刻意不把綠色當成防曬完成狀態，因為提醒已記錄，不等於能保證防曬效果。",
  },
  {
    id: "P.5",
    title: "UV 資訊與定位隱私",
    time: "35 秒",
    purpose: "解釋氣象資訊來源，以及定位資料如何被克制地使用。",
    layout: "左側放臺灣 UV 地圖；右側用三步驟小流程呈現資料流。",
    text: [
      "中央氣象署 UV 資料｜全臺縣市分布與預報",
      "瀏覽器端｜用官方行政區邊界辨識所在地區",
      "儲存｜行政區代碼與名稱，不保存精確經緯度",
    ],
    assets: ["全臺 UV 地圖截圖", "定位設定截圖", "裝置→行政區→UV API 流程箭頭"],
    notes: "後端代為取得中央氣象署資料，前端再顯示全臺縣市分布與當地預報。使用者主動同意定位後，網頁會在瀏覽器端對照官方行政區邊界。系統儲存行政區代碼與名稱，不把精確經緯度存入本機資料庫，也不需要把座標傳給 UV 預報 API。",
  },
  {
    id: "P.6",
    title: "需要時提醒，不需要時安靜",
    time: "40 秒",
    purpose: "用日夜狀態切換呈現生活化、包含例外情境的 UX 思考。",
    layout: "左右對照：白天首頁／夜間收工畫面；中央用日落或時間箭頭連接。",
    text: [
      "白天｜突出 UV 預報與補擦提醒",
      "夜間｜收起無行動價值的倒數，顯示提醒已進行多久",
      "跨日｜「明早」自動調整為「今早」",
      "例外｜仍可選擇開始提醒，不強制限制使用者",
    ],
    assets: ["白天首頁截圖", "夜間有提醒／無提醒狀態截圖"],
    notes: "一般提醒工具通常只按照固定時間運作，但防曬資訊會隨日夜改變。夜間會收起沒有行動價值的補擦倒數；提醒仍在進行時，改為顯示已進行多久。沒有進行中提醒時，系統提示明早再開始，跨過午夜則調整為今早。同時保留開始提醒入口，照顧夜班、跨時區或裝置時間不準等例外。",
  },
  {
    id: "P.7",
    title: "先建立可審查的發布流程",
    time: "40 秒",
    purpose: "展示內容設計、資訊架構與負責任的發布機制。",
    layout: "左側放六主題／48 草稿數字；右側放文章結構與建置輸出流程。",
    text: [
      "48 篇待專業審閱的衛教草稿，分為 6 個主題",
      "先回答核心問題，再補充條件、限制與來源",
      "靜態 HTML・Article 結構化資料・Sitemap",
    ],
    assets: ["衛教首頁或文章頁截圖", "草稿→審閱→發布簡化流程"],
    notes: "專案規劃六個主題、四十八篇衛教草稿。文章先回答核心問題，再補充使用條件、內容限制與資料來源。建置時可產生靜態 HTML、結構化資料與網站地圖，讓搜尋引擎更容易理解內容；這些是搜尋友善的技術準備，不代表一定獲得排名、精選摘要或被 AI 正確引用。",
  },
  {
    id: "P.8",
    title: "提醒不是醫療判斷",
    time: "40 秒",
    purpose: "清楚說明產品能力範圍與健康資訊發布門檻。",
    layout: "使用三層邊界圖：提醒工具／不提供的能力／內容發布閘門。",
    text: [
      "補擦倒數 ≠ 安全曝曬時間或效果保證",
      "不提供疾病診斷或個人化醫療建議",
      "48 篇草稿均需專業審閱；未通過前不進入 Sitemap",
    ],
    assets: ["產品邊界示意圖", "草稿與審閱狀態畫面"],
    notes: "因為主題涉及皮膚健康，產品邊界必須說清楚。倒數只是幫助記得檢查與補擦，不是安全曝曬時間，也不保證防曬效果。系統不提供疾病診斷或個人化醫療建議。四十八篇文章目前都是草稿並標記需要專業審閱；未通過發布條件時使用 noindex，也不加入 Sitemap。",
  },
  {
    id: "P.9",
    title: "本機優先，也提供多種提醒方式",
    time: "35 秒",
    purpose: "用熟悉的使用情境說明本機核心、瀏覽器通知與 LINE 提醒的分工。",
    layout: "左側放 LINE 通知設定截圖；右側分成核心功能、選用提醒與網路服務三層。",
    text: [
      "本機核心｜不登入也能使用倒數與紀錄",
      "瀏覽器通知｜分頁關閉後，仍有機會收到補擦提醒",
      "LINE 補擦提醒｜主動綁定，可測試通知，也能隨時解除",
      "遠端提醒需要網路；實際送達仍受裝置、平台與網路狀態影響",
    ],
    assets: ["LINE 補擦提醒設定畫面", "已連結狀態或實際收到訊息的截圖", "本機核心→選用提醒→網路服務三層圖"],
    notes: "系統仍採用本機優先的設計，不登入也能使用核心倒數與紀錄。除了瀏覽器通知，使用者也可以主動綁定「防曬晴報員」LINE 官方帳號，在補擦時間到時透過熟悉的 LINE 接收訊息。設定頁提供綁定、測試通知與解除綁定，讓使用者自行選擇提醒管道；即使不使用 LINE，也不影響原本的核心功能。這些遠端提醒需要網路，實際送達仍會受到裝置、平台與網路狀態影響。",
  },
  {
    id: "P.10",
    title: "從設計判斷到可運作產品",
    time: "35 秒",
    purpose: "以可驗證成果收束，回到產品最初要解決的行為問題。",
    layout: "左側放 24 MB→649 KB 大數字；右側放三層成果與結尾句。",
    text: [
      "Noto Serif TC：約 24 MB → 649 KB，剩約 2.7%",
      "設計系統・本機資料・後端 API・內容發布流程",
      "把「記得防曬」轉化為可持續的日常行動",
    ],
    assets: ["字型瘦身數字視覺", "產品關鍵畫面拼貼，最多三張"],
    notes: "這個專案不只是完成幾個畫面，也處理了效能與工程細節。例如將原始約二十四 MB 的 Noto Serif TC，依專案需要的字元裁切為約六百四十九 KB，剩約 2.7%。整體實作涵蓋設計系統、事件紀錄、本機資料庫、後端 API 與內容發布流程。希望解決的不只是知道要防曬，而是出門後也能輕鬆記得適時補擦。謝謝大家。",
  },
];

function textParagraph(text, options = {}) {
  return new Paragraph({
    spacing: { after: options.after ?? 120, line: 300 },
    alignment: options.alignment,
    children: [new TextRun({
      text,
      bold: options.bold,
      color: options.color || C.body,
      size: options.size || 22,
      font: options.font || "Noto Sans TC",
    })],
  });
}

function bullet(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 90, line: 290 },
    children: [new TextRun({ text, color: C.body, size: 21, font: "Noto Sans TC" })],
  });
}

function sectionLabel(text) {
  return new Paragraph({
    spacing: { before: 150, after: 80 },
    children: [new TextRun({ text, bold: true, color: C.primary, size: 22, font: "Noto Sans TC" })],
  });
}

function infoTable(slide) {
  const widths = [1650, 7600];
  const row = (label, value, fill = C.soft) => new TableRow({ children: [
    new TableCell({ width: { size: widths[0], type: WidthType.DXA }, shading: { fill: C.card, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 120, right: 120 }, children: [textParagraph(label, { bold: true, color: C.ink, after: 0 })] }),
    new TableCell({ width: { size: widths[1], type: WidthType.DXA }, shading: { fill, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 140, right: 140 }, children: [textParagraph(value, { after: 0 })] }),
  ] });
  return new Table({
    width: { size: 9250, type: WidthType.DXA },
    columnWidths: widths,
    borders: { top: { style: BorderStyle.SINGLE, color: C.line, size: 2 }, bottom: { style: BorderStyle.SINGLE, color: C.line, size: 2 }, left: { style: BorderStyle.SINGLE, color: C.line, size: 2 }, right: { style: BorderStyle.SINGLE, color: C.line, size: 2 }, insideHorizontal: { style: BorderStyle.SINGLE, color: C.line, size: 2 }, insideVertical: { style: BorderStyle.SINGLE, color: C.line, size: 2 } },
    rows: [row("時間", slide.time), row("本頁目的", slide.purpose), row("版面配置", slide.layout)],
  });
}

function paletteTable() {
  const items = [
    ["暖象牙", "#FAF5EC", "全頁背景", C.canvas],
    ["淺暖奶油", "#F7EDE1", "區塊背景", C.soft],
    ["杏桃奶油", "#F0E2D1", "卡片背景", C.card],
    ["深咖啡", "#2E2925", "標題與主要文字", C.ink],
    ["深杏桃", "#9F5E42", "主要視覺焦點", C.primary],
    ["藕紫", "#8C6F7A", "已記錄／安心狀態", C.mauve],
    ["琥珀金", "#C1832E", "Logo 與少量細節", C.amber],
  ];
  const widths = [1900, 1600, 3850, 1900];
  const header = new TableRow({ children: ["色名", "色碼", "用途", "色塊"].map((v, i) => new TableCell({ width: { size: widths[i], type: WidthType.DXA }, shading: { fill: C.ink, type: ShadingType.CLEAR }, children: [textParagraph(v, { bold: true, color: C.white, after: 0 })] })) });
  const rows = items.map(([name, hex, use, fill]) => new TableRow({ children: [
    new TableCell({ width: { size: widths[0], type: WidthType.DXA }, children: [textParagraph(name, { after: 0 })] }),
    new TableCell({ width: { size: widths[1], type: WidthType.DXA }, children: [textParagraph(hex, { after: 0 })] }),
    new TableCell({ width: { size: widths[2], type: WidthType.DXA }, children: [textParagraph(use, { after: 0 })] }),
    new TableCell({ width: { size: widths[3], type: WidthType.DXA }, shading: { fill, type: ShadingType.CLEAR }, children: [textParagraph(fill === C.ink || fill === C.primary || fill === C.mauve || fill === C.amber ? "Aa" : "", { color: C.white, bold: true, alignment: AlignmentType.CENTER, after: 0 })] }),
  ] }));
  return new Table({ width: { size: 9250, type: WidthType.DXA }, columnWidths: widths, rows: [header, ...rows] });
}

const children = [
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 700, after: 220 }, children: [new TextRun({ text: "防曬晴報員 UVAlert", bold: true, color: C.ink, size: 42, font: "Noto Serif TC" })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [new TextRun({ text: "PPT 逐頁製作稿｜7～8 分鐘課堂報告", color: C.primary, size: 28, font: "Noto Sans TC" })] }),
  textParagraph("用途：這份 Word 是製作投影片前的工作底稿。請把「投影片文字」放進 PPT，把「講稿」留在備忘稿，不要整段貼到畫面上。", { alignment: AlignmentType.CENTER, color: C.muted, after: 500 }),
  new Paragraph({ children: [new PageBreak()] }),
  new Paragraph({ text: "共通製作規則", heading: HeadingLevel.HEADING_1 }),
  ...[
    "16:9 橫式；暖象牙底，不使用白色或漸層作為全頁背景。",
    "每頁只說一件事；畫面文字盡量控制在 3～4 點。",
    "標題建議 28～34 pt，內文 18～24 pt，來源與註解不低於 14 pt。",
    "標題使用 Noto Serif TC／思源宋體；內文使用 Noto Sans TC／思源黑體。",
    "深杏桃每頁只負責一個主要焦點；不以綠色表示安全或防護有效。",
    "截圖保留原始介面色彩，裁掉無關瀏覽器區域，不套濾鏡。",
    "Demo 前後都停留在可預期畫面，另備一組截圖處理網路或定位失敗。",
  ].map(bullet),
  new Paragraph({ text: "品牌色票", heading: HeadingLevel.HEADING_2 }),
  paletteTable(),
  sectionLabel("建議配色比例"),
  textParagraph("60% 暖象牙／20% 奶油表面／12% 深咖啡／6% 深杏桃／2% 狀態與細節色。"),
  sectionLabel("簡報節奏"),
  textParagraph("P.1–P.2 問題與情境 → P.3–P.6 設計解法 → Demo 實際操作 → P.7–P.9 內容邊界與架構 → P.10 成果收束。"),
];

for (const [index, slide] of slides.entries()) {
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(new Paragraph({ spacing: { after: 80 }, children: [
    new TextRun({ text: `${slide.id}  `, bold: true, color: C.primary, size: 24, font: "Noto Sans TC" }),
    new TextRun({ text: slide.title, bold: true, color: C.ink, size: 34, font: "Noto Serif TC" }),
  ] }));
  children.push(textParagraph(`第 ${index + 1}／10 張`, { color: C.muted }));
  children.push(infoTable(slide));
  children.push(sectionLabel("投影片畫面文字｜直接貼到 PPT"));
  children.push(...slide.text.map(bullet));
  children.push(sectionLabel("需要準備的素材"));
  children.push(...slide.assets.map(bullet));
  children.push(sectionLabel("口頭講稿｜放在 PowerPoint 備忘稿"));
  children.push(new Table({ width: { size: 9250, type: WidthType.DXA }, columnWidths: [9250], rows: [new TableRow({ children: [new TableCell({ width: { size: 9250, type: WidthType.DXA }, shading: { fill: C.soft, type: ShadingType.CLEAR }, margins: { top: 160, bottom: 160, left: 180, right: 180 }, children: [textParagraph(slide.notes, { after: 0 })] })] })] }));
  children.push(sectionLabel("完成前自查"));
  children.push(textParagraph("□ 一眼看得出本頁重點　□ 字級投影可讀　□ 截圖與文字對得上　□ 沒有新增未驗證數據　□ 試講未超時", { color: C.muted }));
}

children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(new Paragraph({ text: "Demo 實機操作腳本", heading: HeadingLevel.HEADING_1 }));
children.push(textParagraph("總長 1 分 50 秒。建議 PPT 只放「接下來進行實機操作」與四步驟導覽，操作細節看這一頁。"));
const demoRows = [
  ["1｜25 秒", "開啟地區設定，使用目前位置", "定位後，網頁在瀏覽器裡判斷行政區；保留的是地區資料，不是精確座標。"],
  ["2｜25 秒", "選擇部位並開始提醒", "選擇臉與手臂。送出後，不同部位會有各自的提醒狀態。"],
  ["3｜30 秒", "記錄洗手，選擇手部後送出", "只有選取的手部變成到期，並出現接著記錄補擦的入口。"],
  ["4｜30 秒", "第二分頁記錄補擦，再切回第一分頁", "另一分頁完成記錄後，第一分頁收到通知並重新讀取狀態；核心倒數不需登入。"],
];
const demoWidths = [1400, 2800, 5050];
children.push(new Table({ width: { size: 9250, type: WidthType.DXA }, columnWidths: demoWidths, rows: [
  new TableRow({ children: ["時間", "操作", "口播"].map((v, i) => new TableCell({ width: { size: demoWidths[i], type: WidthType.DXA }, shading: { fill: C.ink, type: ShadingType.CLEAR }, children: [textParagraph(v, { bold: true, color: C.white, after: 0 })] })) }),
  ...demoRows.map(row => new TableRow({ children: row.map((v, i) => new TableCell({ width: { size: demoWidths[i], type: WidthType.DXA }, shading: { fill: i === 0 ? C.card : C.soft, type: ShadingType.CLEAR }, children: [textParagraph(v, { after: 0 })] })) })),
] }));
children.push(sectionLabel("現場備援"));
children.push(...[
  "預先開好兩個同網站分頁，並確認兩頁都有可用的提醒資料。",
  "準備定位成功、洗手後到期、跨分頁更新三張截圖。",
  "不要為了示範離線而關閉整台電腦網路；若要展示，使用事先錄製片段。",
].map(bullet));

children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(new Paragraph({ text: "問答備用與說法邊界", heading: HeadingLevel.HEADING_1 }));
const qa = [
  ["這是醫療軟體嗎？", "定位為日常自我照護的輔助提醒，不提供診斷、治療建議或安全曝曬時間。法律分類仍須依最終用途、功能、宣稱與主管機關規定判斷。"],
  ["沒有網路還能用嗎？", "頁面已載入後，本機提醒與紀錄以 IndexedDB 為主；新的 UV 資料、雲端同步和遠端推播仍需要網路。"],
  ["定位為什麼不需要傳給後端？", "瀏覽器端用官方行政區邊界判斷地區；儲存行政區代碼與名稱，UV API 也只需要地區代碼。"],
  ["文章為什麼沒有全部發布？", "48 篇內容目前均為待專業審閱草稿。發布門檻避免未審查健康內容被誤認為已確認建議。"],
];
for (const [q, a] of qa) {
  children.push(sectionLabel(q));
  children.push(textParagraph(a));
}
children.push(sectionLabel("禁止使用的說法"));
children.push(...[
  "不要說「醫學上最安全的 120 分鐘」；改說「一般檢查與補擦提醒基準」。",
  "不要說「保證不上傳任何位置資訊」；改說「精確座標不儲存，也不傳給 UV API」。",
  "不要說「48 篇專業衛教文章」；改說「48 篇待專業審閱的衛教草稿」。",
  "不要保證 SEO 排名、AI 引用或不產生幻覺。",
  "不要說「完全不是醫療器材」或「完全遵守所有隱私法規」。",
].map(bullet));

const doc = new Document({
  background: { color: C.canvas },
  numbering: { config: [{ reference: "bullets", levels: [{ level: 0, format: "bullet", text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 420, hanging: 240 } } } }] }] },
  styles: {
    default: { document: { run: { font: "Noto Sans TC", size: 22, color: C.body }, paragraph: { spacing: { line: 300 } } } },
    paragraphStyles: [
      { id: "Title", name: "Title", basedOn: "Normal", run: { font: "Noto Serif TC", size: 42, bold: true, color: C.ink } },
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: "Noto Serif TC", size: 34, bold: true, color: C.ink }, paragraph: { spacing: { before: 260, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: "Noto Serif TC", size: 28, bold: true, color: C.primary }, paragraph: { spacing: { before: 220, after: 120 }, outlineLevel: 1 } },
    ],
  },
  sections: [{
    properties: { page: { margin: { top: 900, right: 900, bottom: 850, left: 900 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "防曬晴報員 UVAlert｜PPT 製作稿　", color: C.muted, size: 18 }), new TextRun({ children: [PageNumber.CURRENT], color: C.muted, size: 18 })] })] }) },
    children,
  }],
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outputPath, buffer);
  process.stdout.write(`${outputPath}\n`);
});
