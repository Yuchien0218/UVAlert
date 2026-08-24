/** One item in the 裝備 list. Cream card, fully tappable. */
export interface GearListItemProps {
  /** Icon name: gear-sunscreen · gear-hat · gear-clothing · gear-sunglasses · gear-umbrella · gear-other */
  category?: string;
  name: string;
  /** Short summary line, e.g. "SPF 50 · 一般補擦 120 分鐘". */
  summary?: string;
  /** Optional BadgePill, e.g. variant="unverified". */
  badge?: React.ReactNode;
  iconBase?: string;
  as?: "button" | "a" | "div";
  onClick?: (event: React.MouseEvent) => void;
  style?: React.CSSProperties;
}
export declare function GearListItem(props: GearListItemProps): JSX.Element;
