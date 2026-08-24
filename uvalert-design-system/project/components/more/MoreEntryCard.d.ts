/** Uniform entry card for the 更多 page. Desktop 2 columns, mobile 1. */
export interface MoreEntryCardProps {
  /** more-notifications · more-education · more-data · more-feedback · more-install · more-about */
  icon?: string;
  title: string;
  /** Short state line — only 通知設定 normally has one. */
  status?: string;
  iconBase?: string;
  as?: "button" | "a" | "div";
  onClick?: (event: React.MouseEvent) => void;
  style?: React.CSSProperties;
}
export declare function MoreEntryCard(props: MoreEntryCardProps): JSX.Element;
