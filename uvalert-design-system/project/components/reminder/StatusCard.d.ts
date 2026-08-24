/** Status-tinted card. Five variants of identical visual weight. */
export interface StatusCardProps {
  /** "saved" uses mauve — green must never imply safe or protected. */
  tone?: "tracking" | "soon" | "due" | "untimed" | "saved";
  /** Chinese status label; the mono state icon is added automatically. */
  label: string;
  children?: React.ReactNode;
  iconBase?: string;
  style?: React.CSSProperties;
}
export declare function StatusCard(props: StatusCardProps): JSX.Element;
