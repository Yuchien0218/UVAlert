/**
 * 說明中心主題註冊表與發布閘門。
 *
 * PRD §13 衛教內容治理與 AC-15／AC-63 要求：缺少有效審查者、審查日期或
 * 再審日期的內容一律阻擋發布。S-15 進一步規定總覽**只列出已通過審查且可發布**
 * 的主題，未核准主題不佔位、不顯示灰階項目——避免使用者以為內容即將出現。
 *
 * 因此閘門做成資料驅動：核准者填入 `reviewedAt`／`nextReviewAt` 並把
 * `reviewStatus` 改為 `APPROVED` 後，主題會自動出現在總覽，不需要改程式。
 */

/** 對應 `P0_COPY_DECK.md` §1 審查狀態表。只有 `APPROVED` 可發布。 */
export type ContentReviewStatus =
  | "PRODUCT_DRAFT"
  | "CONTENT_REVIEW"
  | "MEDICAL_REVIEW"
  | "LEGAL_REVIEW"
  | "MARINE_REVIEW"
  | "MULTI_REVIEW"
  | "APPROVED"
  | "RETIRED"
  | "BLOCKED";

export interface HelpTopic {
  slug: string;
  routeName: string;
  title: string;
  summary: string;
  reviewStatus: ContentReviewStatus;
  /** 核准前保持 null；任一為 null 均阻擋發布（PRD §13.4）。 */
  reviewedAt: string | null;
  nextReviewAt: string | null;
  /** 尚未核准時要向使用者說明的必要審查類別。 */
  requiredReview: string;
}

/**
 * P0 交付的兩則主題。
 *
 * 兩者目前均**未核准**：
 * - `FAQ_BEACH_SUN_V1`（PRD §13.4）的 metadata 明載
 *   `status: draft`、`reviewed_at: null`、`next_review_at: null`。
 * - 運作與倒數說明的 Copy Deck 條目為 `MULTI_REVIEW`／`MEDICAL_REVIEW`。
 *
 * 在核准前，總覽會顯示「目前沒有可查看的內容」，主題頁顯示「內容正在審查」。
 * 這是規格要求的行為，不是未完成的實作。
 */
export const HELP_TOPICS: readonly HelpTopic[] = [
  {
    slug: "beach",
    routeName: "help-beach",
    title: "海邊防曬常見問題",
    summary:
      "查看下水前、離水後、擦拭、耐水標示與純椰子油等說明。閱讀內容不會修改目前提醒。",
    reviewStatus: "MULTI_REVIEW",
    reviewedAt: null,
    nextReviewAt: null,
    requiredReview: "醫療／海洋環境／法務"
  },
  {
    slug: "how-it-works",
    routeName: "help-how-it-works",
    title: "防曬晴報員怎麼運作",
    summary:
      "說明資料來源、逐部位提醒、倒數的意義與通知限制。閱讀不會修改目前的提醒狀態。",
    reviewStatus: "MULTI_REVIEW",
    reviewedAt: null,
    nextReviewAt: null,
    requiredReview: "醫療／內容"
  }
];

/**
 * 是否可發布。
 *
 * 對應 S-15「不可發布狀態」：`reviewed_at=null`、`next_review_at=null`、
 * 任一必要審查未通過，三者任一成立即不可發布。
 */
export function isPublishable(topic: HelpTopic): boolean {
  return (
    topic.reviewStatus === "APPROVED" &&
    topic.reviewedAt !== null &&
    topic.nextReviewAt !== null
  );
}

/** 總覽只列出可發布的主題；不可發布者完全不佔位。 */
export function listPublishableTopics(): HelpTopic[] {
  return HELP_TOPICS.filter(isPublishable);
}

export function findTopic(slug: string): HelpTopic | undefined {
  return HELP_TOPICS.find((topic) => topic.slug === slug);
}

/**
 * S-17 特殊狀況的發布閘門。
 *
 * `P0_COPY_DECK.md` §15：CP-SPECIAL-004（破損／起泡／嚴重曬傷）與
 * CP-SPECIAL-005（急症紅旗）任一仍為 `BLOCKED` 時，整條特殊狀況流程
 * 不得公開。兩則目前皆為 `BLOCKED`。
 *
 * 與 help 主題同樣做成資料驅動：核准後改成 `APPROVED`，
 * 「更多」頁的入口會自動回來，不必改程式。
 */
export const SPECIAL_SITUATION_REVIEW_STATUS: ContentReviewStatus =
  "BLOCKED";

export function isSpecialSituationPublishable(): boolean {
  return SPECIAL_SITUATION_REVIEW_STATUS === "APPROVED";
}
