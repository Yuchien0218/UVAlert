/** UV five-level risk pill. The one saturated colour moment above the fold. */
export interface UviBadgeProps {
  /** 0–2 low · 3–5 moderate · 6–7 high · 8–10 very-high · 11+ extreme */
  level?: "low" | "moderate" | "high" | "very-high" | "extreme";
  /** The UV index number — always show it; colour alone must not carry the level. */
  value?: number | string;
  style?: React.CSSProperties;
}
export declare function UviBadge(props: UviBadgeProps): JSX.Element;
