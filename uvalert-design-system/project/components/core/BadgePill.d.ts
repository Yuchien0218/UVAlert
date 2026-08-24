/** Category pill / data-completeness marker. */
export interface BadgePillProps {
  /** "default" cream pill · "unverified" soft pill for 標示尚未確認 */
  variant?: "default" | "unverified";
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}
export declare function BadgePill(props: BadgePillProps): JSX.Element;
