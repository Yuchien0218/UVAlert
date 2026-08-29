/**
 * Stylelint — 擋住「scoped <style> 寫死值」這一整類問題重演。
 *
 * 背景：2026-08-25 做了五輪手動收斂（字級／行高／文字色／圓角／間距／
 * z-index／動畫），但沒有工具守著，隔天又會長回來。見
 * docs/superpowers/plans/2026-08-26-codebase-consolidation-audit.md 的 Task A1。
 *
 * 核心規則（scale-unlimited/declaration-strict-value）：
 * - 顏色類屬性、border-radius、z-index、transition/animation-duration
 *   只准用 var(--*)（或極少數字面值如 0、50%、auto）。
 * - 跑第一次時這些全過——2026-08-25 的收斂已經把它們清乾淨了，這個
 *   規則的作用是「別再長回來」。
 *
 * csstools/value-no-unknown-custom-properties：抓引用了不存在的 --* 變數
 * （2026-08-25 的 --motion-base 幽靈 token 就是這種）。
 *
 * DESIGN.md 是設計 token 的唯一權威；沒有對應 token 就是它的缺口，
 * 提出來、不要就地硬寫。
 */

const TOKEN_SOURCES = [
  "packages/ui/src/styles.css",
  "apps/web/src/assets/app.css"
];

/** 任何屬性都接受的「不是寫死值」寫法。 */
const ALWAYS_OK = [
  "/^var\\(--/",
  "/^color-mix\\(/",
  "currentColor",
  "transparent",
  "inherit",
  "unset",
  "initial",
  "none"
];

export default {
  extends: ["stylelint-config-standard"],
  plugins: [
    "stylelint-declaration-strict-value",
    "stylelint-value-no-unknown-custom-properties"
  ],
  ignoreFiles: [
    "**/dist/**",
    "**/coverage/**",
    "**/node_modules/**",
    "apps/web/public/**"
  ],
  overrides: [
    {
      files: ["**/*.vue"],
      customSyntax: "postcss-html"
    }
  ],
  rules: {
    /* --- Vue SFC 容錯 --- */
    "selector-pseudo-class-no-unknown": [
      true,
      { ignorePseudoClasses: ["deep", "slotted", "global"] }
    ],
    "selector-pseudo-element-no-unknown": [
      true,
      { ignorePseudoElements: ["v-deep", "v-slotted", "v-global"] }
    ],
    "no-empty-source": null,

    /* --- 動效 --- */
    /*
     * transition: all 會連帶動到之後新增的任何屬性——加一個 background
     * 就多一個沒人決定過的動畫。一律列出要動的屬性。
     * 2026-08-29 加入，當時只有 FiveDayUvCard 一處違規，已改掉。
     */
    "declaration-property-value-disallowed-list": {
      transition: ["/^all\\b/"],
      "transition-property": ["all"]
    },

    /* --- 這個 repo 的既有慣例，刻意不強制改 --- */
    // kebab-case token 名、BEM-ish class、compact 單行多宣告都是既有風格。
    "custom-property-pattern": null,
    "selector-class-pattern": null,
    "keyframes-name-pattern": null,
    "declaration-block-single-line-max-declarations": null,
    // 這個 repo 一致用經典的 (max-width: …) 而非 (width <= …)。
    "media-feature-range-notation": "prefix",
    // .screen-reader-only 的 clip: rect(0 0 0 0) 是通用的 sr-only hack，
    // 換 clip-path 是獨立的 a11y 決定（清單 F2），不在 A1 範圍。
    "property-no-deprecated": null,
    // 這個 repo 與 DESIGN.md 一律用 6 位 hex（#9f5e42），不用縮寫。
    "color-hex-length": "long",

    /* --- 風格 nitpick，不是 A1 的重點，先關掉避免洗版 --- */
    "no-descending-specificity": null,
    "declaration-block-no-redundant-longhand-properties": null,
    "shorthand-property-no-redundant-values": null,
    "alpha-value-notation": null,
    "color-function-notation": null,
    "hue-degree-notation": null,
    "declaration-empty-line-before": null,
    "comment-empty-line-before": null,
    "rule-empty-line-before": null,
    "custom-property-empty-line-before": null,
    "value-keyword-case": null,
    "number-max-precision": null,

    /* === A1 核心：強制用 token === */

    "scale-unlimited/declaration-strict-value": [
      [
        "/color$/",
        "fill",
        "stroke",
        "background",
        "background-color",
        "z-index",
        "border-radius",
        "/^border(-[a-z]+)?-radius$/",
        "transition-duration",
        "animation-duration"
      ],
      {
        ignoreValues: {
          "": ALWAYS_OK,
          "z-index": ["/^var\\(--/", "-1", "0", "auto"],
          "border-radius": ["/^var\\(--/", "0", "50%"],
          "/^border(-[a-z]+)?-radius$/": ["/^var\\(--/", "0", "50%"],
          "transition-duration": ["/^var\\(--/", "0s", "0.01ms"],
          "animation-duration": ["/^var\\(--/", "0s", "0.01ms"],
          "/^background/": [
            ...ALWAYS_OK,
            "/^linear-gradient\\(/",
            "/^radial-gradient\\(/",
            "/^url\\(/",
            "0 0",
            "center",
            "cover",
            "contain",
            "no-repeat"
          ]
        },
        disableFix: true,
        message:
          '"${property}" 的值 "${value}" 不要寫死，改用 var(--*)。沒有對應 token＝DESIGN.md 的缺口，先提出來（見 codebase-consolidation-audit Task A1）'
      }
    ],

    "csstools/value-no-unknown-custom-properties": [
      true,
      {
        importFrom: [
          ...TOKEN_SOURCES,
          // 由 Vue 模板 :style 綁定、CSS 端看不到的 local custom property。
          // 目前只有掃描延遲一個，BroadcastLoader.vue 與 InlineLoader.vue 共用。
          { "custom-properties": { "--ray-delay": "0s" } }
        ]
      }
    ]
  }
};
